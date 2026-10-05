import { readFile } from 'node:fs/promises'
import { parse } from 'csv-parse/sync'
import proj4 from 'proj4'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'

proj4.defs(
  'EPSG:25832',
  '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs +type=crs',
)

function getDistrictName(feature) {
  const number = String(feature?.properties?.NUMMER ?? '').trim()
  const rawName = String(feature?.properties?.NAME ?? '').trim()

  // The downloaded source contains a broken encoding for Südstadt.
  // Use its official district identifier to normalize the display name.
  if (number === '08221000050000') {
    return 'Südstadt'
  }

  if (!rawName) {
    throw new Error(`District ${number || '(unknown)'} has no NAME`)
  }

  return rawName
}

try {
  const [stationFile, districtFile] = process.argv.slice(2)

  if (!stationFile || !districtFile) {
    throw new Error(
      'Usage: node src/scripts/verifyStationDistricts.js "STATION_CSV" "DISTRICT_GEOJSON"',
    )
  }

  const [stationText, districtText] = await Promise.all([
    readFile(stationFile, 'utf8'),
    readFile(districtFile, 'utf8'),
  ])

  const stations = parse(stationText, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
  })

  const geo = JSON.parse(districtText)

  if (geo.type !== 'FeatureCollection' || !Array.isArray(geo.features)) {
    throw new Error('District file is not a valid GeoJSON FeatureCollection')
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

  const results = []
  const unmatched = []
  const ambiguous = []

  for (const station of stations) {
    const latitude = Number(station.latitude)
    const longitude = Number(station.longitude)

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new Error(
        `Invalid coordinates for station ${station.uuid}`,
      )
    }

    // Station CSV uses normal GPS coordinates.
    // proj4 expects [longitude, latitude].
    const projectedPoint = proj4(
      'EPSG:4326',
      'EPSG:25832',
      [longitude, latitude],
    )

    const matches = geo.features.filter((district) =>
      booleanPointInPolygon(projectedPoint, district),
    )

    if (matches.length === 0) {
      unmatched.push({
        uuid: station.uuid,
        name: station.name,
        latitude,
        longitude,
      })

      continue
    }

    if (matches.length > 1) {
      ambiguous.push({
        uuid: station.uuid,
        name: station.name,
        matches: matches.map(getDistrictName).join(', '),
      })

      continue
    }

    const district = matches[0]

    results.push({
      uuid: station.uuid,
      brand: station.brand || '(no brand)',
      name: station.name,
      postCode: station.post_code,
      district: getDistrictName(district),
      districtNumber: district.properties.NUMMER,
    })
  }

  results.sort(
    (a, b) =>
      a.district.localeCompare(b.district, 'de') ||
      a.name.localeCompare(b.name, 'de'),
  )

  console.log('')
  console.log('Verified Heidelberg station districts:')
  console.table(results)

  console.log('')
  console.log(`Stations read: ${stations.length}`)
  console.log(`Mapped stations: ${results.length}`)
  console.log(`Unmatched stations: ${unmatched.length}`)
  console.log(`Ambiguous stations: ${ambiguous.length}`)

  if (unmatched.length > 0) {
    console.log('')
    console.log('Unmatched stations:')
    console.table(unmatched)
  }

  if (ambiguous.length > 0) {
    console.log('')
    console.log('Ambiguous stations:')
    console.table(ambiguous)
  }

  if (unmatched.length > 0 || ambiguous.length > 0) {
    process.exitCode = 1
  } else {
    console.log('')
    console.log(
      'PASS: every station matched exactly one Heidelberg district.',
    )
  }
} catch (error) {
  console.error('District verification failed:', error.message)
  process.exitCode = 1
}