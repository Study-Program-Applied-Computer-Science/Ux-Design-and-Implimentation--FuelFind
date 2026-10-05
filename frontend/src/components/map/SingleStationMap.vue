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
} from '@vue-leaflet/vue-leaflet'

const props = defineProps({
  latitude: {
    type: Number,
    required: true,
  },

  longitude: {
    type: Number,
    required: true,
  },

  stationName: {
    type: String,
    required: true,
  },

  address: {
    type: String,
    default: '',
  },
})

const mapObject =
  shallowRef(null)

const zoom =
  shallowRef(16)

const HEIDELBERG = [
  49.3988,
  8.6724,
]

const tileUrl =
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

const tileAttribution =
  '&copy; OpenStreetMap contributors'

const hasValidCoordinates =
  computed(
    () =>
      Number.isFinite(
        props.latitude,
      ) &&
      Number.isFinite(
        props.longitude,
      ),
  )

const stationCenter =
  computed(() => {
    if (
      !hasValidCoordinates.value
    ) {
      return HEIDELBERG
    }

    return [
      props.latitude,
      props.longitude,
    ]
  })

function centerMap() {
  const map =
    mapObject.value

  if (!map) {
    return
  }

  map.invalidateSize()

  map.setView(
    stationCenter.value,
    16,
  )
}

function handleMapReady(
  map,
) {
  mapObject.value =
    map

  nextTick(
    centerMap,
  )
}

watch(
  () => [
    props.latitude,
    props.longitude,
  ],

  () => {
    nextTick(
      centerMap,
    )
  },
)
</script>

<template>
  <section
    class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    aria-labelledby="station-location-heading"
  >
    <div
      class="border-b border-slate-200 px-6 py-5 dark:border-slate-800 sm:px-8"
    >
      <div
        class="flex items-start gap-3"
      >
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300"
        >
          <MapPin
            :size="21"
            aria-hidden="true"
          />
        </div>

        <div>
          <p
            class="text-sm font-bold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-400"
          >
            Verified location
          </p>

          <h2
            id="station-location-heading"
            class="mt-1 text-2xl font-bold text-slate-950 dark:text-white"
          >
            Station location
          </h2>

          <p
            class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400"
          >
            Location from the verified Heidelberg station catalogue.
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="hasValidCoordinates"
      class="fuelfind-single-station-map h-[360px] sm:h-[420px]"
    >
      <LMap
        v-model:zoom="zoom"
        :center="stationCenter"
        :use-global-leaflet="false"
        @ready="handleMapReady"
      >
        <LTileLayer
          :url="tileUrl"
          :attribution="tileAttribution"
          layer-type="base"
          name="OpenStreetMap"
        />

        <LCircleMarker
          :lat-lng="stationCenter"
          :radius="11"
          color="#ffffff"
          fill-color="#0891b2"
          :fill-opacity="1"
          :weight="4"
        >
          <LPopup>
            <div
              class="min-w-[190px]"
            >
              <strong>
                {{ stationName }}
              </strong>

              <div
                v-if="address"
                style="
                  margin-top: 6px;
                "
              >
                {{ address }}
              </div>
            </div>
          </LPopup>
        </LCircleMarker>
      </LMap>
    </div>

    <div
      v-else
      class="p-6 sm:p-8"
    >
      <div
        class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/60"
      >
        <p
          class="font-semibold text-slate-800 dark:text-slate-200"
        >
          Station location unavailable
        </p>

        <p
          class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400"
        >
          The verified catalogue does not provide usable coordinates for this station.
        </p>
      </div>
    </div>
  </section>
</template>

<style>
.fuelfind-single-station-map .leaflet-container {
  height: 100%;
  width: 100%;
  font-family: inherit;
  background: #e2e8f0;
}

.dark
  .fuelfind-single-station-map
  .leaflet-container {
  background: #0f172a;
}

.dark
  .fuelfind-single-station-map
  .leaflet-popup-content-wrapper,
.dark
  .fuelfind-single-station-map
  .leaflet-popup-tip {
  background: #111827;
  color: #f8fafc;
}

.dark
  .fuelfind-single-station-map
  .leaflet-control-zoom
  a {
  border-color: #334155;
  background: #111827;
  color: #f8fafc;
}

.dark
  .fuelfind-single-station-map
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
  .fuelfind-single-station-map
  .leaflet-control-attribution
  a {
  color: #67e8f9;
}
</style>
