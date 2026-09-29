import mongoose from 'mongoose'

const favouriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    stationId: {
      type: String,
      required: true,
      lowercase: true,
      match:
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    },
  },
  {
    timestamps: true,
  },
)

// A user can save each station only once.
// Different users can save the same station.
favouriteSchema.index(
  { user: 1, stationId: 1 },
  { unique: true },
)

const Favourite = mongoose.model('Favourite', favouriteSchema)

export default Favourite