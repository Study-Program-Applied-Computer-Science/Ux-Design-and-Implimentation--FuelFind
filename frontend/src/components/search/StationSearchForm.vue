<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'

import {
  CircleAlert,
  CircleCheck,
  Fuel,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Search,
} from 'lucide-vue-next'

import {
  useStationStore,
} from '@/stores/stationStore'

const stationStore =
  useStationStore()

const now =
  ref(Date.now())

let timer = null

const fuelOptions = [
  {
    value: 'e5',
    label: 'E5',
    description: 'Super E5',
  },
  {
    value: 'e10',
    label: 'E10',
    description: 'Super E10',
  },
  {
    value: 'diesel',
    label: 'Diesel',
    description: 'Diesel',
  },
]

const cooldownSeconds =
  computed(() => {
    if (
      !stationStore
        .nextRequestAt
    ) {
      return 0
    }

    const target =
      Date.parse(
        stationStore
          .nextRequestAt,
      )

    if (
      !Number.isFinite(
        target,
      )
    ) {
      return 0
    }

    return Math.max(
      0,
      Math.ceil(
        (
          target -
          now.value
        ) /
        1000,
      ),
    )
  })

const searchDisabled =
  computed(
    () =>
      stationStore.loading ||
      stationStore
        .locationState ===
      'loading' ||
      cooldownSeconds.value >
      0,
  )

const searchLabel =
  computed(() => {
    if (
      stationStore.loading
    ) {
      return 'Searching…'
    }

    if (
      cooldownSeconds.value >
      0
    ) {
      return `Available in ${cooldownSeconds.value}s`
    }

    return 'Search stations'
  })

function fuelButtonClass(
  fuel,
) {
  const selected =
    stationStore.fuel ===
    fuel

  if (!selected) {
    return [
      'border-slate-200',
      'bg-white',
      'text-slate-700',
      'hover:border-slate-300',
      'hover:bg-slate-50',
      'dark:border-slate-700',
      'dark:bg-slate-950',
      'dark:text-slate-200',
      'dark:hover:border-slate-600',
      'dark:hover:bg-slate-900',
    ]
  }

  if (fuel === 'e5') {
    return [
      'border-blue-600',
      'bg-blue-600',
      'text-white',
      'shadow-sm',
      'dark:border-blue-400',
      'dark:bg-blue-500',
    ]
  }

  if (fuel === 'e10') {
    return [
      'border-teal-600',
      'bg-teal-600',
      'text-white',
      'shadow-sm',
      'dark:border-teal-400',
      'dark:bg-teal-500',
    ]
  }

  return [
    'border-amber-500',
    'bg-amber-500',
    'text-slate-950',
    'shadow-sm',
    'dark:border-amber-300',
    'dark:bg-amber-400',
  ]
}

onMounted(() => {
  timer = window.setInterval(
    () => {
      now.value =
        Date.now()
    },
    1000,
  )
})

onBeforeUnmount(() => {
  if (timer !== null) {
    window.clearInterval(
      timer,
    )
  }
})
</script>

