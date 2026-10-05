const DAYS = [
  { bit: 1, short: 'Mon' },
  { bit: 2, short: 'Tue' },
  { bit: 4, short: 'Wed' },
  { bit: 8, short: 'Thu' },
  { bit: 16, short: 'Fri' },
  { bit: 32, short: 'Sat' },
  { bit: 64, short: 'Sun' },
]

const PUBLIC_HOLIDAY_BIT = 128

function getDayIndexes(mask) {
  return DAYS
    .map((day, index) => ({
      ...day,
      index,
    }))
    .filter((day) => (mask & day.bit) === day.bit)
}

function createDayRanges(dayIndexes) {
  if (dayIndexes.length === 0) {
    return []
  }

  const ranges = []

  let start = dayIndexes[0]
  let previous = dayIndexes[0]

  for (let index = 1; index < dayIndexes.length; index += 1) {
    const current = dayIndexes[index]

    if (current.index === previous.index + 1) {
      previous = current
      continue
    }

    ranges.push({
      start,
      end: previous,
    })

    start = current
    previous = current
  }

  ranges.push({
    start,
    end: previous,
  })

  return ranges
}

function formatRange(range) {
  if (range.start.index === range.end.index) {
    return range.start.short
  }

  return `${range.start.short}–${range.end.short}`
}

export function formatApplicableDays(mask) {
  if (!Number.isInteger(mask) || mask <= 0) {
    return 'Unknown'
  }

  const regularDays = getDayIndexes(mask)

  const labels = createDayRanges(regularDays).map(formatRange)

  if ((mask & PUBLIC_HOLIDAY_BIT) === PUBLIC_HOLIDAY_BIT) {
    labels.push('Public holidays')
  }

  return labels.join(', ')
}

function formatPeriods(periods) {
  if (!Array.isArray(periods)) {
    return ''
  }

  return periods
    .filter(
      (period) =>
        typeof period?.startp === 'string' &&
        typeof period?.endp === 'string',
    )
    .map((period) => `${period.startp}–${period.endp}`)
    .join(', ')
}

function getSortPosition(mask) {
  const regularDays = getDayIndexes(mask)

  if (regularDays.length > 0) {
    return regularDays[0].index
  }

  if ((mask & PUBLIC_HOLIDAY_BIT) === PUBLIC_HOLIDAY_BIT) {
    return 7
  }

  return 99
}

export function getOpeningHoursRows(openingTimesData) {
  const entries = openingTimesData?.openingTimes

  if (!Array.isArray(entries) || entries.length === 0) {
    return []
  }

  return entries
    .map((entry) => {
      const mask = Number(entry?.applicable_days)

      return {
        days: formatApplicableDays(mask),
        hours: formatPeriods(entry?.periods),
        sortPosition: getSortPosition(mask),
      }
    })
    .filter(
      (row) =>
        row.days !== 'Unknown' &&
        row.hours.length > 0,
    )
    .sort(
      (first, second) =>
        first.sortPosition - second.sortPosition,
    )
    .map(({ days, hours }) => ({
      days,
      hours,
    }))
}
