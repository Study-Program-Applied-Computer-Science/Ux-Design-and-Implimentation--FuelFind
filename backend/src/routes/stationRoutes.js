import { Router } from 'express'

import Station from '../models/Station.js'
import savePriceObservations from '../services/savePriceObservations.js'
import {
  FuelProviderError,
  requestFuelProvider,
} from '../services/tankerkoenigClient.js'

const router = Router()

const STATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const HEIDELBERG = {
  lat: 49.3988,
  lng: 8.6724,
}

// Approximate service area used only to validate user-supplied
// search coordinates. The verified station catalogue provides
// the official Heidelberg station filtering.
const SUPPORTED_AREA_KM = 10

function cleanProviderText(value) {
  if (typeof value !== 'string') {
    return ''
  }

  return value
    .trim()
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function normalizePrice(value) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  )
    ? value
    : null
}

// Approximate straight-line distance between two coordinates.
function distanceKmBetween(first, second) {
  const toRadians = (degrees) =>
    (degrees * Math.PI) / 180

  const earthRadiusKm = 6371

  const latitudeDifference = toRadians(
    second.lat - first.lat,
  )

  const longitudeDifference = toRadians(
    second.lng - first.lng,
  )

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(first.lat)) *
      Math.cos(toRadians(second.lat)) *
      Math.sin(longitudeDifference / 2) ** 2

  return (
    2 *
    earthRadiusKm *
    Math.asin(
      Math.sqrt(
        Math.min(1, Math.max(0, a)),
      ),
    )
  )
}

// Accept ordinary decimal coordinates, including negative values.
function parseCoordinate(value, minimum, maximum) {
  if (
    typeof value !== 'string' ||
    !/^-?\d+(?:\.\d+)?$/.test(value)
  ) {
    return null
  }

  const coordinate = Number(value)

  if (
    !Number.isFinite(coordinate) ||
    coordinate < minimum ||
    coordinate > maximum
  ) {
    return null
  }

  return coordinate
}

// Verified Heidelberg station catalogue.
//
// GET /api/stations/catalogue
router.get('/catalogue', async (req, res, next) => {
  try {
    const stations = await Station.find({})
      .select(
        [
          '-_id',
          'stationId',
          'name',
          'brand',
          'street',
          'houseNumber',
          'postCode',
          'city',
          'location',
          'districtName',
          'districtNumber',
          'openingTimes',
          'catalogueDate',
        ].join(' '),
      )
      .sort({
        districtName: 1,
        name: 1,
      })
      .lean()

    const catalogueDates = [
      ...new Set(
        stations.map(
          (station) => station.catalogueDate,
        ),
      ),
    ].sort()

    return res.json({
      success: true,
      city: 'Heidelberg',
      count: stations.length,
      catalogueDates,
      stations,
    })
  } catch (error) {
    next(error)
  }
})

// Current prices for the verified Heidelberg station catalogue.
//
// GET /api/stations/prices
router.get('/prices', async (req, res, next) => {
  try {
    const {
      data,
      retrievedAt: observedAt,
      nextAllowedAt,
    } = await requestFuelProvider('list.php', {
      lat: String(HEIDELBERG.lat),
      lng: String(HEIDELBERG.lng),
      rad: '10',
      type: 'all',
      sort: 'dist',
    })

    const liveStationIds = data.stations.map(
      (station) => station.id.toLowerCase(),
    )

    const catalogueStations = await Station.find({
      stationId: {
        $in: liveStationIds,
      },
    })
      .select(
        [
          '-_id',
          'stationId',
          'districtName',
          'districtNumber',
          'openingTimes',
          'catalogueDate',
        ].join(' '),
      )
      .lean()

    const catalogueById = new Map(
      catalogueStations.map((station) => [
        station.stationId,
        station,
      ]),
    )

    // Only expose stations already verified against
    // Heidelberg's official district boundaries.
    const stations = data.stations
      .filter((station) =>
        catalogueById.has(
          station.id.toLowerCase(),
        ),
      )
      .map((station) => {
        const catalogue = catalogueById.get(
          station.id.toLowerCase(),
        )

        return {
          id: station.id,

          name: cleanProviderText(
            station.name,
          ),

          brand: cleanProviderText(
            station.brand,
          ),

          street: cleanProviderText(
            station.street,
          ),

          houseNumber: cleanProviderText(
            station.houseNumber,
          ),

          postCode: station.postCode,

          place: cleanProviderText(
            station.place,
          ),

          lat: station.lat,
          lng: station.lng,
          distanceKm: station.dist,

          districtName:
            catalogue.districtName,

          districtNumber:
            catalogue.districtNumber,

          openingTimes:
            catalogue.openingTimes ?? null,

          catalogueDate:
            catalogue.catalogueDate,

          isOpen:
            typeof station.isOpen === 'boolean'
              ? station.isOpen
              : null,

          prices: {
            e5: normalizePrice(
              station.e5,
            ),

            e10: normalizePrice(
              station.e10,
            ),

            diesel: normalizePrice(
              station.diesel,
            ),
          },
        }
      })

    let historySaved = false
    let historyInserted = 0
    let historyRetained = 0

    try {
      const historyResult =
        await savePriceObservations({
          stations,
          observedAt,
          license: data.license,
        })

      historySaved = true
      historyInserted =
        historyResult.inserted

      historyRetained =
        historyResult.retained
    } catch {
      console.error(
        'Could not save all city-wide fuel-price observations.',
      )
    }

    const availablePrices = {
      e5: stations.filter(
        (station) =>
          station.prices.e5 !== null,
      ).length,

      e10: stations.filter(
        (station) =>
          station.prices.e10 !== null,
      ).length,

      diesel: stations.filter(
        (station) =>
          station.prices.diesel !== null,
      ).length,
    }

    return res.json({
      success: true,

      city: 'Heidelberg',

      location: {
        ...HEIDELBERG,
      },

      radiusKm: 10,
      count: stations.length,
      availablePrices,

      retrievedAt:
        observedAt.toISOString(),

      nextRequestAt:
        nextAllowedAt.toISOString(),

      historySaved,
      historyInserted,
      historyRetained,

      source: 'Tankerkönig / MTS-K',
      license: data.license ?? null,

      stations,
    })
  } catch (error) {
    if (error instanceof FuelProviderError) {
      const body = {
        success: false,
        message: error.message,
      }

      if (error.retryAfterSeconds !== null) {
        res.set(
          'Retry-After',
          String(error.retryAfterSeconds),
        )

        body.retryAfterSeconds =
          error.retryAfterSeconds

        body.nextRequestAt = new Date(
          Date.now() +
            error.retryAfterSeconds * 1000,
        ).toISOString()
      }

      return res
        .status(error.status)
        .json(body)
    }

    next(error)
  }
})

