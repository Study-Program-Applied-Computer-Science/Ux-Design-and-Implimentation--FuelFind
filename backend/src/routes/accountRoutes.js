import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'

const router = Router()

// Every route in this file requires a valid login.
router.use(requireAuth)

// GET /api/account/preferences
router.get('/preferences', (req, res) => {
  res.json({
    success: true,
    preferences: {
      preferredFuel: req.user.preferredFuel,
      language: req.user.language,
    },
  })
})

// PATCH /api/account/preferences
router.patch('/preferences', async (req, res, next) => {
  try {
    const body = req.body

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({
        success: false,
        message: 'Send preferences as a JSON object.',
      })
    }

    const allowedFields = ['preferredFuel', 'language']
    const fields = Object.keys(body)

    if (
      fields.length === 0 ||
      fields.some((field) => !allowedFields.includes(field))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Provide preferredFuel, language, or both.',
      })
    }

    if (
      Object.hasOwn(body, 'preferredFuel') &&
      !['e5', 'e10', 'diesel'].includes(body.preferredFuel)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Preferred fuel must be e5, e10 or diesel.',
      })
    }

    if (
      Object.hasOwn(body, 'language') &&
      !['en', 'de'].includes(body.language)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Language must be en or de.',
      })
    }

    // Change only the explicitly permitted fields.
    if (Object.hasOwn(body, 'preferredFuel')) {
      req.user.preferredFuel = body.preferredFuel
    }

    if (Object.hasOwn(body, 'language')) {
      req.user.language = body.language
    }

    await req.user.save()

    res.json({
      success: true,
      message: 'Preferences saved.',
      preferences: {
        preferredFuel: req.user.preferredFuel,
        language: req.user.language,
      },
    })
  } catch (error) {
    next(error)
  }
})

export default router