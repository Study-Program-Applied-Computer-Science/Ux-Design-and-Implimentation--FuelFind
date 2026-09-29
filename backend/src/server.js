import Favourite from './models/Favourite.js'
import favouriteRoutes from './routes/favouriteRoutes.js'
import accountRoutes from './routes/accountRoutes.js'
import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import stationRoutes from './routes/stationRoutes.js'
import ApiLimit from './models/ApiLimit.js'

import authRoutes from './routes/authRoutes.js'
import User from './models/User.js'

const app = express()
const PORT = Number(process.env.PORT) || 3000
const isProduction = process.env.NODE_ENV === 'production'

app.disable('x-powered-by')
app.use(express.json({ limit: '10kb' }))

// Prevent browsers from caching account responses.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

// Check whether the backend and database are connected.
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

    if (
      !process.env.SESSION_SECRET ||
      process.env.SESSION_SECRET.length < 32
    ) {
      throw new Error('Add a strong SESSION_SECRET to backend/.env')
    }

    // Connect to MongoDB before accepting requests.
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })

    console.log('MongoDB connected successfully')

    // Wait for the user indexes, including unique email.
    await User.init()
    await Favourite.init()
    // Create the shared request-limit record if it does not exist.
    // Existing cooldowns are preserved when the server restarts.
    await ApiLimit.updateOne(
      { _id: 'tankerkoenig' },
      {
        $setOnInsert: {
          nextAllowedAt: new Date(0),
        },
      },
      { upsert: true },
    )

    // Reuse the database connection for session storage.
    const sessionStore = MongoStore.create({
      client: mongoose.connection.getClient(),
      dbName: mongoose.connection.name,
      collectionName: 'sessions',
    })

    sessionStore.on('error', () => {
      console.error('MongoDB session storage encountered an error.')
    })

    app.use(
      session({
        name: 'fuelfind.sid',
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: sessionStore,

        cookie: {
          httpOnly: true,
          sameSite: 'lax',
          secure: isProduction,
          maxAge: 24 * 60 * 60 * 1000,
        },
      }),
    )

    // Session handling must be registered before these routes.
    app.use('/api/auth', authRoutes)
    app.use('/api/stations', stationRoutes)
    app.use('/api/account', accountRoutes)
    app.use('/api/favourites', favouriteRoutes)

    // Return JSON for unknown routes.
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found. Try /api/health.',
      })
    })

    // Handle unexpected errors without exposing internal details.
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

      res.status(status).json({
        success: false,
        message,
      })
    })

    const server = app.listen(PORT, () => {
      console.log(`FuelFind backend: http://localhost:${PORT}`)
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