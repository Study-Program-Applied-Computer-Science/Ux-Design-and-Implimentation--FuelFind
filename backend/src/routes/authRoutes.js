import { Router } from 'express'
import bcrypt from 'bcryptjs'
import validator from 'validator'
import { rateLimit } from 'express-rate-limit'

import User from '../models/User.js'

const router = Router()

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many registration attempts. Try again later.',
  },
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Try again later.',
  },
})

// Perform a password comparison even when the email does not exist.
const dummyHash = await bcrypt.hash('NotARealAccountPassword!', 12)

// Only return fields that the frontend needs.
function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    preferredFuel: user.preferredFuel,
    language: user.language,
  }
}

// POST /api/auth/register
router.post('/register', registrationLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = req.body ?? {}

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required.',
      })
    }

    const cleanName = name.trim()
    const cleanEmail = email.trim().toLowerCase()

    if (cleanName.length < 1 || cleanName.length > 80) {
      return res.status(400).json({
        success: false,
        message: 'Name must contain between 1 and 80 characters.',
      })
    }

    if (!validator.isEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid email address.',
      })
    }

    if (password.length < 12 || bcrypt.truncates(password)) {
      return res.status(400).json({
        success: false,
        message:
          'Password must have at least 12 characters and at most 72 bytes.',
      })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
    })

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: publicUser(user),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      })
    }

    next(error)
  }
})

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {}

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !validator.isEmail(email.trim()) ||
      password.length < 12 ||
      bcrypt.truncates(password)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid email and password.',
      })
    }

    // Explicitly retrieve the hash for this password check.
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select('+passwordHash')

    const passwordMatches = await bcrypt.compare(
      password,
      user ? user.passwordHash : dummyHash,
    )

    if (!user || !passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Email or password is incorrect.',
      })
    }

    // Replace any existing session with a fresh session.
    await new Promise((resolve, reject) => {
      req.session.regenerate((error) => {
        if (error) return reject(error)
        resolve()
      })
    })

    req.session.userId = user._id.toString()

    // Save the session before sending the success response.
    await new Promise((resolve, reject) => {
      req.session.save((error) => {
        if (error) return reject(error)
        resolve()
      })
    })

    return res.json({
      success: true,
      message: 'Logged in successfully.',
      user: publicUser(user),
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/auth/me
router.get('/me', async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Please log in.',
      })
    }

    const user = await User.findById(req.session.userId)

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Please log in.',
      })
    }

    return res.json({
      success: true,
      user: publicUser(user),
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/auth/logout
router.post('/logout', (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error)

    res.clearCookie('fuelfind.sid', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    return res.json({
      success: true,
      message: 'Logged out successfully.',
    })
  })
})

export default router