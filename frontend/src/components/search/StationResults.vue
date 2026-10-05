<script setup>
import {
  computed,
  nextTick,
} from 'vue'

import {
  BadgeEuro,
  Clock3,
  Database,
  ListFilter,
  Navigation,
} from 'lucide-vue-next'

import StationMap from '@/components/map/StationMap.vue'
import StationCard from '@/components/station/StationCard.vue'
import StationComparison from '@/components/station/StationComparison.vue'

import {
  useStationStore,
} from '@/stores/stationStore'

const stationStore =
  useStationStore()

const retrievedText =
  computed(() => {
    if (
      !stationStore.retrievedAt
    ) {
      return 'Retrieval time unavailable'
    }

    const date =
      new Date(
        stationStore.retrievedAt,
      )

    if (
      !Number.isFinite(
        date.getTime(),
      )
    ) {
      return 'Retrieval time unavailable'
    }

    return new Intl.DateTimeFormat(
      'en-GB',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    ).format(date)
  })

function selectFromMap(
  stationId,
) {
  stationStore.selectStation(
    stationId,
  )

  nextTick(() => {
    const card =
      document.getElementById(
        `station-card-${stationId}`,
      )

    card?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  })
}
</script>

<template>
  <section
    v-if="
      stationStore.lastSearch
    "
    id="station-results"
    class="border-b border-slate-200 bg-slate-50 py-12 dark:border-slate-800 dark:bg-slate-950"
    aria-labelledby="results-heading"
  >
    <div
      class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
    >
      <div
        class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <p
            class="text-sm font-bold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-400"
          >
            Search results
          </p>

          <h2
            id="results-heading"
            class="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white"
          >
            Verified stations
          </h2>

          <p
            class="mt-2 max-w-2xl text-slate-600 dark:text-slate-400"
          >
            Explore your current result set without
            making another live price request.
          </p>
        </div>

        <div
          class="text-sm text-slate-500 dark:text-slate-400"
        >
          Updated
          <span
            class="font-semibold text-slate-700 dark:text-slate-200"
          >
            {{ retrievedText }}
          </span>
        </div>
      </div>

      <div
        class="mt-7 grid gap-3 sm:grid-cols-3"
      >
        <div
          class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <p
            class="text-sm text-slate-500 dark:text-slate-400"
          >
            Results
          </p>

          <p
            class="mt-1 text-2xl font-bold text-slate-950 dark:text-white"
          >
            {{ stationStore.stationCount }}
          </p>
        </div>

        <div
          class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <div
            class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
          >
            <Clock3
              :size="15"
              aria-hidden="true"
            />

            Open now
          </div>

          <p
            class="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400"
          >
            {{
              stationStore.openStationCount
            }}
          </p>
        </div>

        <div
          class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <div
            class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
          >
            <BadgeEuro
              :size="15"
              aria-hidden="true"
            />

            Prices available
          </div>

          <p
            class="mt-1 text-2xl font-bold text-slate-950 dark:text-white"
          >
            {{
              stationStore.availablePriceCount
            }}
          </p>
        </div>
      </div>

      <div
        class="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
      >
        <div
          class="flex items-center gap-2 px-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          <ListFilter
            :size="17"
            aria-hidden="true"
          />

          Sort and filter
        </div>

        <div
          class="flex flex-wrap gap-2"
        >
          <button
            type="button"
            class="inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition focus-visible:outline-none"
            :class="
              stationStore.sortMode ===
              'cheapest'
                ? 'border-cyan-600 bg-cyan-50 text-cyan-800 dark:border-cyan-400 dark:bg-cyan-950/50 dark:text-cyan-300'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            "
            :aria-pressed="
              stationStore.sortMode ===
              'cheapest'
            "
            @click="
              stationStore.setSortMode(
                'cheapest',
              )
            "
          >
            <BadgeEuro
              :size="16"
              aria-hidden="true"
            />

            Cheapest
          </button>

          <button
            type="button"
            class="inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition focus-visible:outline-none"
            :class="
              stationStore.sortMode ===
              'nearest'
                ? 'border-cyan-600 bg-cyan-50 text-cyan-800 dark:border-cyan-400 dark:bg-cyan-950/50 dark:text-cyan-300'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            "
            :aria-pressed="
              stationStore.sortMode ===
              'nearest'
            "
            @click="
              stationStore.setSortMode(
                'nearest',
              )
            "
          >
            <Navigation
              :size="16"
              aria-hidden="true"
            />

            Nearest
          </button>

          <button
            type="button"
            class="inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition focus-visible:outline-none"
            :class="
              stationStore.openOnly
                ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            "
            :aria-pressed="
              stationStore.openOnly
            "
            @click="
              stationStore.setOpenOnly(
                !stationStore.openOnly,
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

      <StationComparison
        v-if="
          stationStore.comparisonCount >
          0
        "
        :stations="
          stationStore.comparisonStations
        "
        :fuel="
          stationStore.resultFuel
        "
        @clear="
          stationStore.clearComparison
        "
      />

      <p
        class="mt-5 text-sm text-slate-500 dark:text-slate-400"
      >
        Showing
        <strong
          class="font-semibold text-slate-800 dark:text-slate-200"
        >
          {{
            stationStore.visibleStations.length
          }}
        </strong>
        of
        <strong
          class="font-semibold text-slate-800 dark:text-slate-200"
        >
          {{
            stationStore.stationCount
          }}
        </strong>
        stations.
      </p>

      <div
        v-if="
          stationStore.visibleStations.length >
          0
        "
        class="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]"
      >
        <aside
          class="order-1 lg:order-2 lg:sticky lg:top-24"
        >
          <StationMap
            :stations="
              stationStore.visibleStations
            "
            :fuel="
              stationStore.resultFuel
            "
            :selected-station-id="
              stationStore.selectedStationId
            "
            :search-coordinates="
              stationStore.resultCoordinates
            "
            @select="
              selectFromMap
            "
          />
        </aside>

        <div
          class="order-2 space-y-4 lg:order-1"
        >
          <StationCard
            v-for="
              station in stationStore.visibleStations
            "
            :key="station.id"
            :station="station"
            :fuel="
              stationStore.resultFuel
            "
            :selected="
              stationStore.selectedStationId ===
              station.id
            "
            :compared="
              stationStore.comparisonStationIds.includes(
                station.id,
              )
            "
            :comparison-disabled="
              stationStore.comparisonCount >=
                2 &&
              !stationStore.comparisonStationIds.includes(
                station.id,
              )
            "
            @select="
              stationStore.selectStation
            "
            @toggle-compare="
              stationStore.toggleComparisonStation
            "
          />
        </div>
      </div>

      <div
        v-else
        class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900"
      >
        <Clock3
          :size="28"
          class="mx-auto text-slate-400"
          aria-hidden="true"
        />

        <h3
          class="mt-3 font-bold text-slate-900 dark:text-white"
        >
          No matching stations
        </h3>

        <p
          class="mt-1 text-sm text-slate-500 dark:text-slate-400"
        >
          Try turning off the Open now filter.
        </p>
      </div>

      <div
        class="mt-8 flex items-start gap-2 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400"
      >
        <Database
          :size="15"
          class="mt-0.5 shrink-0"
          aria-hidden="true"
        />

        <span>
          Source:
          {{
            stationStore.source ||
            'Fuel price source unavailable'
          }}.
          Prices reflect the latest FuelFind retrieval,
          not continuous background monitoring.
        </span>
      </div>
    </div>
  </section>
</template>
