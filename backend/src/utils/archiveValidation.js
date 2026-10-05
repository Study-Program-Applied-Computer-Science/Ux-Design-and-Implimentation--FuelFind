export function isValidArchiveDate(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value.startsWith('0000-')
  ) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
}

export function parseArchiveTimestamp(value, expectedDate) {
  if (!isValidArchiveDate(expectedDate)) {
    throw new Error('Invalid archive calendar date')
  }

  if (typeof value !== 'string') {
    throw new Error('Invalid archive timestamp')
  }

  // Accept offsets such as +02, +0200 and +02:00.
  const match = value.match(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):(\d{2})([+-])(\d{2})(?::?(\d{2}))?$/,
  )

  if (!match) {
    throw new Error('Invalid archive timestamp format')
  }

  const [
    ,
    day,
    hourText,
    minuteText,
    secondText,
    sign,
    offsetHourText,
    offsetMinuteText = '00',
  ] = match

  if (!isValidArchiveDate(day) || day !== expectedDate) {
    throw new Error(
      'Timestamp does not match a valid selected archive day',
    )
  }

  const hour = Number(hourText)
  const minute = Number(minuteText)
  const second = Number(secondText)
  const offsetHour = Number(offsetHourText)
  const offsetMinute = Number(offsetMinuteText)

  // Reject rollover times such as 24:00:00.
  if (hour > 23 || minute > 59 || second > 59) {
    throw new Error('Invalid archive clock time')
  }

  // Supported numeric offsets range from -14:00 to +14:00.
  if (
    offsetHour > 14 ||
    offsetMinute > 59 ||
    (offsetHour === 14 && offsetMinute !== 0)
  ) {
    throw new Error('Invalid archive timezone offset')
  }

  const iso =
    `${day}T${hourText}:${minuteText}:${secondText}` +
    `${sign}${offsetHourText}:${offsetMinuteText}`

  const timestamp = new Date(iso)

  if (!Number.isFinite(timestamp.getTime())) {
    throw new Error('Invalid archive timestamp')
  }

  return timestamp
}