// Live details for one verified Heidelberg station.
//
// GET /api/stations/:stationId
router.get('/:stationId', async (req, res, next) => {
  try {
    const stationId = String(
      req.params.stationId ?? '',
    )
      .trim()
      .toLowerCase()

    // Reject malformed IDs before using the provider allowance.
    if (!STATION_ID_PATTERN.test(stationId)) {
      return res.status(400).json({
        success: false,
        message: 'Provide a valid station ID.',
      })
    }

    // Only verified Heidelberg catalogue stations may
    // consume a Tankerkönig detail request.
    const catalogue = await Station.findOne({
      stationId,
    })
      .select(
        [
          '-_id',
          'stationId',
          'districtName',
          'districtNumber',
          'openingTimes',
          'catalogueDate',
        ].join(' '),
      )
      .lean()

    if (!catalogue) {
      return res.status(404).json({
        success: false,
        message:
          'Station is not in the verified Heidelberg catalogue.',
      })
    }

    const {
      data,
      retrievedAt,
      nextAllowedAt,
    } = await requestFuelProvider('detail.php', {
      id: stationId,
    })

    const liveStation = data.station

    return res.json({
      success: true,

      retrievedAt:
        retrievedAt.toISOString(),

      nextRequestAt:
        nextAllowedAt.toISOString(),

      source: 'Tankerkönig / MTS-K',
      license: data.license ?? null,

      station: {
        id: liveStation.id,

        name: cleanProviderText(
          liveStation.name,
        ),

        brand: cleanProviderText(
          liveStation.brand,
        ),

        street: cleanProviderText(
          liveStation.street,
        ),

        houseNumber: cleanProviderText(
          liveStation.houseNumber,
        ),

        postCode: liveStation.postCode,

        place: cleanProviderText(
          liveStation.place,
        ),

        lat: liveStation.lat,
        lng: liveStation.lng,

        districtName:
          catalogue.districtName,

        districtNumber:
          catalogue.districtNumber,

        catalogueDate:
          catalogue.catalogueDate,

        openingTimes:
          catalogue.openingTimes ?? null,

        isOpen:
          typeof liveStation.isOpen === 'boolean'
            ? liveStation.isOpen
            : null,

        prices: {
          e5: normalizePrice(
            liveStation.e5,
          ),

          e10: normalizePrice(
            liveStation.e10,
          ),

          diesel: normalizePrice(
            liveStation.diesel,
          ),
        },
      },
    })
  } catch (error) {
    if (error instanceof FuelProviderError) {
      const body = {
        success: false,
        message: error.message,
      }

      if (error.retryAfterSeconds !== null) {
        res.set(
          'Retry-After',
          String(error.retryAfterSeconds),
        )

        body.retryAfterSeconds =
          error.retryAfterSeconds

        body.nextRequestAt = new Date(
          Date.now() +
            error.retryAfterSeconds * 1000,
        ).toISOString()
      }

      return res
        .status(error.status)
        .json(body)
    }

    next(error)
  }
})

