import { Router } from 'express'

import HistoricalPrice from '../models/HistoricalPrice.js'
import Station from '../models/Station.js'
import { isValidArchiveDate } from '../utils/archiveValidation.js'

const router = Router()

const STATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const FUELS = ['e5', 'e10', 'diesel']

const CHANGE_LABELS = {
  1: 'changed',
  2: 'removed',
  3: 'new',
}

function validateRequest({
  stationId,
  fuel,
  archiveDate,
}) {
  if (!STATION_ID_PATTERN.test(stationId)) {
    return {
      status: 400,
      message: 'Enter a valid station ID.',
    }
  }

  if (
    typeof fuel !== 'string' ||
    !FUELS.includes(fuel)
  ) {
    return {
      status: 400,
      message: 'Fuel must be e5, e10 or diesel.',
    }
  }

  if (!isValidArchiveDate(archiveDate)) {
    return {
      status: 400,
      message:
        'Provide a valid archive date in YYYY-MM-DD format.',
    }
  }

  return null
}

function toArchiveEvent(
  record,
  priceField,
  changeField,
) {
  const changeCode = record[changeField]
  const priceMillis = record[priceField]

  return {
    changedAt: record.changedAt,
    sourceTimestamp: record.sourceTimestamp,

    changeType:
      CHANGE_LABELS[changeCode] ?? 'unknown',

    // Removed or zero-price fuel is unavailable.
    price:
      changeCode !== 2 &&
      typeof priceMillis === 'number' &&
      priceMillis > 0
        ? priceMillis / 1000
        : null,
  }
}

// Historical analytics for one verified Heidelberg station.
//
// Example:
// GET /api/archive/analytics/STATION_ID?fuel=e10&date=2026-10-02
router.get(
  '/analytics/:stationId',
  async (req, res, next) => {
    try {
      const stationId = String(
        req.params.stationId ?? '',
      )
        .trim()
        .toLowerCase()

      const fuel =
        req.query.fuel ?? 'e10'

      const archiveDate =
        req.query.date

      const validationError =
        validateRequest({
          stationId,
          fuel,
          archiveDate,
        })

      if (validationError) {
        return res
          .status(validationError.status)
          .json({
            success: false,
            message:
              validationError.message,
          })
      }

      const station =
        await Station.findOne({
          stationId,
        })
          .select(
            [
              '-_id',
              'stationId',
              'name',
              'brand',
              'districtName',
              'districtNumber',
            ].join(' '),
          )
          .lean()

      if (!station) {
        return res.status(404).json({
          success: false,
          message:
            'Station is not in the verified Heidelberg catalogue.',
        })
      }

      const priceField =
        `${fuel}Millis`

      const changeField =
        `${fuel}Change`

      const records =
        await HistoricalPrice.find({
          stationId,

          // Match the archive's original local date.
          sourceTimestamp: {
            $regex: `^${archiveDate} `,
          },

          [changeField]: {
            $in: [1, 2, 3],
          },
        })
          .sort({
            changedAt: 1,
          })
          .select(
            [
              'changedAt',
              'sourceTimestamp',
              priceField,
              changeField,
              '-_id',
            ].join(' '),
          )
          .lean()

      const events =
        records.map((record) =>
          toArchiveEvent(
            record,
            priceField,
            changeField,
          ),
        )

      const pricedEvents =
        events.filter(
          (event) =>
            typeof event.price ===
              'number' &&
            Number.isFinite(event.price),
        )

      const prices =
        pricedEvents.map(
          (event) => event.price,
        )

      const firstRecordedChange =
        events.length > 0
          ? events[0]
          : null

      const lastRecordedChange =
        events.length > 0
          ? events[events.length - 1]
          : null

      const latestPricedEvent =
        pricedEvents.length > 0
          ? pricedEvents[
              pricedEvents.length - 1
            ]
          : null

      let lowestRecordedPrice = null
      let highestRecordedPrice = null
      let priceRange = null

      if (prices.length > 0) {
        const minimum =
          Math.min(...prices)

        const maximum =
          Math.max(...prices)

        lowestRecordedPrice =
          minimum

        highestRecordedPrice =
          maximum

        priceRange =
          Number(
            (
              maximum - minimum
            ).toFixed(3),
          )
      }

      return res.json({
        success: true,

        station: {
          id: station.stationId,
          name: station.name,
          brand: station.brand,

          districtName:
            station.districtName,

          districtNumber:
            station.districtNumber,
        },

        fuel,
        archiveDate,

        currency: 'EUR',
        unit: 'per litre',

        eventCount:
          events.length,

        pricedEventCount:
          pricedEvents.length,

        analytics: {
          firstRecordedChange,
          lastRecordedChange,

          lowestRecordedPrice,
          highestRecordedPrice,

          latestRecordedPrice:
            latestPricedEvent?.price ??
            null,

          priceRange,
        },

        source:
          'Tankerkönig historical archive',

        license:
          'CC BY-NC-SA 4.0',

        licenseUrl:
          'https://creativecommons.org/licenses/by-nc-sa/4.0/',

        message:
          events.length === 0
            ? 'No imported change events found for this station, fuel and date.'
            : 'Analytics are based only on recorded archive price-change events. They do not represent a continuous daily average.',
      })
    } catch (error) {
      next(error)
    }
  },
)

