<script setup>
import CityPriceRanking from '@/components/prices/CityPriceRanking.vue'
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'

import {
  BadgeEuro,
  CircleAlert,
  Clock3,
  Fuel,
  LoaderCircle,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-vue-next'

import {
  useCityPriceStore,
} from '@/stores/cityPriceStore'

import {
  useStationStore,
} from '@/stores/stationStore'

const cityStore =
  useCityPriceStore()

const stationStore =
  useStationStore()

const now =
  ref(Date.now())

let timer = null

const fuelOptions = [
  {
    value: 'e5',
    label: 'E5',
    description:
      'Super E5',
  },

  {
    value: 'e10',
    label: 'E10',
    description:
      'Super E10',
  },

  {
    value: 'diesel',
    label: 'Diesel',
    description:
      'Diesel',
  },
]

const sharedNextRequestAt =
  computed(() => {
    const candidates = [
      cityStore.nextRequestAt,
      stationStore.nextRequestAt,
    ]
      .map(
        (value) =>
          Date.parse(
            value ?? '',
          ),
      )
      .filter(
        Number.isFinite,
      )

    if (
      candidates.length === 0
    ) {
      return null
    }

    return Math.max(
      ...candidates,
    )
  })

const cooldownSeconds =
  computed(() => {
    if (
      sharedNextRequestAt.value ===
      null
    ) {
      return 0
    }

    return Math.max(
      0,
      Math.ceil(
        (
          sharedNextRequestAt.value -
          now.value
        ) /
          1000,
      ),
    )
  })

const requestDisabled =
  computed(
    () =>
      cityStore.loading ||
      cooldownSeconds.value >
        0,
  )

const requestLabel =
  computed(() => {
    if (
      cityStore.loading
    ) {
      return 'Loading prices…'
    }

    if (
      cooldownSeconds.value >
      0
    ) {
      return `Available in ${cooldownSeconds.value}s`
    }

    return cityStore.loaded
      ? 'Refresh prices'
      : 'Load current prices'
  })

const retrievedText =
  computed(() => {
    if (
      !cityStore.retrievedAt
    ) {
      return null
    }

    const date =
      new Date(
        cityStore.retrievedAt,
      )

    if (
      !Number.isFinite(
        date.getTime(),
      )
    ) {
      return null
    }

    return new Intl.DateTimeFormat(
      'en-GB',
      {
        dateStyle:
          'medium',

        timeStyle:
          'short',
      },
    ).format(date)
  })

function formatPrice(
  value,
) {
  if (
    typeof value !==
      'number' ||
    !Number.isFinite(value)
  ) {
    return 'Unavailable'
  }

  return `€${value.toFixed(3)}`
}

function stationSummary(
  stations,
) {
  if (
    !Array.isArray(
      stations,
    ) ||
    stations.length === 0
  ) {
    return 'No station available'
  }

  if (
    stations.length === 1
  ) {
    return stations[0].name
  }

  return `${stations[0].name} + ${stations.length - 1} tied`
}

function fuelButtonClass(
  fuel,
) {
  const selected =
    cityStore.selectedFuel ===
    fuel

  if (!selected) {
    return [
      'border-slate-200',
      'bg-white',
      'text-slate-700',
      'hover:bg-slate-50',
      'dark:border-slate-700',
      'dark:bg-slate-900',
      'dark:text-slate-200',
      'dark:hover:bg-slate-800',
    ]
  }

  if (fuel === 'e5') {
    return [
      'border-blue-600',
      'bg-blue-600',
      'text-white',
      'dark:border-blue-400',
      'dark:bg-blue-500',
    ]
  }

  if (fuel === 'e10') {
    return [
      'border-teal-600',
      'bg-teal-600',
      'text-white',
      'dark:border-teal-400',
      'dark:bg-teal-500',
    ]
  }

  return [
    'border-amber-500',
    'bg-amber-500',
    'text-slate-950',
    'dark:border-amber-300',
    'dark:bg-amber-400',
  ]
}

onMounted(() => {
  timer =
    window.setInterval(
      () => {
        now.value =
          Date.now()
      },
      1000,
    )
})

onBeforeUnmount(() => {
  if (
    timer !== null
  ) {
    window.clearInterval(
      timer,
    )
  }
})
</script>

<template>
  <main
    class="min-h-[calc(100vh-4.5rem)] bg-slate-50 dark:bg-slate-950"
  >
    <section
      class="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
    >
      <div
        class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
      >
        <div
          class="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"
        >
          <div
            class="max-w-3xl"
          >
            <p
              class="text-sm font-bold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-400"
            >
              Heidelberg prices
            </p>

            <h1
              class="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl dark:text-white"
            >
              Compare fuel prices
              across Heidelberg.
            </h1>

            <p
              class="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300"
            >
              One city-wide retrieval gives FuelFind
              current E5, E10 and Diesel prices for
              verified Heidelberg stations.
            </p>
          </div>

          <button
            type="button"
            :disabled="
              requestDisabled
            "
            class="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-800 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
            @click="
              cityStore.loadPrices()
            "
          >
            <LoaderCircle
              v-if="
                cityStore.loading
              "
              :size="18"
              class="animate-spin"
              aria-hidden="true"
            />

            <RefreshCw
              v-else
              :size="18"
              aria-hidden="true"
            />

            {{ requestLabel }}
          </button>
        </div>

        <div
          v-if="
            cityStore.errorMessage
          "
          role="alert"
          class="mt-7 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300"
        >
          <CircleAlert
            :size="18"
            class="mt-0.5 shrink-0"
            aria-hidden="true"
          />

          <span>
            {{
              cityStore.errorMessage
            }}
          </span>
        </div>
      </div>
    </section>

    <section
      v-if="
        cityStore.loaded
      "
      class="py-12"
      aria-labelledby="city-price-summary"
    >
      <div
        class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div
          class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <h2
              id="city-price-summary"
              class="text-2xl font-bold tracking-tight text-slate-950 dark:text-white"
            >
              Current city overview
            </h2>

            <p
              class="mt-2 text-sm text-slate-500 dark:text-slate-400"
            >
              Based on
              <strong
                class="font-semibold text-slate-800 dark:text-slate-200"
              >
                {{
                  cityStore.coverageCount
                }}
              </strong>
              Heidelberg stations with an available
              {{
                cityStore.selectedFuel.toUpperCase()
              }}
              price.
            </p>
          </div>

          <div
            class="grid grid-cols-3 gap-2"
            aria-label="Select fuel"
          >
            <button
              v-for="
                option in fuelOptions
              "
              :key="
                option.value
              "
              type="button"
              class="min-w-24 rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition focus-visible:outline-none"
              :class="
                fuelButtonClass(
                  option.value,
                )
              "
              :aria-pressed="
                cityStore.selectedFuel ===
                option.value
              "
              @click="
                cityStore.setFuel(
                  option.value,
                )
              "
            >
              <span
                class="block font-bold"
              >
                {{
                  option.label
                }}
              </span>

              <span
                class="block text-xs opacity-75"
              >
                {{
                  option.description
                }}
              </span>
            </button>
          </div>
        </div>

        <div
          class="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <article
            class="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-900/70 dark:bg-slate-900"
          >
            <div
              class="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400"
            >
              <TrendingDown
                :size="17"
                aria-hidden="true"
              />

              Cheapest
            </div>

            <p
              class="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white"
            >
              {{
                formatPrice(
                  cityStore.cheapestPrice,
                )
              }}
            </p>

            <p
              class="mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400"
            >
              {{
                stationSummary(
                  cityStore.cheapestStations,
                )
              }}
            </p>
          </article>

          <article
            class="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm dark:border-amber-900/70 dark:bg-slate-900"
          >
            <div
              class="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400"
            >
              <TrendingUp
                :size="17"
                aria-hidden="true"
              />

              Highest
            </div>

            <p
              class="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white"
            >
              {{
                formatPrice(
                  cityStore.highestPrice,
                )
              }}
            </p>

            <p
              class="mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400"
            >
              {{
                stationSummary(
                  cityStore.highestStations,
                )
              }}
            </p>
          </article>

          <article
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div
              class="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
            >
              <BadgeEuro
                :size="17"
                aria-hidden="true"
              />

              Average
            </div>

            <p
              class="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white"
            >
              {{
                formatPrice(
                  cityStore.averagePrice,
                )
              }}
            </p>

            <p
              class="mt-2 text-sm text-slate-500 dark:text-slate-400"
            >
              Mean of valid station prices.
            </p>
          </article>

          <article
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div
              class="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
            >
              <Fuel
                :size="17"
                aria-hidden="true"
              />

              Median
            </div>

            <p
              class="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white"
            >
              {{
                formatPrice(
                  cityStore.medianPrice,
                )
              }}
            </p>

            <p
              class="mt-2 text-sm text-slate-500 dark:text-slate-400"
            >
              Middle valid station price.
            </p>
          </article>
        </div>

        <div
          class="mt-7 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between"
        >
          <div
            class="flex items-center gap-2"
          >
            <Clock3
              :size="16"
              aria-hidden="true"
            />

            <span>
              Retrieved
              <strong
                class="font-semibold text-slate-700 dark:text-slate-200"
              >
                {{
                  retrievedText ||
                  'time unavailable'
                }}
              </strong>
            </span>
          </div>

          <span>
            Source:
            <strong
              class="font-semibold text-slate-700 dark:text-slate-200"
            >
              {{
                cityStore.source ||
                'Unavailable'
              }}
            </strong>
          </span>
        </div>
        <CityPriceRanking />
      </div>
    </section>

    <section
      v-else
      class="py-16"
    >
      <div
        class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div
          class="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900"
        >
          <BadgeEuro
            :size="34"
            class="mx-auto text-cyan-700 dark:text-cyan-400"
            aria-hidden="true"
          />

          <h2
            class="mt-4 text-xl font-bold text-slate-950 dark:text-white"
          >
            Load Heidelberg's current prices
          </h2>

          <p
            class="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400"
          >
            One request retrieves E5, E10 and Diesel
            prices together. After that, changing fuel
            tabs does not trigger another live request.
          </p>
        </div>
      </div>
    </section>
  </main>
</template>
