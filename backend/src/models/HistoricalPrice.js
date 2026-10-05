import mongoose from 'mongoose'

function priceField() {
  return {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: Number.isSafeInteger,
      message: 'Archive price must use integer thousandths of a euro.',
    },
  }
}

function changeField() {
  return {
    type: Number,
    required: true,
    enum: [0, 1, 2, 3],
  }
}

const historicalPriceSchema = new mongoose.Schema(
  {
    stationId: {
      type: String,
      required: true,
      lowercase: true,
      match:
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    },

    changedAt: {
      type: Date,
      required: true,
    },

    // Keep the original timestamp, including its timezone.
    sourceTimestamp: {
      type: String,
      required: true,
    },

    // These preserve the archive values.
    // Zero means unavailable and must never display as free fuel.
    dieselMillis: priceField(),
    e5Millis: priceField(),
    e10Millis: priceField(),

    // 0 = unchanged, 1 = changed, 2 = removed, 3 = new.
    dieselChange: changeField(),
    e5Change: changeField(),
    e10Change: changeField(),

    sourceFile: {
      type: String,
      required: true,
    },

    source: {
      type: String,
      default: 'Tankerkönig historical archive',
    },

    license: {
      type: String,
      default: 'CC BY-NC-SA 4.0',
    },
  },
  {
    timestamps: true,
    collection: 'historicalprices',
  },
)

historicalPriceSchema.index(
  { stationId: 1, changedAt: 1 },
  { unique: true },
)

export default mongoose.model(
  'HistoricalPrice',
  historicalPriceSchema,
)