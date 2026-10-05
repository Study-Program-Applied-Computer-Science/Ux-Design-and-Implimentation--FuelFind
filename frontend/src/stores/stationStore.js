import {
  computed,
  ref,
} from 'vue'

import {
  defineStore,
} from 'pinia'

import {
  ApiError,
  fetchStationSearch,
} from '@/services/api'

const VALID_FUELS = [
  'e5',
  'e10',
  'diesel',
]

const VALID_RADII = [
  2,
  5,
  10,
]

const VALID_SORT_MODES = [
  'cheapest',
  'nearest',
]

function validPrice(value) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  )
}

function validDistance(value) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
  )
}

export const useStationStore =
  defineStore(
    'stations',
    () => {
      // Current search-form controls.
      const fuel =
        ref('e10')

      const radius =
        ref(5)

      const locationMode =
        ref('heidelberg')

      const coordinates =
        ref(null)

      const locationState =
        ref('idle')

      const locationMessage =
        ref(
          'Using Heidelberg as the search centre.',
        )

      // Loaded search results.
      const stations =
        ref([])

      const loading =
        ref(false)

      const errorMessage =
        ref('')

      const lastSearch =
        ref(null)

      const retrievedAt =
        ref(null)

      const nextRequestAt =
        ref(null)

      const source =
        ref(null)

      // Local result controls.
      const sortMode =
        ref('cheapest')

      const openOnly =
        ref(false)

      // Map/card selection.
      const selectedStationId =
        ref(null)

      // Station comparison selection.
      // This is deliberately separate from map/card selection.
      const comparisonStationIds =
        ref([])

      const stationCount =
        computed(
          () =>
            stations.value.length,
        )

      const availablePriceCount =
        computed(
          () =>
            stations.value.filter(
              (station) =>
                validPrice(
                  station.price,
                ),
            ).length,
        )

      const openStationCount =
        computed(
          () =>
            stations.value.filter(
              (station) =>
                station.isOpen ===
                true,
            ).length,
        )

      // IMPORTANT:
      // This is the fuel that belongs to the loaded data,
      // not necessarily the value currently selected in
      // the search form.
      const resultFuel =
        computed(
          () =>
            lastSearch.value
              ?.fuel ??
            null,
        )

      const resultRadius =
        computed(
          () =>
            lastSearch.value
              ?.radiusKm ??
            null,
        )

      const resultCoordinates =
        computed(() => {
          const location =
            lastSearch.value
              ?.location

          if (
            location?.mode !==
              'coordinates' ||
            !Number.isFinite(
              location.lat,
            ) ||
            !Number.isFinite(
              location.lng,
            )
          ) {
            return null
          }

          return {
            lat:
              location.lat,

            lng:
              location.lng,
          }
        })

      const selectedStation =
        computed(
          () =>
            stations.value.find(
              (station) =>
                station.id ===
                selectedStationId.value,
            ) ?? null,
        )

      const comparisonStations =
        computed(() =>
          comparisonStationIds.value
            .map((stationId) =>
              stations.value.find(
                (station) =>
                  station.id ===
                  stationId,
              ),
            )
            .filter(Boolean),
        )

      const comparisonCount =
        computed(
          () =>
            comparisonStationIds.value
              .length,
        )

      const visibleStations =
        computed(() => {
          let results =
            [...stations.value]

          if (openOnly.value) {
            results =
              results.filter(
                (station) =>
                  station.isOpen ===
                  true,
              )
          }

          results.sort(
            (
              first,
              second,
            ) => {
              if (
                sortMode.value ===
                'nearest'
              ) {
                const firstDistance =
                  validDistance(
                    first.distanceKm,
                  )
                    ? first.distanceKm
                    : Infinity

                const secondDistance =
                  validDistance(
                    second.distanceKm,
                  )
                    ? second.distanceKm
                    : Infinity

                if (
                  firstDistance !==
                  secondDistance
                ) {
                  return (
                    firstDistance -
                    secondDistance
                  )
                }

                const firstPrice =
                  validPrice(
                    first.price,
                  )
                    ? first.price
                    : Infinity

                const secondPrice =
                  validPrice(
                    second.price,
                  )
                    ? second.price
                    : Infinity

                return (
                  firstPrice -
                  secondPrice
                )
              }

              const firstPrice =
                validPrice(
                  first.price,
                )
                  ? first.price
                  : Infinity

              const secondPrice =
                validPrice(
                  second.price,
                )
                  ? second.price
                  : Infinity

              if (
                firstPrice !==
                secondPrice
              ) {
                return (
                  firstPrice -
                  secondPrice
                )
              }

              const firstDistance =
                validDistance(
                  first.distanceKm,
                )
                  ? first.distanceKm
                  : Infinity

              const secondDistance =
                validDistance(
                  second.distanceKm,
                )
                  ? second.distanceKm
                  : Infinity

              return (
                firstDistance -
                secondDistance
              )
            },
          )

          return results
        })

      function setFuel(value) {
        if (
          VALID_FUELS.includes(
            value,
          )
        ) {
          fuel.value = value
        }
      }

      function setRadius(value) {
        if (
          VALID_RADII.includes(
            value,
          )
        ) {
          radius.value = value
        }
      }

      function setSortMode(value) {
        if (
          VALID_SORT_MODES.includes(
            value,
          )
        ) {
          sortMode.value = value
        }
      }

      function setOpenOnly(value) {
        openOnly.value =
          Boolean(value)

        if (
          openOnly.value &&
          selectedStation.value &&
          selectedStation.value
            .isOpen !== true
        ) {
          selectedStationId.value =
            null
        }
      }

      function selectStation(
        stationId,
      ) {
        const exists =
          stations.value.some(
            (station) =>
              station.id ===
              stationId,
          )

        if (exists) {
          selectedStationId.value =
            stationId
        }
      }

      function clearSelectedStation() {
        selectedStationId.value =
          null
      }

      function toggleComparisonStation(
        stationId,
      ) {
        const exists =
          stations.value.some(
            (station) =>
              station.id ===
              stationId,
          )

        if (!exists) {
          return false
        }

        const alreadySelected =
          comparisonStationIds.value.includes(
            stationId,
          )

        if (alreadySelected) {
          comparisonStationIds.value =
            comparisonStationIds.value.filter(
              (id) =>
                id !== stationId,
            )

          return true
        }

        if (
          comparisonStationIds.value
            .length >= 2
        ) {
          return false
        }

        comparisonStationIds.value = [
          ...comparisonStationIds.value,
          stationId,
        ]

        return true
      }

      function clearComparison() {
        comparisonStationIds.value =
          []
      }

      function useHeidelbergLocation() {
        locationMode.value =
          'heidelberg'

        coordinates.value =
          null

        locationState.value =
          'idle'

        locationMessage.value =
          'Using Heidelberg as the search centre.'

        errorMessage.value =
          ''
      }

      async function useCurrentLocation() {
        errorMessage.value =
          ''

        if (
          !navigator.geolocation
        ) {
          locationState.value =
            'error'

          locationMessage.value =
            'This browser does not support location access.'

          return false
        }

        locationState.value =
          'loading'

        locationMessage.value =
          'Requesting your location…'

        return new Promise(
          (resolve) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const lat =
                  position.coords
                    .latitude

                const lng =
                  position.coords
                    .longitude

                if (
                  !Number.isFinite(
                    lat,
                  ) ||
                  !Number.isFinite(
                    lng,
                  )
                ) {
                  locationState.value =
                    'error'

                  locationMessage.value =
                    'Your browser returned an invalid location.'

                  resolve(false)
                  return
                }

                coordinates.value = {
                  lat,
                  lng,
                }

                locationMode.value =
                  'current'

                locationState.value =
                  'ready'

                locationMessage.value =
                  'Current location selected.'

                resolve(true)
              },

              (error) => {
                locationState.value =
                  'error'

                if (
                  error.code === 1
                ) {
                  locationMessage.value =
                    'Location permission was denied.'
                } else if (
                  error.code === 2
                ) {
                  locationMessage.value =
                    'Your location is currently unavailable.'
                } else {
                  locationMessage.value =
                    'Location request timed out.'
                }

                resolve(false)
              },

              {
                enableHighAccuracy:
                  true,

                timeout:
                  10_000,

                maximumAge:
                  60_000,
              },
            )
          },
        )
      }

      async function searchStations() {
        if (loading.value) {
          return false
        }

        errorMessage.value =
          ''

        if (
          locationMode.value ===
            'current' &&
          !coordinates.value
        ) {
          const locationReady =
            await useCurrentLocation()

          if (!locationReady) {
            return false
          }
        }

        loading.value =
          true

        try {
          const data =
            await fetchStationSearch(
              {
                fuel:
                  fuel.value,

                radius:
                  radius.value,

                coordinates:
                  locationMode.value ===
                    'current'
                    ? coordinates.value
                    : null,
              },
            )

          stations.value =
            Array.isArray(
              data.stations,
            )
              ? data.stations
              : []

          retrievedAt.value =
            data.retrievedAt ??
            null

          nextRequestAt.value =
            data.nextRequestAt ??
            null

          source.value =
            data.source ??
            null

          lastSearch.value = {
            fuel:
              data.fuel,

            radiusKm:
              data.radiusKm,

            location:
              data.location,

            count:
              data.count,
          }

          // Keep a selected station only if it exists
          // in the newly loaded result set.
          if (
            selectedStationId.value &&
            !stations.value.some(
              (station) =>
                station.id ===
                selectedStationId.value,
            )
          ) {
            selectedStationId.value =
              null
          }

          // Keep comparison selections only when the
          // stations still exist in the new result set.
          comparisonStationIds.value =
            comparisonStationIds.value.filter(
              (stationId) =>
                stations.value.some(
                  (station) =>
                    station.id ===
                    stationId,
                ),
            )

          return true
        } catch (error) {
          if (
            error instanceof
            ApiError
          ) {
            errorMessage.value =
              error.message

            if (
              error.nextRequestAt
            ) {
              nextRequestAt.value =
                error.nextRequestAt
            }
          } else {
            errorMessage.value =
              'Something went wrong while searching for stations.'
          }

          return false
        } finally {
          loading.value =
            false
        }
      }

      return {
        fuel,
        radius,

        locationMode,
        coordinates,
        locationState,
        locationMessage,

        stations,
        stationCount,
        availablePriceCount,
        openStationCount,
        visibleStations,

        resultFuel,
        resultRadius,
        resultCoordinates,

        sortMode,
        openOnly,

        selectedStationId,
        selectedStation,

        comparisonStationIds,
        comparisonStations,
        comparisonCount,

        loading,
        errorMessage,

        lastSearch,
        retrievedAt,
        nextRequestAt,
        source,

        setFuel,
        setRadius,
        setSortMode,
        setOpenOnly,

        selectStation,
        clearSelectedStation,

        toggleComparisonStation,
        clearComparison,

        useHeidelbergLocation,
        useCurrentLocation,

        searchStations,
      }
    },
  )
