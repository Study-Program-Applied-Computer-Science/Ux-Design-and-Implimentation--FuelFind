import {
  computed,
  ref,
} from 'vue'

import {
  defineStore,
} from 'pinia'

import {
  ApiError,
  fetchCityPrices,
} from '@/services/api'

import {
  useStationStore,
} from '@/stores/stationStore'

const VALID_FUELS = [
  'e5',
  'e10',
  'diesel',
]

const VALID_RANKING_MODES = [
  'cheapest',
  'highest',
]

function validPrice(
  value,
) {
  return (
    typeof value ===
      'number' &&
    Number.isFinite(
      value,
    ) &&
    value > 0
  )
}

function roundPrice(
  value,
) {
  return Number(
    value.toFixed(3),
  )
}

export const useCityPriceStore =
  defineStore(
    'cityPrices',
    () => {
      const stationStore =
        useStationStore()

      const selectedFuel =
        ref('e10')

      const stations =
        ref([])

      const loading =
        ref(false)

      const loaded =
        ref(false)

      const errorMessage =
        ref('')

      const city =
        ref('Heidelberg')

      const retrievedAt =
        ref(null)

      const nextRequestAt =
        ref(null)

      const source =
        ref(null)

      const availablePrices =
        ref({
          e5: 0,
          e10: 0,
          diesel: 0,
        })

      // Local city-dashboard controls.
      const rankingMode =
        ref('cheapest')

      const openOnly =
        ref(false)

      const stationQuery =
        ref('')

      const selectedStationId =
        ref(null)

      const fuelStations =
        computed(() =>
          stations.value.map(
            (station) => {
              const value =
                station.prices?.[
                  selectedFuel.value
                ]

              return {
                ...station,

                currentPrice:
                  validPrice(
                    value,
                  )
                    ? value
                    : null,
              }
            },
          ),
        )

      const pricedStations =
        computed(() =>
          fuelStations.value.filter(
            (station) =>
              station.currentPrice !==
              null,
          ),
        )

      const priceValues =
        computed(() =>
          pricedStations.value
            .map(
              (station) =>
                station.currentPrice,
            )
            .sort(
              (
                first,
                second,
              ) =>
                first -
                second,
            ),
        )

      const coverageCount =
        computed(
          () =>
            pricedStations.value
              .length,
        )

      const cheapestPrice =
        computed(() =>
          priceValues.value
            .length > 0
            ? priceValues
                .value[0]
            : null,
        )

      const highestPrice =
        computed(() => {
          if (
            priceValues.value
              .length === 0
          ) {
            return null
          }

          return priceValues.value[
            priceValues.value
              .length - 1
          ]
        })

      const averagePrice =
        computed(() => {
          if (
            priceValues.value
              .length === 0
          ) {
            return null
          }

          const total =
            priceValues.value.reduce(
              (
                sum,
                price,
              ) =>
                sum + price,
              0,
            )

          return roundPrice(
            total /
              priceValues.value
                .length,
          )
        })

      const medianPrice =
        computed(() => {
          const values =
            priceValues.value

          if (
            values.length === 0
          ) {
            return null
          }

          const middle =
            Math.floor(
              values.length / 2,
            )

          if (
            values.length % 2 ===
            1
          ) {
            return values[
              middle
            ]
          }

          return roundPrice(
            (
              values[
                middle - 1
              ] +
              values[middle]
            ) /
              2,
          )
        })

      const cheapestStations =
        computed(() => {
          if (
            cheapestPrice.value ===
            null
          ) {
            return []
          }

          return pricedStations.value.filter(
            (station) =>
              Math.abs(
                station.currentPrice -
                  cheapestPrice.value,
              ) <
              0.0005,
          )
        })

      const highestStations =
        computed(() => {
          if (
            highestPrice.value ===
            null
          ) {
            return []
          }

          return pricedStations.value.filter(
            (station) =>
              Math.abs(
                station.currentPrice -
                  highestPrice.value,
              ) <
              0.0005,
          )
        })

      const rankedStations =
        computed(() => {
          const query =
            stationQuery.value
              .trim()
              .toLowerCase()

          let results =
            fuelStations.value.filter(
              (station) => {
                if (
                  openOnly.value &&
                  station.isOpen !==
                    true
                ) {
                  return false
                }

                if (!query) {
                  return true
                }

                const searchable =
                  [
                    station.name,
                    station.brand,
                    station.districtName,
                    station.street,
                  ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()

                return searchable.includes(
                  query,
                )
              },
            )

          results.sort(
            (
              first,
              second,
            ) => {
              const firstPrice =
                first.currentPrice ??
                Infinity

              const secondPrice =
                second.currentPrice ??
                Infinity

              if (
                rankingMode.value ===
                'highest'
              ) {
                if (
                  first.currentPrice ===
                  null &&
                  second.currentPrice !==
                    null
                ) {
                  return 1
                }

                if (
                  first.currentPrice !==
                    null &&
                  second.currentPrice ===
                    null
                ) {
                  return -1
                }

                if (
                  firstPrice !==
                  secondPrice
                ) {
                  return (
                    secondPrice -
                    firstPrice
                  )
                }
              } else {
                if (
                  firstPrice !==
                  secondPrice
                ) {
                  return (
                    firstPrice -
                    secondPrice
                  )
                }
              }

              return String(
                first.name ?? '',
              ).localeCompare(
                String(
                  second.name ?? '',
                ),
              )
            },
          )

          return results
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

      function setFuel(
        value,
      ) {
        if (
          VALID_FUELS.includes(
            value,
          )
        ) {
          selectedFuel.value =
            value
        }
      }

      function setRankingMode(
        value,
      ) {
        if (
          VALID_RANKING_MODES.includes(
            value,
          )
        ) {
          rankingMode.value =
            value
        }
      }

      function setOpenOnly(
        value,
      ) {
        openOnly.value =
          Boolean(value)
      }

      function setStationQuery(
        value,
      ) {
        stationQuery.value =
          String(value ?? '')
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

      function syncCooldown(
        value,
      ) {
        if (!value) {
          return
        }

        nextRequestAt.value =
          value

        stationStore.nextRequestAt =
          value
      }

      async function loadPrices() {
        if (
          loading.value
        ) {
          return false
        }

        loading.value =
          true

        errorMessage.value =
          ''

        try {
          const data =
            await fetchCityPrices()

          stations.value =
            Array.isArray(
              data.stations,
            )
              ? data.stations
              : []

          city.value =
            data.city ??
            'Heidelberg'

          retrievedAt.value =
            data.retrievedAt ??
            null

          source.value =
            data.source ??
            null

          availablePrices.value =
            {
              e5:
                data
                  .availablePrices
                  ?.e5 ??
                0,

              e10:
                data
                  .availablePrices
                  ?.e10 ??
                0,

              diesel:
                data
                  .availablePrices
                  ?.diesel ??
                0,
            }

          syncCooldown(
            data.nextRequestAt,
          )

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

          loaded.value =
            true

          return true
        } catch (error) {
          if (
            error instanceof
            ApiError
          ) {
            errorMessage.value =
              error.message

            syncCooldown(
              error.nextRequestAt,
            )
          } else {
            errorMessage.value =
              'Something went wrong while loading Heidelberg prices.'
          }

          return false
        } finally {
          loading.value =
            false
        }
      }

      return {
        selectedFuel,

        stations,
        fuelStations,
        pricedStations,
        rankedStations,

        loading,
        loaded,
        errorMessage,

        city,
        retrievedAt,
        nextRequestAt,
        source,

        availablePrices,
        coverageCount,

        cheapestPrice,
        highestPrice,
        averagePrice,
        medianPrice,

        cheapestStations,
        highestStations,

        rankingMode,
        openOnly,
        stationQuery,

        selectedStationId,
        selectedStation,

        setFuel,
        setRankingMode,
        setOpenOnly,
        setStationQuery,
        selectStation,

        loadPrices,
      }
    },
  )
