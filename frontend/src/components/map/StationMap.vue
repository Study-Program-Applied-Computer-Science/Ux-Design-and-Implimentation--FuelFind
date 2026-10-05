<script setup>
import {
  computed,
  nextTick,
  shallowRef,
  watch,
} from 'vue'

import {
  MapPin,
} from 'lucide-vue-next'

import {
  LCircleMarker,
  LMap,
  LPopup,
  LTileLayer,
  LTooltip,
} from '@vue-leaflet/vue-leaflet'

const props = defineProps({
  stations: {
    type: Array,
    required: true,
  },

  fuel: {
    type: String,
    required: true,
  },

  selectedStationId: {
    type: String,
    default: null,
  },

  searchCoordinates: {
    type: Object,
    default: null,
  },

  // Find Stations needs distance because it has a
  // meaningful search origin.
  //
  // Heidelberg Prices disables it because there is
  // no user-selected origin on that page.
  showDistance: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits([
  'select',
])

const mapObject =
  shallowRef(null)

const zoom =
  shallowRef(13)

const HEIDELBERG = [
  49.3988,
  8.6724,
]

const tileUrl =
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

const tileAttribution =
  '&copy; OpenStreetMap contributors'

function validStationPoint(
  station,
) {
  return (
    station &&
    Number.isFinite(
      station.lat,
    ) &&
    Number.isFinite(
      station.lng,
    )
  )
}

const mapStations =
  computed(() =>
    props.stations.filter(
      validStationPoint,
    ),
  )

const selectedStation =
  computed(
    () =>
      mapStations.value.find(
        (station) =>
          station.id ===
          props.selectedStationId,
      ) ?? null,
  )

function markerColor() {
  if (
    props.fuel === 'e5'
  ) {
    return '#2563eb'
  }

  if (
    props.fuel === 'diesel'
  ) {
    return '#d97706'
  }

  return '#0d9488'
}

function selectedRingColor() {
  if (
    props.fuel === 'e5'
  ) {
    return '#1d4ed8'
  }

  if (
    props.fuel === 'diesel'
  ) {
    return '#b45309'
  }

  return '#0e7490'
}

function formatPrice(
  price,
) {
  if (
    typeof price !==
      'number' ||
    !Number.isFinite(
      price,
    ) ||
    price <= 0
  ) {
    return 'N/A'
  }

  return `€${price.toFixed(3)}`
}

function formatDistance(
  distance,
) {
  if (
    typeof distance !==
      'number' ||
    !Number.isFinite(
      distance,
    )
  ) {
    return 'Distance unavailable'
  }

  return `${distance.toFixed(1)} km`
}

function statusText(
  station,
) {
  if (
    station.isOpen === true
  ) {
    return 'Open now'
  }

  if (
    station.isOpen === false
  ) {
    return 'Closed'
  }

  return 'Status unavailable'
}

function fitMap() {
  const map =
    mapObject.value

  if (!map) {
    return
  }

  const points =
    mapStations.value.map(
      (station) => [
        station.lat,
        station.lng,
      ],
    )

  if (
    props.searchCoordinates &&
    Number.isFinite(
      props.searchCoordinates.lat,
    ) &&
    Number.isFinite(
      props.searchCoordinates.lng,
    )
  ) {
    points.push([
      props.searchCoordinates.lat,
      props.searchCoordinates.lng,
    ])
  }

  map.invalidateSize()

  if (
    points.length === 0
  ) {
    map.setView(
      HEIDELBERG,
      12,
    )

    return
  }

  if (
    points.length === 1
  ) {
    map.setView(
      points[0],
      14,
    )

    return
  }

  map.fitBounds(
    points,
    {
      padding: [
        34,
        34,
      ],

      maxZoom: 14,
    },
  )
}

function handleMapReady(
  map,
) {
  mapObject.value =
    map

  nextTick(
    fitMap,
  )
}

function selectStation(
  stationId,
) {
  emit(
    'select',
    stationId,
  )
}

watch(
  () =>
    props.stations
      .map(
        (station) =>
          [
            station.id,
            station.lat,
            station.lng,
          ].join(':'),
      )
      .join('|'),

  () => {
    nextTick(
      fitMap,
    )
  },
)

watch(
  () =>
    props.searchCoordinates,

  () => {
    nextTick(
      fitMap,
    )
  },

  {
    deep: true,
  },
)

watch(
  () =>
    props.selectedStationId,

  (stationId) => {
    if (
      !stationId ||
      !mapObject.value
    ) {
      return
    }

    const station =
      mapStations.value.find(
        (item) =>
          item.id ===
          stationId,
      )

    if (!station) {
      return
    }

    mapObject.value.flyTo(
      [
        station.lat,
        station.lng,
      ],
      16,
      {
        animate: true,
        duration: 0.65,
      },
    )
  },
)
</script>

<template>
  <section
    class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    aria-labelledby="station-map-heading"
  >
    <div
      class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800"
    >
      <div>
        <div
          class="flex items-center gap-2"
        >
          <MapPin
            :size="18"
            class="text-cyan-700 dark:text-cyan-400"
            aria-hidden="true"
          />

          <h3
            id="station-map-heading"
            class="font-bold text-slate-950 dark:text-white"
          >
            Station map
          </h3>
        </div>

        <p
          class="mt-1 text-xs text-slate-500 dark:text-slate-400"
        >
          {{ mapStations.length }}
          matching stations
        </p>
      </div>

      <div
        class="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      >
        <span
          class="h-2.5 w-2.5 rounded-full"
          :style="{
            backgroundColor:
              markerColor(),
          }"
        />

        {{ fuel.toUpperCase() }}
        prices
      </div>
    </div>

    <div
      v-if="selectedStation"
      class="border-b border-cyan-100 bg-cyan-50 px-5 py-3 text-sm text-cyan-900 dark:border-cyan-950 dark:bg-cyan-950/30 dark:text-cyan-200"
    >
      Selected:
      <strong>
        {{ selectedStation.name }}
      </strong>
    </div>

    <div
      class="fuelfind-map h-[480px] sm:h-[540px] lg:h-[620px]"
    >
      <LMap
        v-model:zoom="zoom"
        :center="HEIDELBERG"
        :use-global-leaflet="false"
        @ready="handleMapReady"
      >
        <LTileLayer
          :url="tileUrl"
          :attribution="tileAttribution"
          layer-type="base"
          name="OpenStreetMap"
        />

        <!-- Search/current-location marker -->
        <LCircleMarker
          v-if="
            searchCoordinates &&
            Number.isFinite(
              searchCoordinates.lat,
            ) &&
            Number.isFinite(
              searchCoordinates.lng,
            )
          "
          :lat-lng="[
            searchCoordinates.lat,
            searchCoordinates.lng,
          ]"
          :radius="8"
          color="#ffffff"
          fill-color="#0891b2"
          :fill-opacity="1"
          :weight="3"
        >
          <LPopup>
            <strong>
              Search location
            </strong>

            <br />

            Your selected location
          </LPopup>
        </LCircleMarker>

        <!-- Selection ring -->
        <LCircleMarker
          v-if="selectedStation"
          :lat-lng="[
            selectedStation.lat,
            selectedStation.lng,
          ]"
          :radius="18"
          :color="
            selectedRingColor()
          "
          :fill-color="
            selectedRingColor()
          "
          :fill-opacity="0.12"
          :opacity="0.95"
          :weight="4"
          :interactive="false"
        />

        <!-- Station markers -->
        <LCircleMarker
          v-for="
            station in mapStations
          "
          :key="
            `${station.id}-${selectedStationId === station.id}`
          "
          :lat-lng="[
            station.lat,
            station.lng,
          ]"
          :radius="
            selectedStationId ===
            station.id
              ? 11
              : 7
          "
          :color="
            selectedStationId ===
            station.id
              ? '#ffffff'
              : markerColor()
          "
          :fill-color="
            markerColor()
          "
          :fill-opacity="0.95"
          :weight="
            selectedStationId ===
            station.id
              ? 5
              : 2
          "
          @click="
            selectStation(
              station.id,
            )
          "
        >
          <LTooltip
            :options="{
              permanent: true,
              direction: 'top',
              offset: [0, -10],
              opacity: 1,
              className:
                selectedStationId === station.id
                  ? 'fuelfind-price-tooltip fuelfind-price-tooltip-selected'
                  : 'fuelfind-price-tooltip',
            }"
          >
            {{
              formatPrice(
                station.price,
              )
            }}
          </LTooltip>

          <LPopup>
            <div
              class="min-w-[190px]"
            >
              <strong>
                {{ station.name }}
              </strong>

              <div
                style="
                  margin-top: 6px;
                  font-weight: 700;
                "
              >
                {{ fuel.toUpperCase() }}
                {{
                  formatPrice(
                    station.price,
                  )
                }}
              </div>

              <div
                style="
                  margin-top: 4px;
                "
              >
                {{
                  statusText(
                    station,
                  )
                }}
              </div>

              <!--
                Distance appears only in contexts where
                it has a clear reference point.
              -->
              <div
                v-if="showDistance"
                style="
                  margin-top: 4px;
                "
              >
                {{
                  formatDistance(
                    station.distanceKm,
                  )
                }}
              </div>
            </div>
          </LPopup>
        </LCircleMarker>
      </LMap>
    </div>
  </section>