// Default live search:
//
// GET /api/stations?fuel=e10&radius=5
//
// Search around supplied coordinates:
//
// GET /api/stations?fuel=e10&radius=5&lat=49.4100&lng=8.6900
router.get('/', async (req, res, next) => {
  try {
    const fuel = req.query.fuel ?? 'e10'
    const radiusInput =
      req.query.radius ?? '5'

    // Validate inputs before using the shared API allowance.
    if (
      typeof fuel !== 'string' ||
      !['e5', 'e10', 'diesel'].includes(fuel)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Fuel must be e5, e10 or diesel.',
      })
    }

    if (
      typeof radiusInput !== 'string' ||
      !['2', '5', '10'].includes(
        radiusInput,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Radius must be 2, 5 or 10 kilometres.',
      })
    }

    const radius = Number(radiusInput)

    let searchPoint = {
      ...HEIDELBERG,
    }

    let locationMode = 'default'

    const hasLatitude =
      req.query.lat !== undefined

    const hasLongitude =
      req.query.lng !== undefined

    if (hasLatitude !== hasLongitude) {
      return res.status(400).json({
        success: false,
        message:
          'Provide both latitude and longitude.',
      })
    }

    if (hasLatitude && hasLongitude) {
      const lat = parseCoordinate(
        req.query.lat,
        -90,
        90,
      )

      const lng = parseCoordinate(
        req.query.lng,
        -180,
        180,
      )

      if (
        lat === null ||
        lng === null
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Provide valid latitude and longitude values.',
        })
      }

      const requestedPoint = {
        lat,
        lng,
      }

      if (
        distanceKmBetween(
          HEIDELBERG,
          requestedPoint,
        ) > SUPPORTED_AREA_KM
      ) {
        return res.status(400).json({
          success: false,
          code: 'OUTSIDE_SUPPORTED_AREA',

          message:
            'This location is outside our Heidelberg service area. Try the default Heidelberg search.',

          fallbackLocation: {
            name: 'Heidelberg',
            ...HEIDELBERG,
          },
        })
      }

      searchPoint = requestedPoint
      locationMode = 'coordinates'
    }

    const {
      data,
      retrievedAt: observedAt,
      nextAllowedAt,
    } = await requestFuelProvider(
      'list.php',
      {
        lat: String(searchPoint.lat),
        lng: String(searchPoint.lng),
        rad: String(radius),
        type: fuel,
        sort: 'price',
      },
    )

    const liveStationIds =
      data.stations.map(
        (station) =>
          station.id.toLowerCase(),
      )

    const catalogueStations =
      await Station.find({
        stationId: {
          $in: liveStationIds,
        },
      })
        .select(
          [
            '-_id',
            'stationId',
            'districtName',
            'districtNumber',
            'openingTimes',
            'catalogueDate',
          ].join(' '),
        )
        .lean()

    const catalogueById =
      new Map(
        catalogueStations.map(
          (station) => [
            station.stationId,
            station,
          ],
        ),
      )

    // Only expose stations already verified against
    // Heidelberg's official district boundaries.
    const stations =
      data.stations
        .filter((station) =>
          catalogueById.has(
            station.id.toLowerCase(),
          ),
        )
        .map((station) => {
          const catalogue =
            catalogueById.get(
              station.id.toLowerCase(),
            )

          return {
            id: station.id,

            name: cleanProviderText(
              station.name,
            ),

            brand: cleanProviderText(
              station.brand,
            ),

            street: cleanProviderText(
              station.street,
            ),

            houseNumber:
              cleanProviderText(
                station.houseNumber,
              ),

            postCode:
              station.postCode,

            place: cleanProviderText(
              station.place,
            ),

            lat: station.lat,
            lng: station.lng,

            distanceKm:
              station.dist,

            districtName:
              catalogue.districtName,

            districtNumber:
              catalogue.districtNumber,

            openingTimes:
              catalogue.openingTimes ??
              null,

            catalogueDate:
              catalogue.catalogueDate,

            price:
              normalizePrice(
                station.price,
              ),

            isOpen:
              typeof station.isOpen ===
              'boolean'
                ? station.isOpen
                : null,
          }
        })

    let historySaved = false

    try {
      await savePriceObservations({
        stations,
        fuel,
        observedAt,
        license: data.license,
      })

      historySaved = true
    } catch {
      console.error(
        'Could not save all fuel-price observations.',
      )
    }

    return res.json({
      success: true,

      location: {
        name:
          locationMode === 'default'
            ? 'Heidelberg'
            : 'Selected location in the Heidelberg area',

        mode: locationMode,
        ...searchPoint,
      },

      fuel,
      radiusKm: radius,
      count: stations.length,

      retrievedAt:
        observedAt.toISOString(),

      historySaved,

      nextRequestAt:
        nextAllowedAt.toISOString(),

      source:
        'Tankerkönig / MTS-K',

      license:
        data.license ?? null,

      stations,
    })
  } catch (error) {
    if (
      error instanceof FuelProviderError
    ) {
      const body = {
        success: false,
        message: error.message,
      }

      if (
        error.retryAfterSeconds !== null
      ) {
        res.set(
          'Retry-After',
          String(
            error.retryAfterSeconds,
          ),
        )

        body.retryAfterSeconds =
          error.retryAfterSeconds

        body.nextRequestAt =
          new Date(
            Date.now() +
              error.retryAfterSeconds *
                1000,
          ).toISOString()
      }

      return res
        .status(error.status)
        .json(body)
    }

    next(error)
  }
})

export default router