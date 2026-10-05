import PriceObservation from '../models/PriceObservation.js'
import Station from '../models/Station.js'

const STATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const FUELS = ['e5', 'e10', 'diesel']

function priceToMillis(value) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return null
  }

  const millis = Math.round(value * 1000)

  if (
    !Number.isSafeInteger(millis) ||
    millis <= 0
  ) {
    return null
  }

  return millis
}

export default async function savePriceObservations({
  stations,
  fuel = null,
  observedAt,
  license,
}) {
  if (!Array.isArray(stations)) {
    throw new Error(
      'Stations must be supplied as an array.',
    )
  }

  if (
    !(observedAt instanceof Date) ||
    !Number.isFinite(observedAt.getTime())
  ) {
    throw new Error(
      'A valid observation timestamp is required.',
    )
  }

  if (
    fuel !== null &&
    !FUELS.includes(fuel)
  ) {
    throw new Error(
      'Fuel must be e5, e10, diesel or null.',
    )
  }

  const observations = []

  for (const station of stations) {
    if (
      typeof station.id !== 'string' ||
      !STATION_ID_PATTERN.test(station.id)
    ) {
      continue
    }

    const stationId =
      station.id.toLowerCase()

    const fuelsToSave =
      fuel === null
        ? FUELS
        : [fuel]

    for (const currentFuel of fuelsToSave) {
      const price =
        fuel === null
          ? station.prices?.[currentFuel]
          : station.price

      const priceMillis =
        priceToMillis(price)

      if (priceMillis === null) {
        continue
      }

      observations.push({
        stationId,
        fuel: currentFuel,
        priceMillis,

        isOpen:
          typeof station.isOpen === 'boolean'
            ? station.isOpen
            : null,

        observedAt,

        source:
          'Tankerkönig / MTS-K',

        license:
          typeof license === 'string'
            ? license
            : null,
      })
    }
  }

  if (observations.length === 0) {
    return {
      inserted: 0,
      retained: 0,
      skippedUnverified: 0,
    }
  }

  // Enforce the verified Heidelberg catalogue at the
  // persistence layer as an additional safety boundary.
  const candidateStationIds = [
    ...new Set(
      observations.map(
        (observation) =>
          observation.stationId,
      ),
    ),
  ]

  const verifiedStationIds =
    new Set(
      await Station.distinct(
        'stationId',
        {
          stationId: {
            $in: candidateStationIds,
          },
        },
      ),
    )

  const verifiedObservations =
    observations.filter(
      (observation) =>
        verifiedStationIds.has(
          observation.stationId,
        ),
    )

  const skippedUnverified =
    observations.length -
    verifiedObservations.length

  if (verifiedObservations.length === 0) {
    return {
      inserted: 0,
      retained: 0,
      skippedUnverified,
    }
  }

  const result =
    await PriceObservation.bulkWrite(
      verifiedObservations.map(
        (observation) => ({
          updateOne: {
            filter: {
              stationId:
                observation.stationId,

              fuel:
                observation.fuel,

              observedAt:
                observation.observedAt,
            },

            update: {
              $setOnInsert:
                observation,
            },

            upsert: true,
          },
        }),
      ),
      {
        ordered: false,
      },
    )

  return {
    inserted:
      result.upsertedCount ?? 0,

    retained:
      result.matchedCount ?? 0,

    skippedUnverified,
  }
}