<template>
  <form class="mt-6 space-y-6" @submit.prevent="
    stationStore.searchStations()
    ">
    <fieldset>
      <legend class="text-sm font-semibold text-slate-900 dark:text-slate-100">
        Fuel type
      </legend>

      <div class="mt-3 grid grid-cols-3 gap-2">
        <button v-for="option in fuelOptions" :key="option.value" type="button"
          class="rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none" :class="fuelButtonClass(
            option.value,
          )
            " :aria-pressed="stationStore.fuel ===
            option.value
            " @click="
            stationStore.setFuel(
              option.value,
            )
            ">
          <span class="block text-sm font-bold">
            {{ option.label }}
          </span>

          <span class="mt-0.5 block text-xs opacity-80">
            {{
              option.description
            }}
          </span>
        </button>
      </div>
    </fieldset>

    <div class="grid gap-5 sm:grid-cols-[0.8fr_1.2fr]">
      <div>
        <label for="search-radius" class="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Search radius
        </label>

        <div class="relative mt-3">
          <select id="search-radius" :value="stationStore.radius
            "
            class="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm font-medium text-slate-900 shadow-sm transition hover:border-slate-300 focus:border-cyan-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-slate-600"
            @change="
              stationStore.setRadius(
                Number(
                  $event.target
                    .value,
                ),
              )
              ">
            <option value="2">
              2 km
            </option>

            <option value="5">
              5 km
            </option>

            <option value="10">
              10 km
            </option>
          </select>
        </div>
      </div>

      <div>
        <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Search location
        </span>

        <div class="mt-3 grid grid-cols-2 gap-2">
          <button type="button"
            class="inline-flex h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition focus-visible:outline-none"
            :class="stationStore.locationMode ===
                'heidelberg'
                ? 'border-cyan-600 bg-cyan-50 text-cyan-800 dark:border-cyan-400 dark:bg-cyan-950/50 dark:text-cyan-300'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900'
              " @click="
              stationStore.useHeidelbergLocation()
              ">
            <MapPin :size="17" aria-hidden="true" />

            Heidelberg
          </button>

          <button type="button"
            class="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 text-sm font-semibold transition focus-visible:outline-none"
            :class="stationStore.locationMode ===
                'current'
                ? 'border-cyan-600 bg-cyan-50 text-cyan-800 dark:border-cyan-400 dark:bg-cyan-950/50 dark:text-cyan-300'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900'
              " @click="
              stationStore.useCurrentLocation()
              ">
            <LoaderCircle v-if="
              stationStore.locationState ===
              'loading'
            " :size="17" class="animate-spin" aria-hidden="true" />

            <LocateFixed v-else :size="17" aria-hidden="true" />

            My location
          </button>
        </div>
      </div>
    </div>

    <div class="flex items-start gap-2 text-sm" :class="stationStore.locationState ===
        'error'
        ? 'text-red-700 dark:text-red-400'
        : 'text-slate-500 dark:text-slate-400'
      ">
      <CircleAlert v-if="
        stationStore.locationState ===
        'error'
      " :size="16" class="mt-0.5 shrink-0" aria-hidden="true" />

      <MapPin v-else :size="16" class="mt-0.5 shrink-0" aria-hidden="true" />

      <span>
        {{
          stationStore.locationMessage
        }}
      </span>
    </div>

    <button type="submit" :disabled="searchDisabled
      "
      class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-800 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400">
      <LoaderCircle v-if="
        stationStore.loading
      " :size="18" class="animate-spin" aria-hidden="true" />

      <Search v-else :size="18" aria-hidden="true" />

      {{ searchLabel }}
    </button>

    <div v-if="
      stationStore.errorMessage
    " role="alert"
      class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
      <CircleAlert :size="18" class="mt-0.5 shrink-0" aria-hidden="true" />

      <span>
        {{
          stationStore.errorMessage
        }}
      </span>
    </div>

    <div v-if="
      stationStore.lastSearch
    " role="status"
      class="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300">
      <CircleCheck :size="18" class="mt-0.5 shrink-0" aria-hidden="true" />

      <div>
        <p class="font-semibold">
          {{
            stationStore.stationCount
          }}
          verified stations loaded.
        </p>

        <p class="mt-1 opacity-80">
          {{
            stationStore.lastSearch.fuel.toUpperCase()
          }}
          within
          {{
            stationStore.lastSearch.radiusKm
          }}
          km.
        </p>
      </div>
    </div>

    <div
      class="flex items-start gap-2 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
      <Fuel :size="15" class="mt-0.5 shrink-0" aria-hidden="true" />

      <span>
        Live fuel prices are requested only when
        you search. Sorting and filtering results
        later will not trigger another provider
        request.
      </span>
    </div>
  </form>
</template>
