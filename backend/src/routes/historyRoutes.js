import { Router } from 'express'

import PriceObservation from '../models/PriceObservation.js'
import Station from '../models/Station.js'

const router = Router()

const STATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Example:
// GET /api/history/STATION_ID?fuel=e10&days=7
router.get('/:stationId', async (req, res, next) => {
  try {
    const stationId = String(
      req.params.stationId ?? '',
    )
      .trim()
      .toLowerCase()

    const fuel =
      req.query.fuel ?? 'e10'

    const daysInput =
      req.query.days ?? '7'

    if (!STATION_ID_PATTERN.test(stationId)) {
      return res.status(400).json({
        success: false,
        message:
          'Enter a valid station ID.',
      })
    }

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
      typeof daysInput !== 'string' ||
      !['1', '7', '30'].includes(daysInput)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'History period must be 1, 7 or 30 days.',
      })
    }

    // History is available only for stations in the
    // verified Heidelberg catalogue.
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

    const days = Number(daysInput)

    const to = new Date()

    const from = new Date(
      to.getTime() -
        days *
          24 *
          60 *
          60 *
          1000,
    )

    // Bound the response size. Read one extra record to
    // detect whether older observations were omitted.
    const maximumPoints = 2000

    const records =
      await PriceObservation.find({
        stationId,
        fuel,

        observedAt: {
          $gte: from,
          $lte: to,
        },
      })
        .sort({
          observedAt: -1,
        })
        .limit(
          maximumPoints + 1,
        )
        .select(
          'priceMillis isOpen observedAt source license -_id',
        )
        .lean()

    const truncated =
      records.length >
      maximumPoints

    // Return latest observations in chronological order.
    const history = records
      .slice(
        0,
        maximumPoints,
      )
      .reverse()
      .map((record) => ({
        price:
          record.priceMillis /
          1000,

        isOpen:
          record.isOpen,

        observedAt:
          record.observedAt,

        source:
          record.source,

        license:
          record.license,
      }))

    return res.json({
      success: true,

      stationId,
      fuel,

      currency: 'EUR',
      unit: 'per litre',

      days,

      from:
        from.toISOString(),

      to:
        to.toISOString(),

      count:
        history.length,

      truncated,

      message:
        history.length === 0
          ? 'No saved observations for this station, fuel and period.'
          : 'Saved observations at retrieval time, not exact price-change times.',

      history,
    })
  } catch (error) {
    next(error)
  }
})

export default router