import { Router } from 'express'
import Favourite from '../models/Favourite.js'
import requireAuth from '../middleware/requireAuth.js'

const router = Router()

router.use(requireAuth)

// Validate station IDs for routes that include :stationId.
router.param('stationId', (req, res, next, value) => {
  const stationIdPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (!stationIdPattern.test(value)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid station ID.',
    })
  }

  req.stationId = value.toLowerCase()
  next()
})

// GET /api/favourites
router.get('/', async (req, res, next) => {
  try {
    const favourites = await Favourite.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .select('stationId createdAt -_id')
      .lean()

    res.json({
      success: true,
      count: favourites.length,
      favourites,
    })
  } catch (error) {
    next(error)
  }
})

// PUT /api/favourites/:stationId
router.put('/:stationId', async (req, res, next) => {
  try {
    await Favourite.updateOne(
      {
        user: req.user._id,
        stationId: req.stationId,
      },
      {
        $setOnInsert: {
          user: req.user._id,
          stationId: req.stationId,
        },
      },
      {
        upsert: true,
        runValidators: true,
      },
    )

    res.json({
      success: true,
      message: 'Station saved to favourites.',
      stationId: req.stationId,
    })
  } catch (error) {
    // Two simultaneous saves may hit the unique index.
    // The desired favourite already exists, so report success.
    if (error.code === 11000) {
      return res.json({
        success: true,
        message: 'Station is already in favourites.',
        stationId: req.stationId,
      })
    }

    next(error)
  }
})

// DELETE /api/favourites/:stationId
router.delete('/:stationId', async (req, res, next) => {
  try {
    const result = await Favourite.deleteOne({
      user: req.user._id,
      stationId: req.stationId,
    })

    res.json({
      success: true,
      message:
        result.deletedCount === 1
          ? 'Station removed from favourites.'
          : 'Station was not in favourites.',
      stationId: req.stationId,
    })
  } catch (error) {
    next(error)
  }
})

export default router