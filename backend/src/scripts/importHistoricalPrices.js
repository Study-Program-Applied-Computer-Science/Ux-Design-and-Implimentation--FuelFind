import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import mongoose from 'mongoose'
import { parse } from 'csv-parse/sync'

import HistoricalPrice from '../models/HistoricalPrice.js'
import {
  isValidArchiveDate,
  parseArchiveTimestamp,
} from '../utils/archiveValidation.js'

async function readCsv(filePath, requiredColumns) {
  const text = await readFile(filePath, 'utf8')

  const records = parse(text, {
    bom: true,
    columns: (headers) => {
      for (const column of requiredColumns) {
        if (!headers.includes(column)) {
          throw new Error(`Missing CSV column: ${column}`)
        }
      }

      return headers
    },
    skip_empty_lines: true,
  })

  if (records.length === 0) {
    throw new Error(`CSV has no records: ${path.basename(filePath)}`)
  }

  return records
}

function parsePrice(value) {
  if (
    typeof value !== 'string' ||
    !/^\d+(?:\.\d{1,3})?$/.test(value)
  ) {
    throw new Error('Invalid archive price')
  }

  const [whole, fraction = ''] = value.split('.')
  const millis =
    Number(whole) * 1000 + Number(fraction.padEnd(3, '0'))

  if (!Number.isSafeInteger(millis)) {
    throw new Error('Archive price is outside the supported range')
  }

  return millis
}

function parseChange(value) {
  if (!['0', '1', '2', '3'].includes(value)) {
    throw new Error('Invalid fuel-change flag')
  }

  return Number(value)
}

try {
  const [dataFolder, archiveDate, option] = process.argv.slice(2)

  if (
    !dataFolder ||
    !/^\d{4}-\d{2}-\d{2}$/.test(archiveDate || '') ||
    (option !== undefined && option !== '--dry-run')
  ) {
    throw new Error(
      'Usage: node src/scripts/importHistoricalPrices.js "DATA_FOLDER" YYYY-MM-DD [--dry-run]',
    )
  }

  if (!isValidArchiveDate(archiveDate)) {
    throw new Error(
      'Provide a valid archive calendar date in YYYY-MM-DD format.',
    )
  }

  const stationFile = `${archiveDate}-heidelberg-stations.csv`
  const priceFile = `${archiveDate}-heidelberg-prices.csv`

  const stations = await readCsv(
    path.join(dataFolder, stationFile),
    ['uuid', 'city'],
  )

  if (
    stations.some(
      (station) =>
        station.city?.trim().toLowerCase() !== 'heidelberg',
    )
  ) {
    throw new Error('The station file contains a non-Heidelberg city')
  }

  const stationIds = new Set(
    stations.map((station) => station.uuid.toLowerCase()),
  )

  const rows = await readCsv(
    path.join(dataFolder, priceFile),
    [
      'date',
      'station_uuid',
      'diesel',
      'e5',
      'e10',
      'dieselchange',
      'e5change',
      'e10change',
    ],
  )

  const documents = []
  const seen = new Set()

  // Validate every record before connecting or writing to MongoDB.
  for (const [index, row] of rows.entries()) {
    try {
      const stationId = row.station_uuid.toLowerCase()

      if (!stationIds.has(stationId)) {
        throw new Error(
          'Station is missing from the Heidelberg station file',
        )
      }

      const changedAt = parseArchiveTimestamp(row.date, archiveDate)
      const key = `${stationId}|${changedAt.toISOString()}`

      if (seen.has(key)) {
        throw new Error('Duplicate station/timestamp in the input file')
      }

      seen.add(key)

      const document = new HistoricalPrice({
        stationId,
        changedAt,
        sourceTimestamp: row.date,
        dieselMillis: parsePrice(row.diesel),
        e5Millis: parsePrice(row.e5),
        e10Millis: parsePrice(row.e10),
        dieselChange: parseChange(row.dieselchange),
        e5Change: parseChange(row.e5change),
        e10Change: parseChange(row.e10change),
        sourceFile: priceFile,
      })

      await document.validate()

      const record = document.toObject()
      delete record._id
      documents.push(record)
    } catch (error) {
      throw new Error(`CSV record ${index + 1}: ${error.message}`)
    }
  }

  console.log(`Heidelberg stations: ${stationIds.size}`)
  console.log(`Validated price records: ${documents.length}`)

  if (option === '--dry-run') {
    console.log('Validation completed. No database changes made.')
  } else {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing from backend/.env')
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })

    await HistoricalPrice.init()

    const result = await HistoricalPrice.bulkWrite(
      documents.map((document) => ({
        updateOne: {
          filter: {
            stationId: document.stationId,
            changedAt: document.changedAt,
          },
          update: {
            $setOnInsert: document,
          },
          upsert: true,
          timestamps: false,
        },
      })),
      { ordered: true },
    )

    console.log(`New records inserted: ${result.upsertedCount}`)
    console.log(`Existing records retained: ${result.matchedCount}`)
    console.log('Historical import completed.')
  }
} catch (error) {
  console.error('Import failed:', error.message)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}