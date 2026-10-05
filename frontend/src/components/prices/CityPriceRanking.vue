<script setup>
import {
  computed,
  nextTick,
} from 'vue'

import {
  Clock3,
  MapPin,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-vue-next'

import StationMap from '@/components/map/StationMap.vue'

import {
  useCityPriceStore,
} from '@/stores/cityPriceStore'

const cityStore =
  useCityPriceStore()

const fuelLabel =
  computed(() =>
    cityStore.selectedFuel ===
      'diesel'
      ? 'Diesel'
      : cityStore.selectedFuel.toUpperCase(),
  )

// StationMap expects the price being displayed
// under the property "price".
//
// City-wide stations contain all three fuels,
// so currentPrice is mapped to price here.
const mapStations =
  computed(() =>
    cityStore.rankedStations.map(
      (station) => ({
        ...station,

        price:
          station.currentPrice,
      }),
    ),
  )

function formatPrice(
  value,
) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    return 'Unavailable'
  }

  return `€${value.toFixed(3)}`
}

function statusLabel(
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

function statusClasses(
  station,
) {
  if (
    station.isOpen === true
  ) {
    return 'text-emerald-700 dark:text-emerald-400'
  }

  if (
    station.isOpen === false
  ) {
    return 'text-rose-700 dark:text-rose-400'
  }

  return 'text-slate-500 dark:text-slate-400'
}

function addressText(
  station,
) {
  const street =
    [
      station.street,
      station.houseNumber,
    ]
      .filter(Boolean)
      .join(' ')

  const city =
    [
      station.postCode,
      station.place,
    ]
      .filter(Boolean)
      .join(' ')

  return [
    street,
    city,
  ]
    .filter(Boolean)
    .join(', ')
}

function selectRankingStation(
  stationId,
) {
  cityStore.selectStation(
    stationId,
  )
}

function selectFromMap(
  stationId,
) {
  cityStore.selectStation(
    stationId,
  )

  nextTick(() => {
    const rankingRow =
      document.getElementById(
        `city-ranking-row-${stationId}`,
      )

    rankingRow?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  })
}
</script>

<template>
  <section
    class="mt-10"
    aria-labelledby="ranking-heading"
  >
    <div
      class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
    >
      <div>
        <p
          class="text-sm font-bold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-400"
        >
          City ranking
        </p>

        <h2
          id="ranking-heading"
          class="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white"
        >
          Heidelberg station prices
        </h2>

        <p
          class="mt-2 text-sm text-slate-500 dark:text-slate-400"
        >
          Compare
          {{ fuelLabel }}
          prices using the current city-wide retrieval.
        </p>
      </div>

      <div
        class="text-sm text-slate-500 dark:text-slate-400"
      >
        Showing
        <strong
          class="font-semibold text-slate-800 dark:text-slate-200"
        >
          {{
            cityStore.rankedStations.length
          }}
        </strong>
        stations
      </div>
    </div>

    <!-- Search / sorting / filtering -->
    <div
      class="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[1fr_auto]"
    >
      <label
        class="relative block"
      >
        <span class="sr-only">
          Search stations
        </span>

        <Search
          :size="17"
          class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />

        <input
          type="search"
          :value="
            cityStore.stationQuery
          "
          placeholder="Search station, brand or district"
          class="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-cyan-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-cyan-400"
          @input="
            cityStore.setStationQuery(
              $event.target.value,
            )
          "
        />
      </label>

      <div
        class="flex flex-wrap gap-2"
      >
        <button
          type="button"
          class="inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition focus-visible:outline-none"
          :class="
            cityStore.rankingMode ===
            'cheapest'
              ? 'border-cyan-600 bg-cyan-50 text-cyan-800 dark:border-cyan-400 dark:bg-cyan-950/50 dark:text-cyan-300'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
          "
          :aria-pressed="
            cityStore.rankingMode ===
            'cheapest'
          "
          @click="
            cityStore.setRankingMode(
              'cheapest',
            )
          "
        >
          <TrendingDown
            :size="16"
            aria-hidden="true"
          />

          Cheapest first
        </button>

        <button
          type="button"
          class="inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition focus-visible:outline-none"
          :class="
            cityStore.rankingMode ===
            'highest'
              ? 'border-amber-500 bg-amber-50 text-amber-800 dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-300'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
          "
          :aria-pressed="
            cityStore.rankingMode ===
            'highest'
          "
          @click="
            cityStore.setRankingMode(
              'highest',
            )
          "
        >
          <TrendingUp
            :size="16"
            aria-hidden="true"
          />

          Highest first
        </button>

        <button
          type="button"
          class="inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition focus-visible:outline-none"
          :class="
            cityStore.openOnly
              ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
          "
          :aria-pressed="
            cityStore.openOnly
          "
          @click="
            cityStore.setOpenOnly(
              !cityStore.openOnly,
            )
          "
        >
          <Clock3
            :size="16"
            aria-hidden="true"
          />

          Open now
        </button>
      </div>
    </div>

    <!-- Ranking + map -->
    <div
      v-if="
        cityStore.rankedStations.length >
        0
      "
      class="mt-5 grid items-start gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(430px,1.05fr)]"
    >
      <!-- Ranking list -->
      <div
        class="order-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:order-1"
      >
        <button
          v-for="
            (
              station,
              index
            ) in cityStore.rankedStations
          "
          :id="
            `city-ranking-row-${station.id}`
          "
          :key="station.id"
          type="button"
          class="grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 hover:bg-slate-50 focus-visible:outline-none dark:border-slate-800 dark:hover:bg-slate-800/70 sm:px-5"
          :class="
            cityStore.selectedStationId ===
            station.id
              ? 'bg-cyan-50 ring-1 ring-inset ring-cyan-500/40 dark:bg-cyan-950/30 dark:ring-cyan-400/40'
              : ''
          "
          :aria-pressed="
            cityStore.selectedStationId ===
            station.id
          "
          @click="
            selectRankingStation(
              station.id,
            )
          "
        >
          <span
            class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {{ index + 1 }}
          </span>

          <span class="min-w-0">
            <span
              class="block truncate font-bold text-slate-950 dark:text-white"
            >
              {{ station.name }}
            </span>

            <span
              class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400"
            >
              <span
                v-if="
                  station.districtName
                "
                class="inline-flex items-center gap-1"
              >
                <MapPin
                  :size="13"
                  aria-hidden="true"
                />

                {{
                  station.districtName
                }}
              </span>

              <span
                :class="
                  statusClasses(
                    station,
                  )
                "
              >
                {{
                  statusLabel(
                    station,
                  )
                }}
              </span>

              <span
                v-if="
                  addressText(
                    station,
                  )
                "
                class="hidden lg:inline"
              >
                {{
                  addressText(
                    station,
                  )
                }}
              </span>
            </span>
          </span>

          <span
            class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right dark:border-slate-700 dark:bg-slate-950"
          >
            <span
              class="block text-base font-black text-slate-950 dark:text-white"
            >
              {{
                formatPrice(
                  station.currentPrice,
                )
              }}
            </span>

            <span
              class="block text-[11px] font-medium text-slate-500 dark:text-slate-400"
            >
              {{ fuelLabel }}/L
            </span>
          </span>
        </button>
      </div>

      <!-- City map -->
      <aside
        class="order-1 xl:order-2 xl:sticky xl:top-24"
      >
        <StationMap
          :stations="
            mapStations
          "
          :fuel="
            cityStore.selectedFuel
          "
          :selected-station-id="
            cityStore.selectedStationId
          "
          :show-distance="false"
          @select="
            selectFromMap
          "
        />
      </aside>
    </div>

    <!-- Empty filter state -->
    <div
      v-else
      class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900"
    >
      <Search
        :size="28"
        class="mx-auto text-slate-400"
        aria-hidden="true"
      />

      <h3
        class="mt-3 font-bold text-slate-950 dark:text-white"
      >
        No matching stations
      </h3>

      <p
        class="mt-1 text-sm text-slate-500 dark:text-slate-400"
      >
        Change the station search or Open now filter.
      </p>
    </div>
  </section>
</template>
