import {
  computed,
  ref,
} from 'vue'

import {
  defineStore,
} from 'pinia'

import {
  ApiError,
  fetchStationCatalogue,
  fetchStationDetails,
} from '@/services/api'

import {
  useStationStore,
} from '@/stores/stationStore'

const STATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function normalizeStationId(
  value,
) {
  return String(
    value ?? '',
  )
    .trim()
    .toLowerCase()
}

function normalizeCatalogueStation(
  station,
) {
  const id =
    normalizeStationId(
      station?.stationId ??
      station?.id,
    )

  return {
    ...station,
    id,
  }
}

function validTimestamp(
  value,
) {
  const timestamp =
    Date.parse(
      value ?? '',
    )

  return Number.isFinite(
    timestamp,
  )
    ? timestamp
    : null
}

export const useStationDetailStore =
  defineStore(
    'stationDetails',
    () => {
      const stationStore =
        useStationStore()

      const catalogue =
        ref([])

      const catalogueLoaded =
        ref(false)

      const catalogueLoading =
        ref(false)

      const liveLoading =
        ref(false)

      const currentStationId =
        ref(null)

      const catalogueStation =
        ref(null)

      const liveStation =
        ref(null)

      const pageErrorMessage =
        ref('')

      const liveErrorMessage =
        ref('')

      const retrievedAt =
        ref(null)

      const nextRequestAt =
        ref(null)

      const source =
        ref(null)

      const license =
        ref(null)

      const detailsCache =
        ref({})

      const metadataCache =
        ref({})

      const hasLiveDetails =
        computed(
          () =>
            liveStation.value !==
            null,
        )

      const displayStation =
        computed(
          () =>
            liveStation.value ??
            catalogueStation.value,
        )

      const sharedNextRequestAt =
        computed(() => {
          const candidates = [
            nextRequestAt.value,
            stationStore.nextRequestAt,
          ]
            .map(
              validTimestamp,
            )
            .filter(
              (value) =>
                value !== null,
            )

          if (
            candidates.length === 0
          ) {
            return null
          }

          return new Date(
            Math.max(
              ...candidates,
            ),
          ).toISOString()
        })

      function syncCooldown(
        value,
      ) {
        if (
          validTimestamp(
            value,
          ) === null
        ) {
          return
        }

        nextRequestAt.value =
          value

        // All Tankerkönig-backed frontend features
        // share the same upstream request allowance.
        stationStore.nextRequestAt =
          value
      }

      function hydrateCachedDetails(
        stationId,
      ) {
        const cached =
          detailsCache.value[
            stationId
          ]

        const metadata =
          metadataCache.value[
            stationId
          ]

        if (!cached) {
          return false
        }

        liveStation.value =
          cached

        retrievedAt.value =
          metadata?.retrievedAt ??
          null

        source.value =
          metadata?.source ??
          null

        license.value =
          metadata?.license ??
          null

        if (
          metadata?.nextRequestAt
        ) {
          syncCooldown(
            metadata.nextRequestAt,
          )
        }

        return true
      }

      async function ensureCatalogue() {
        if (
          catalogueLoaded.value
        ) {
          return true
        }

        if (
          catalogueLoading.value
        ) {
          return false
        }

        catalogueLoading.value =
          true

        pageErrorMessage.value =
          ''

        try {
          const data =
            await fetchStationCatalogue()

          catalogue.value =
            Array.isArray(
              data.stations,
            )
              ? data.stations
                  .map(
                    normalizeCatalogueStation,
                  )
                  .filter(
                    (station) =>
                      station.id,
                  )
              : []

          catalogueLoaded.value =
            true

          return true
        } catch (error) {
          if (
            error instanceof
            ApiError
          ) {
            pageErrorMessage.value =
              error.message
          } else {
            pageErrorMessage.value =
              'Could not load the verified station catalogue.'
          }

          return false
        } finally {
          catalogueLoading.value =
            false
        }
      }

      async function prepareStation(
        stationId,
      ) {
        const normalizedId =
          normalizeStationId(
            stationId,
          )

        currentStationId.value =
          normalizedId

        catalogueStation.value =
          null

        liveStation.value =
          null

        retrievedAt.value =
          null

        source.value =
          null

        license.value =
          null

        pageErrorMessage.value =
          ''

        liveErrorMessage.value =
          ''

        if (
          !STATION_ID_PATTERN.test(
            normalizedId,
          )
        ) {
          pageErrorMessage.value =
            'Provide a valid station ID.'

          return false
        }

        const catalogueReady =
          await ensureCatalogue()

        if (!catalogueReady) {
          return false
        }

        const station =
          catalogue.value.find(
            (item) =>
              item.id ===
              normalizedId,
          )

        if (!station) {
          pageErrorMessage.value =
            'Station is not in the verified Heidelberg catalogue.'

          return false
        }

        catalogueStation.value =
          station

        hydrateCachedDetails(
          normalizedId,
        )

        return true
      }

      async function loadLiveDetails({
        force = false,
      } = {}) {
        const stationId =
          currentStationId.value

        if (
          !stationId ||
          !catalogueStation.value ||
          liveLoading.value
        ) {
          return false
        }

        liveErrorMessage.value =
          ''

        if (
          !force &&
          hydrateCachedDetails(
            stationId,
          )
        ) {
          return true
        }

        liveLoading.value =
          true

        try {
          const data =
            await fetchStationDetails(
              stationId,
            )

          if (
            !data.station ||
            typeof data.station !==
              'object'
          ) {
            throw new ApiError(
              'FuelFind received invalid station detail data.',
            )
          }

          liveStation.value =
            data.station

          retrievedAt.value =
            data.retrievedAt ??
            null

          source.value =
            data.source ??
            null

          license.value =
            data.license ??
            null

          syncCooldown(
            data.nextRequestAt,
          )

          detailsCache.value = {
            ...detailsCache.value,

            [stationId]:
              data.station,
          }

          metadataCache.value = {
            ...metadataCache.value,

            [stationId]: {
              retrievedAt:
                data.retrievedAt ??
                null,

              nextRequestAt:
                data.nextRequestAt ??
                null,

              source:
                data.source ??
                null,

              license:
                data.license ??
                null,
            },
          }

          return true
        } catch (error) {
          if (
            error instanceof
            ApiError
          ) {
            liveErrorMessage.value =
              error.message

            if (
              error.nextRequestAt
            ) {
              syncCooldown(
                error.nextRequestAt,
              )
            }
          } else {
            liveErrorMessage.value =
              'Something went wrong while loading current station details.'
          }

          return false
        } finally {
          liveLoading.value =
            false
        }
      }

      return {
        catalogueLoading,
        liveLoading,

        currentStationId,
        catalogueStation,
        liveStation,
        displayStation,

        pageErrorMessage,
        liveErrorMessage,

        retrievedAt,
        nextRequestAt,
        sharedNextRequestAt,
        source,
        license,

        hasLiveDetails,

        prepareStation,
        loadLiveDetails,
      }
    },
  )
