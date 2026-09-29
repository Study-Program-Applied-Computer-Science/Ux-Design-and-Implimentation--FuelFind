import { Router } from 'express'
import ApiLimit from '../models/ApiLimit.js'

const router = Router()

const HEIDELBERG = {
  lat: 49.3988,
  lng: 8.6724,
}

// A small buffer beyond the provider's one-minute limit.
const REQUEST_INTERVAL_MS = 61_000

// GET /api/stations?fuel=e10&radius=5
router.get('/', async (req, res, next) => {
  try {
    const fuel = req.query.fuel ?? 'e10'
    const radiusInput = req.query.radius ?? '5'

    // Validate before using the API allowance.
    if (
      typeof fuel !== 'string' ||
      !['e5', 'e10', 'diesel'].includes(fuel)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Fuel must be e5, e10 or diesel.',
      })
    }

    if (
      typeof radiusInput !== 'string' ||
      !['2', '5', '10'].includes(radiusInput)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Radius must be 2, 5 or 10 kilometres.',
      })
    }

    const radius = Number(radiusInput)
    const apiKey = process.env.TANKERKOENIG_API_KEY?.trim()

    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: 'Fuel-price access is not configured.',
      })
    }

    const now = new Date()
    const nextAllowedAt = new Date(
      now.getTime() + REQUEST_INTERVAL_MS,
    )

    // Atomically reserve the next request.
    // Only one caller can succeed during this interval.
    const reservation = await ApiLimit.findOneAndUpdate(
      {
        _id: 'tankerkoenig',
        nextAllowedAt: { $lte: now },
      },
      {
        $set: { nextAllowedAt },
      },
      {
        new: true,
      },
    )

    if (!reservation) {
      const limit = await ApiLimit.findById('tankerkoenig')

      if (!limit) {
        return res.status(503).json({
          success: false,
          message: 'Fuel-search request control is unavailable.',
        })
      }

      const retryAfterSeconds = Math.max(
        1,
        Math.ceil(
          (limit.nextAllowedAt.getTime() - Date.now()) / 1000,
        ),
      )

      res.set('Retry-After', String(retryAfterSeconds))

      return res.status(429).json({
        success: false,
        message: `Please wait ${retryAfterSeconds} seconds before another search.`,
        retryAfterSeconds,
      })
    }

    const url = new URL(
      'https://creativecommons.tankerkoenig.de/json/list.php',
    )

    url.search = new URLSearchParams({
      lat: String(HEIDELBERG.lat),
      lng: String(HEIDELBERG.lng),
      rad: String(radius),
      type: fuel,
      sort: 'price',
      apikey: apiKey,
    }).toString()

    let data

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(12_000),
      })

      if (!response.ok) {
        throw new Error('Provider request failed')
      }

      data = await response.json()

      if (data.ok !== true || !Array.isArray(data.stations)) {
        throw new Error('Provider returned an unsuccessful response')
      }
    } catch {
      // Do not expose the request URL, API key or provider internals.
      return res.status(502).json({
        success: false,
        message:
          'Fuel data could not be retrieved. Check the server API-key configuration and try again after one minute.',
      })
    }

    const stations = data.stations.map((station) => ({
      id: station.id,
      name: station.name,
      brand: station.brand || '',
      street: station.street,
      houseNumber: station.houseNumber || '',
      postCode: station.postCode,
      place: station.place,
      lat: station.lat,
      lng: station.lng,
      distanceKm: station.dist,

      // Missing prices must not appear as zero-cost fuel.
      price:
        typeof station.price === 'number' &&
        Number.isFinite(station.price) &&
        station.price > 0
          ? station.price
          : null,

      isOpen:
        typeof station.isOpen === 'boolean'
          ? station.isOpen
          : null,
    }))

    return res.json({
      success: true,
      location: {
        name: 'Heidelberg',
        ...HEIDELBERG,
      },
      fuel,
      radiusKm: radius,
      count: stations.length,
      retrievedAt: new Date().toISOString(),
      nextRequestAt: nextAllowedAt.toISOString(),
      source: 'Tankerkönig / MTS-K',
      license: data.license ?? null,
      stations,
    })
  } catch (error) {
    next(error)
  }
})

export default router