// Historical change-event timeline.
//
// Example:
// GET /api/archive/STATION_ID?fuel=e10&date=2026-10-02
router.get(
  '/:stationId',
  async (req, res, next) => {
    try {
      const stationId = String(
        req.params.stationId ?? '',
      )
        .trim()
        .toLowerCase()

      const fuel =
        req.query.fuel ?? 'e10'

      const archiveDate =
        req.query.date

      const validationError =
        validateRequest({
          stationId,
          fuel,
          archiveDate,
        })

      if (validationError) {
        return res
          .status(validationError.status)
          .json({
            success: false,
            message:
              validationError.message,
          })
      }

      // Archive history is available only for stations
      // in the verified Heidelberg catalogue.
      const stationExists =
        await Station.exists({
          stationId,
        })

      if (!stationExists) {
        return res.status(404).json({
          success: false,
          message:
            'Station is not in the verified Heidelberg catalogue.',
        })
      }

      const priceField =
        `${fuel}Millis`

      const changeField =
        `${fuel}Change`

      const maximumRecords = 2000

      const records =
        await HistoricalPrice.find({
          stationId,

          // Match the archive's original local calendar date.
          // Do not shift its day boundary to UTC midnight.
          sourceTimestamp: {
            $regex: `^${archiveDate} `,
          },

          // Exclude rows where only another fuel changed.
          [changeField]: {
            $in: [1, 2, 3],
          },
        })
          .sort({
            changedAt: 1,
          })
          .limit(
            maximumRecords + 1,
          )
          .select(
            [
              'changedAt',
              'sourceTimestamp',
              priceField,
              changeField,
              '-_id',
            ].join(' '),
          )
          .lean()

      const events = records
        .slice(
          0,
          maximumRecords,
        )
        .map((record) =>
          toArchiveEvent(
            record,
            priceField,
            changeField,
          ),
        )

      return res.json({
        success: true,

        stationId,
        fuel,
        archiveDate,

        currency: 'EUR',
        unit: 'per litre',

        count:
          events.length,

        truncated:
          records.length >
          maximumRecords,

        source:
          'Tankerkönig historical archive',

        license:
          'CC BY-NC-SA 4.0',

        licenseUrl:
          'https://creativecommons.org/licenses/by-nc-sa/4.0/',

        message:
          events.length === 0
            ? 'No imported change events found for this station, fuel and date.'
            : 'Recorded archive events; the price at the start of the day is not supplied by this response.',

        events,
      })
    } catch (error) {
      next(error)
    }
  },
)

export default router