import mongoose from 'mongoose'

const apiLimitSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
    },

    nextAllowedAt: {
      type: Date,
      required: true,
      default: () => new Date(0),
    },
  },
  {
    versionKey: false,
  },
)

const ApiLimit = mongoose.model('ApiLimit', apiLimitSchema)

export default ApiLimit