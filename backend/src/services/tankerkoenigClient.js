import ApiLimit from '../models/ApiLimit.js'

const REQUEST_INTERVAL_MS = 61_000

const ALLOWED_ENDPOINTS = new Set([
  'list.php',
  'prices.php',
  'detail.php',
])

const STATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  )
}

// Missing or unavailable prices are allowed.
// The routes convert unavailable prices to null for display.
function validPrice(value) {
  return (
    value === undefined ||
    value === null ||
    value === false ||
    (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0 &&
      Number.isSafeInteger(Math.round(value * 1000))
    )
  )
}

function validStation(station) {
  return (
    isObject(station) &&
    typeof station.id === 'string' &&
    STATION_ID_PATTERN.test(station.id) &&

    ['name', 'street', 'place'].every(
      (key) => typeof station[key] === 'string',
    ) &&

    ['brand', 'houseNumber'].every(
      (key) =>
        station[key] === undefined ||
        station[key] === null ||
        typeof station[key] === 'string',
    ) &&

    (
      station.postCode === undefined ||
      station.postCode === null ||
      typeof station.postCode === 'string' ||
      (
        Number.isInteger(station.postCode) &&
        station.postCode >= 0
      )
    ) &&

    Number.isFinite(station.lat) &&
    Math.abs(station.lat) <= 90 &&
    Number.isFinite(station.lng) &&
    Math.abs(station.lng) <= 180 &&

    (
      station.isOpen === undefined ||
      station.isOpen === null ||
      typeof station.isOpen === 'boolean'
    )
  )
}

function validProviderResponse(endpoint, data, parameters) {
  if (!isObject(data) || data.ok !== true) {
    return false
  }

  if (endpoint === 'list.php') {
    return (
      Array.isArray(data.stations) &&
      data.stations.every(
        (station) =>
          validStation(station) &&
          Number.isFinite(station.dist) &&
          station.dist >= 0 &&
          validPrice(station.price) &&
          ['e5', 'e10', 'diesel'].every(
            (fuel) => validPrice(station[fuel]),
          ),
      )
    )
  }

  if (endpoint === 'prices.php') {
    if (!isObject(data.prices)) {
      return false
    }

    const entriesValid = Object.entries(data.prices).every(
      ([id, quote]) =>
        STATION_ID_PATTERN.test(id) &&
        isObject(quote) &&
        ['open', 'closed', 'no prices'].includes(quote.status) &&
        ['e5', 'e10', 'diesel'].every(
          (fuel) => validPrice(quote[fuel]),
        ),
    )

    // Do not treat an incomplete response as a completed check.
    const requestedIds = String(parameters.ids ?? '').split(',')

    return (
      entriesValid &&
      requestedIds.every(
        (id) =>
          STATION_ID_PATTERN.test(id) &&
          Object.hasOwn(data.prices, id),
      )
    )
  }

  return (
    endpoint === 'detail.php' &&
    validStation(data.station) &&
    ['e5', 'e10', 'diesel'].every(
      (fuel) => validPrice(data.station[fuel]),
    )
  )
}

export class FuelProviderError extends Error {
  constructor(status, message, retryAfterSeconds = null) {
    super(message)
    this.name = 'FuelProviderError'
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export async function requestFuelProvider(endpoint, parameters) {
  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    throw new Error('Unsupported fuel-provider endpoint')
  }

  const apiKey = process.env.TANKERKOENIG_API_KEY?.trim()

  if (!apiKey) {
    throw new FuelProviderError(
      503,
      'Fuel-price access is not configured.',
    )
  }

  const now = new Date()
  const nextAllowedAt = new Date(
    now.getTime() + REQUEST_INTERVAL_MS,
  )

  // Searches and background jobs reserve the same allowance.
  const reservation = await ApiLimit.findOneAndUpdate(
    {
      _id: 'tankerkoenig',
      nextAllowedAt: { $lte: now },
    },
    {
      $set: { nextAllowedAt },
    },
    {
            returnDocument: 'after',
    },
  )

  if (!reservation) {
    const limit = await ApiLimit.findById('tankerkoenig')

    if (!limit) {
      throw new FuelProviderError(
        503,
        'Fuel-search request control is unavailable.',
      )
    }

    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(
        (limit.nextAllowedAt.getTime() - Date.now()) / 1000,
      ),
    )

    throw new FuelProviderError(
      429,
      `Please wait ${retryAfterSeconds} seconds before another search.`,
      retryAfterSeconds,
    )
  }

  const url = new URL(
    `https://creativecommons.tankerkoenig.de/json/${endpoint}`,
  )

  url.search = new URLSearchParams({
    ...parameters,
    apikey: apiKey,
  }).toString()

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
    })

    if (!response.ok) {
      throw new Error('Provider request failed')
    }

    const data = await response.json()

    if (!validProviderResponse(endpoint, data, parameters)) {
      throw new Error('Provider returned an invalid response')
    }

    return {
      data,
      retrievedAt: new Date(),
      nextAllowedAt,
    }
  } catch {
    // Keep the reservation after failures.
    // Never expose the API key or upstream request URL.
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((nextAllowedAt.getTime() - Date.now()) / 1000),
    )

    throw new FuelProviderError(
      502,
      'Fuel data is temporarily unavailable. Please try again after the waiting period.',
      retryAfterSeconds,
    )
  }
}