</template>

<style>
.fuelfind-map .leaflet-container {
  height: 100%;
  width: 100%;
  font-family: inherit;
  background: #e2e8f0;
}

.dark .fuelfind-map .leaflet-container {
  background: #0f172a;
}

.fuelfind-price-tooltip {
  border: 0 !important;
  border-radius: 9999px !important;

  background:
    rgba(
      255,
      255,
      255,
      0.96
    ) !important;

  box-shadow:
    0 2px 8px
    rgba(
      15,
      23,
      42,
      0.18
    ) !important;

  color: #0f172a !important;

  font-size: 11px !important;
  font-weight: 800 !important;

  padding: 4px 7px !important;

  transition:
    transform 150ms ease,
    box-shadow 150ms ease;
}

.fuelfind-price-tooltip-selected {
  transform: scale(1.12);

  box-shadow:
    0 0 0 3px
      rgba(
        8,
        145,
        178,
        0.22
      ),
    0 4px 12px
      rgba(
        15,
        23,
        42,
        0.24
      ) !important;
}

.fuelfind-price-tooltip::before {
  display: none;
}

.dark .fuelfind-price-tooltip {
  background:
    rgba(
      15,
      23,
      42,
      0.96
    ) !important;

  color: #f8fafc !important;
}

.dark
  .fuelfind-map
  .leaflet-popup-content-wrapper,
.dark
  .fuelfind-map
  .leaflet-popup-tip {
  background: #111827;
  color: #f8fafc;
}

.dark
  .fuelfind-map
  .leaflet-control-zoom
  a {
  border-color: #334155;
  background: #111827;
  color: #f8fafc;
}

.dark
  .fuelfind-map
  .leaflet-control-attribution {
  background:
    rgba(
      15,
      23,
      42,
      0.88
    );

  color: #cbd5e1;
}

.dark
  .fuelfind-map
  .leaflet-control-attribution
  a {
  color: #67e8f9;
}
</style>
