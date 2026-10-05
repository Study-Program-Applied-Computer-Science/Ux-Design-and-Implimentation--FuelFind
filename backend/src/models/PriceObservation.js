import mongoose from 'mongoose'

const priceObservationSchema = new mongoose.Schema(
  {
    stationId: {
      type: String,
      required: true,
      lowercase: true,
      match:
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    },

    fuel: {
      type: String,
      required: true,
      enum: ['e5', 'e10', 'diesel'],
    },

    // Store thousandths of one euro as an integer.
    // Example: €1.729 per litre becomes 1729.
    priceMillis: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Price must be an integer in thousandths of a euro.',
      },
    },

    isOpen: {
      type: Boolean,
      default: null,
    },

    observedAt: {
      type: Date,
      required: true,
    },

    source: {
      type: String,
      required: true,
     default: 'Tankerkönig / MTS-K',
    },

    license: {
      type: String,
      default: null,
    },
  },
  {
    versionKey: false,
  },
)

// Supports station/fuel history queries and prevents duplicate
// insertion of the same observation timestamp.
priceObservationSchema.index(
  { stationId: 1, fuel: 1, observedAt: -1 },
  { unique: true },
)

export default mongoose.model(
  'PriceObservation',
  priceObservationSchema,
)