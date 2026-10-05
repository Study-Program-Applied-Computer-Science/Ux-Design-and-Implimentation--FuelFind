import mongoose from 'mongoose'

const STATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const stationSchema = new mongoose.Schema(
  {
    stationId: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      match: STATION_ID_PATTERN,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    brand: {
      type: String,
      default: '',
      trim: true,
    },

    street: {
      type: String,
      required: true,
      trim: true,
    },

    houseNumber: {
      type: String,
      default: '',
      trim: true,
    },

    postCode: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
      default: 'Heidelberg',
    },

    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },

      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator(value) {
            return (
              Array.isArray(value) &&
              value.length === 2 &&
              Number.isFinite(value[0]) &&
              Number.isFinite(value[1]) &&
              value[0] >= -180 &&
              value[0] <= 180 &&
              value[1] >= -90 &&
              value[1] <= 90
            )
          },
          message:
            'Station location must contain valid [longitude, latitude] coordinates.',
        },
      },
    },

    districtName: {
      type: String,
      required: true,
      trim: true,
    },

    districtNumber: {
      type: String,
      required: true,
      trim: true,
    },

    firstActiveSource: {
      type: String,
      default: '',
      trim: true,
    },

    openingTimes: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    catalogueDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    sourceFile: {
      type: String,
      required: true,
      trim: true,
    },

    districtSource: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'stations',
  },
)

stationSchema.index({ location: '2dsphere' })
stationSchema.index({ districtName: 1 })

export default mongoose.model('Station', stationSchema)