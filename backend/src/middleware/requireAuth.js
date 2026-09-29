import User from '../models/User.js'

export default async function requireAuth(req, res, next) {
  try {
    if (!req.session?.userId) {
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

    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}