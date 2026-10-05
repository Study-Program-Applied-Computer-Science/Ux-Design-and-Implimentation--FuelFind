import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import mongoose from 'mongoose'
import { parse } from 'csv-parse/sync'
import proj4 from 'proj4'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'

import Station from '../models/Station.js'
import { isValidArchiveDate } from '../utils/archiveValidation.js'

const STATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

proj4.defs(
  'EPSG:25832',
  '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs +type=crs',
)

function cleanText(value) {
  if (typeof value !== 'string') {
    return ''
  }

  return value
    .trim()
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function getDistrictName(feature) {
  const number = String(feature?.properties?.NUMMER ?? '').trim()
  const rawName = String(feature?.properties?.NAME ?? '').trim()

  // The downloaded district source contains a broken encoding for Südstadt.
  // Normalize it using the official district identifier.
  if (number === '08221000050000') {
    return 'Südstadt'
  }

  if (!rawName) {
    throw new Error(
      `District ${number || '(unknown)'} has no NAME`,
    )
  }

  return rawName
}

function parseOpeningTimes(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }

  let parsed

  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('Invalid opening-times JSON')
  }

  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed)
  ) {
    throw new Error('Opening-times value must be a JSON object')
  }

  if (Object.keys(parsed).length === 0) {
    return null
  }

  return parsed
}

try {
  const [stationFile, districtFile, option] = process.argv.slice(2)

  if (
    !stationFile ||
    !districtFile ||
    (option !== undefined && option !== '--dry-run')
  ) {
    throw new Error(
      'Usage: node src/scripts/importStationCatalogue.js "STATION_CSV" "DISTRICT_GEOJSON" [--dry-run]',
    )
  }

  const stationFileName = path.basename(stationFile)

  const fileMatch = stationFileName.match(
    /^(\d{4}-\d{2}-\d{2})-heidelberg-stations\.csv$/i,
  )

  if (!fileMatch || !isValidArchiveDate(fileMatch[1])) {
    throw new Error(
      'Station filename must begin with a valid YYYY-MM-DD archive date.',
    )
  }

  const catalogueDate = fileMatch[1]

  const [stationText, districtText] = await Promise.all([
    readFile(stationFile, 'utf8'),
    readFile(districtFile, 'utf8'),
  ])

  const stations = parse(stationText, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
  })

  if (stations.length === 0) {
    throw new Error('Station CSV has no records')
  }

  const requiredColumns = [
    'uuid',
    'name',
    'brand',
    'street',
    'house_number',
    'post_code',
    'city',
    'latitude',
    'longitude',
    'first_active',
    'openingtimes_json',
  ]

  for (const column of requiredColumns) {
    if (!Object.hasOwn(stations[0], column)) {
      throw new Error(`Missing CSV column: ${column}`)
    }
  }

  const geo = JSON.parse(districtText)

  if (
    geo.type !== 'FeatureCollection' ||
    !Array.isArray(geo.features)
  ) {
    throw new Error(
      'District file is not a valid GeoJSON FeatureCollection',
    )
  }

  const crsName = geo.crs?.properties?.name

  if (crsName !== 'urn:ogc:def:crs:EPSG::25832') {
    throw new Error(
      `Unexpected district CRS: ${crsName || '(missing)'}`,
    )
  }

  if (geo.features.length !== 15) {
    throw new Error(
      `Expected 15 Heidelberg districts, found ${geo.features.length}`,
    )
  }

  const documents = []
  const seenStationIds = new Set()

  for (const [index, row] of stations.entries()) {
    try {
      const stationId = String(row.uuid ?? '')
        .trim()
        .toLowerCase()

      if (!STATION_ID_PATTERN.test(stationId)) {
        throw new Error('Invalid station UUID')
      }

      if (seenStationIds.has(stationId)) {
        throw new Error('Duplicate station UUID in station CSV')
      }

      seenStationIds.add(stationId)

      if (
        typeof row.city !== 'string' ||
        row.city.trim().toLowerCase() !== 'heidelberg'
      ) {
        throw new Error('Station city is not Heidelberg')
      }

      const latitude = Number(row.latitude)
      const longitude = Number(row.longitude)

      if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        throw new Error('Invalid station coordinates')
      }

      const projectedPoint = proj4(
        'EPSG:4326',
        'EPSG:25832',
        [longitude, latitude],
      )

      const matches = geo.features.filter((district) =>
        booleanPointInPolygon(projectedPoint, district),
      )

      if (matches.length === 0) {
        throw new Error(
          'Station does not match any Heidelberg district',
        )
      }

      if (matches.length > 1) {
        throw new Error(
          'Station matches more than one Heidelberg district',
        )
      }

      const district = matches[0]

      const document = new Station({
        stationId,
        name: cleanText(row.name),
        brand: cleanText(row.brand),
        street: cleanText(row.street),
        houseNumber: cleanText(row.house_number),
        postCode: cleanText(row.post_code),
        city: 'Heidelberg',

        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },

        districtName: getDistrictName(district),
        districtNumber: String(
          district.properties.NUMMER,
        ).trim(),

        firstActiveSource: cleanText(row.first_active),

        openingTimes: parseOpeningTimes(
          row.openingtimes_json,
        ),

        catalogueDate,
        sourceFile: stationFileName,
        districtSource: path.basename(districtFile),
      })

      await document.validate()

      const record = document.toObject()
      delete record._id

      documents.push(record)
    } catch (error) {
      throw new Error(
        `Station CSV record ${index + 1}: ${error.message}`,
      )
    }
  }

  console.log(`Catalogue date: ${catalogueDate}`)
  console.log(`Station records: ${documents.length}`)
  console.log(
    `Districts represented: ${
      new Set(
        documents.map((document) => document.districtName),
      ).size
    }`,
  )

  if (option === '--dry-run') {
    console.log(
      'Catalogue validation completed. No database changes made.',
    )
  } else {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        'MONGODB_URI is missing from backend/.env',
      )
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })

    await Station.init()

    const result = await Station.bulkWrite(
      documents.map((document) => ({
        updateOne: {
          filter: {
            stationId: document.stationId,
          },
          update: {
            $setOnInsert: document,
          },
          upsert: true,
          timestamps: false,
        },
      })),
      {
        ordered: true,
      },
    )

    console.log(
      `New stations inserted: ${result.upsertedCount}`,
    )

    console.log(
      `Existing stations retained: ${result.matchedCount}`,
    )

    console.log(
      'Station catalogue import completed.',
    )
  }
} catch (error) {
  console.error(
    'Station catalogue import failed:',
    error.message,
  )

  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}