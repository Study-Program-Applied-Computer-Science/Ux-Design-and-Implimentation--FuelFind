export class ApiError extends Error {
  constructor(
    message,
    {
      status = 0,
      code = null,
      retryAfterSeconds = null,
      nextRequestAt = null,
    } = {},
  ) {
    super(message)

    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.retryAfterSeconds =
      retryAfterSeconds
    this.nextRequestAt =
      nextRequestAt
  }
}

async function requestJson(
  url,
  {
    timeoutMs = 12_000,
    fallbackMessage =
      'FuelFind could not complete the request.',
  } = {},
) {
  let response

  try {
    response = await fetch(
      url,
      {
        headers: {
          Accept:
            'application/json',
        },

        signal:
          AbortSignal.timeout(
            timeoutMs,
          ),
      },
    )
  } catch (error) {
    if (
      error?.name ===
        'TimeoutError' ||
      error?.name ===
        'AbortError'
    ) {
      throw new ApiError(
        'The request took too long. Please try again.',
      )
    }

    throw new ApiError(
      'Could not reach the FuelFind backend.',
    )
  }

  let data

  try {
    data =
      await response.json()
  } catch {
    throw new ApiError(
      'FuelFind received an invalid server response.',
      {
        status:
          response.status,
      },
    )
  }

  if (
    !response.ok ||
    data?.success !== true
  ) {
    throw new ApiError(
      data?.message ??
        fallbackMessage,
      {
        status:
          response.status,

        code:
          data?.code ??
          null,

        retryAfterSeconds:
          data?.retryAfterSeconds ??
          null,

        nextRequestAt:
          data?.nextRequestAt ??
          null,
      },
    )
  }

  return data
}

export async function fetchStationSearch({
  fuel,
  radius,
  coordinates = null,
}) {
  const parameters =
    new URLSearchParams({
      fuel,
      radius:
        String(radius),
    })

  if (coordinates) {
    parameters.set(
      'lat',
      String(
        coordinates.lat,
      ),
    )

    parameters.set(
      'lng',
      String(
        coordinates.lng,
      ),
    )
  }

  return requestJson(
    `/api/stations?${parameters.toString()}`,
    {
      fallbackMessage:
        'Could not load fuel stations.',
    },
  )
}

export async function fetchCityPrices() {
  return requestJson(
    '/api/stations/prices',
    {
      fallbackMessage:
        'Could not load Heidelberg fuel prices.',
    },
  )
}

export async function fetchStationCatalogue() {
  return requestJson(
    '/api/stations/catalogue',
    {
      fallbackMessage:
        'Could not load the verified Heidelberg station catalogue.',
    },
  )
}

export async function fetchStationDetails(
  stationId,
) {
  return requestJson(
    `/api/stations/${encodeURIComponent(stationId)}`,
    {
      timeoutMs:
        16_000,

      fallbackMessage:
        'Could not load current station details.',
    },
  )
}
