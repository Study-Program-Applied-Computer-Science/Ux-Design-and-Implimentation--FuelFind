import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'

import ApiLimit from './models/ApiLimit.js'
import PriceObservation from './models/PriceObservation.js'

import stationRoutes from './routes/stationRoutes.js'
import historyRoutes from './routes/historyRoutes.js'
import archiveRoutes from './routes/archiveRoutes.js'
import routeRoutes from './routes/routeRoutes.js'

const app = express()
const PORT = Number(process.env.PORT) || 3000

const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
)

app.disable('x-powered-by')

// Prevent browsers from caching API responses.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

// Preserve request protection for public POST endpoints,
// including POST /api/routes.
app.use('/api', (req, res, next) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']

  if (safeMethods.includes(req.method)) {
    return next()
  }

  const origin = req.get('Origin')

  // PowerShell may omit Origin. Browser origins must be allowed.
  if (origin !== undefined && !allowedOrigins.has(origin)) {
    return res.status(403).json({
      success: false,
      message: 'Requests from this origin are not allowed.',
    })
  }

  if (req.get('X-FuelFind-Request') !== '1') {
    return res.status(403).json({
      success: false,
      message: 'Missing or invalid FuelFind request header.',
    })
  }

  next()
})

app.use(express.json({ limit: '10kb' }))

app.get('/api/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1

  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    message: 'FuelFind backend is running',
    database: databaseConnected ? 'connected' : 'disconnected',
  })
})

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing from backend/.env')
    }

    if (allowedOrigins.size === 0) {
      throw new Error('ALLOWED_ORIGINS is missing from backend/.env')
    }

    // Require exact origins, with no paths or trailing slashes.
    for (const origin of allowedOrigins) {
      const parsed = new URL(origin)

      if (
        !['http:', 'https:'].includes(parsed.protocol) ||
        parsed.origin !== origin
      ) {
        throw new Error(
          'ALLOWED_ORIGINS must contain exact HTTP or HTTPS origins.',
        )
      }
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })

    console.log('MongoDB connected successfully')

    await PriceObservation.init()

    // Preserve the existing cooldown when the server restarts.
    await ApiLimit.updateOne(
      { _id: 'tankerkoenig' },
      {
        $setOnInsert: {
          nextAllowedAt: new Date(0),
        },
      },
      { upsert: true },
    )

    // Only public features are connected to the application.
    app.use('/api/stations', stationRoutes)
    app.use('/api/history', historyRoutes)
    app.use('/api/archive', archiveRoutes)
    app.use('/api/routes', routeRoutes)

    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found. Try /api/health.',
      })
    })

    app.use((error, req, res, next) => {
      if (res.headersSent) {
        return next(error)
      }

      const status =
        error.status === 400 || error.status === 413
          ? error.status
          : 500

      let message = 'Something went wrong. Please try again.'

      if (status === 400) {
        message = 'Invalid JSON request.'
      } else if (status === 413) {
        message = 'Request is too large.'
      }

      // Do not log request data or secrets.
      if (status === 500) {
        console.error('API request failed:', error.name || 'Error')
      }

      res.status(status).json({
        success: false,
        message,
      })
    })

    const server = app.listen(PORT, () => {
      console.log(`FuelFind backend: http://localhost:${PORT}`)
      console.log('Public FuelFind API enabled.')
      console.log(
        'Account routes and background price-alert worker are not mounted.',
      )
    })

    server.on('error', (error) => {
      console.error('Could not start the HTTP server:', error.message)
      process.exit(1)
    })
  } catch (error) {
    console.error('Could not start the backend:', error.message)
    process.exit(1)
  }
}

startServer()