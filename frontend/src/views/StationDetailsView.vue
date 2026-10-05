<script setup>
import {
  computed,
  onBeforeUnmount,
  ref,
  watch,
} from 'vue'

import {
  ArrowLeft,
  BadgeCheck,
  CircleAlert,
  Clock3,
  Fuel,
  LoaderCircle,
  MapPin,
  Navigation,
  RefreshCw,
} from 'lucide-vue-next'

import {
  useRoute,
} from 'vue-router'

import {
  useStationDetailStore,
} from '@/stores/stationDetailStore'

import {
  getOpeningHoursRows,
} from '@/utils/openingHours'

import SingleStationMap from '@/components/map/SingleStationMap.vue'

const route =
  useRoute()

const detailStore =
  useStationDetailStore()

const now =
  ref(Date.now())

let timer = null

const displayStation =
  computed(
    () =>
      detailStore.displayStation,
  )

const openingHoursRows =
  computed(() =>
    getOpeningHoursRows(
      detailStore.catalogueStation
        ?.openingTimes,
    ),
  )

const stationLongitude =
  computed(() =>
    Number(
      detailStore.catalogueStation
        ?.location?.coordinates?.[0],
    ),
  )

const stationLatitude =
  computed(() =>
    Number(
      detailStore.catalogueStation
        ?.location?.coordinates?.[1],
    ),
  )

const directionsUrl =
  computed(() => {
    if (
      !Number.isFinite(
        stationLatitude.value,
      ) ||
      !Number.isFinite(
        stationLongitude.value,
      )
    ) {
      return ''
    }

    const destination =
      `${stationLatitude.value},${stationLongitude.value}`

    return (
      'https://www.google.com/maps/dir/?api=1&destination=' +
      encodeURIComponent(
        destination,
      )
    )
  })

const address =
  computed(() => {
    const station =
      displayStation.value

    if (!station) {
      return ''
    }

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
        station.place ??
        station.city,
      ]
        .filter(Boolean)
        .join(' ')

    return [
      street,
      city,
    ]
      .filter(Boolean)
      .join(', ')
  })

const cooldownSeconds =
  computed(() => {
    const timestamp =
      Date.parse(
        detailStore
          .sharedNextRequestAt ??
        '',
      )

    if (
      !Number.isFinite(
        timestamp,
      )
    ) {
      return 0
    }

    return Math.max(
      0,
      Math.ceil(
        (
          timestamp -
          now.value
        ) /
        1000,
      ),
    )
  })

const requestDisabled =
  computed(
    () =>
      detailStore.liveLoading ||
      !detailStore.catalogueStation ||
      cooldownSeconds.value >
      0,
  )

const requestLabel =
  computed(() => {
    if (
      detailStore.liveLoading
    ) {
      return 'Loading live details…'
    }

    if (
      cooldownSeconds.value >
      0
    ) {
      return `Available in ${cooldownSeconds.value}s`
    }

    if (
      detailStore.hasLiveDetails
    ) {
      return 'Refresh live details'
    }

    return 'Load current details'
  })

const status =
  computed(() => {
    if (
      !detailStore.hasLiveDetails
    ) {
      return {
        label:
          'Current status not loaded',

        classes:
          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      }
    }

    if (
      detailStore.liveStation
        ?.isOpen === true
    ) {
      return {
        label:
          'Open now',

        classes:
          'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
      }
    }

    if (
      detailStore.liveStation
        ?.isOpen === false
    ) {
      return {
        label:
          'Closed',

        classes:
          'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
      }
    }

    return {
      label:
        'Status unavailable',

      classes:
        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    }
  })

const retrievedText =
  computed(() => {
    if (
      !detailStore.retrievedAt
    ) {
      return null
    }

    const date =
      new Date(
        detailStore.retrievedAt,
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

const priceCards =
  computed(() => [
    {
      fuel: 'E5',

      price:
        detailStore.liveStation
          ?.prices?.e5,

      classes:
        'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
    },

    {
      fuel: 'E10',

      price:
        detailStore.liveStation
          ?.prices?.e10,

      classes:
        'border-teal-200 bg-teal-50 text-teal-900 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200',
    },

    {
      fuel: 'Diesel',

      price:
        detailStore.liveStation
          ?.prices?.diesel,

      classes:
        'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
    },
  ])

function formatPrice(
  value,
) {
  if (
    typeof value !==
    'number' ||
    !Number.isFinite(
      value,
    ) ||
    value <= 0
  ) {
    return 'Unavailable'
  }

  return `€${value.toFixed(3)}`
}

async function requestLiveDetails() {
  await detailStore.loadLiveDetails({
    force:
      detailStore.hasLiveDetails,
  })
}

watch(
  () =>
    String(
      route.params.stationId ??
      '',
    ),

  async (stationId) => {
    await detailStore.prepareStation(
      stationId,
    )
  },

  {
    immediate: true,
  },
)

timer =
  window.setInterval(
    () => {
      now.value =
        Date.now()
    },
    1000,
  )

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
  <main class="min-h-[calc(100vh-4.5rem)] bg-slate-50 dark:bg-slate-950">
    <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <RouterLink to="/"
        class="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-slate-600 transition hover:text-cyan-700 focus-visible:outline-none dark:text-slate-300 dark:hover:text-cyan-400">
        <ArrowLeft :size="17" aria-hidden="true" />

        Back to station search
      </RouterLink>

      <div v-if="
        detailStore.catalogueLoading
      "
        class="mt-10 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <LoaderCircle :size="20" class="animate-spin" aria-hidden="true" />

        Loading verified station information…
      </div>

      <div v-else-if="
        detailStore.pageErrorMessage &&
        !displayStation
      " role="alert"
        class="mt-10 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
        <div class="flex items-start gap-3">
          <CircleAlert :size="20" class="mt-0.5 shrink-0" aria-hidden="true" />

          <div>
            <h1 class="font-bold">
              Station unavailable
            </h1>

            <p class="mt-1 text-sm">
              {{
                detailStore.pageErrorMessage
              }}
            </p>
          </div>
        </div>
      </div>

      <template v-else-if="
        displayStation
      ">
        <section
          class="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="p-6 sm:p-8">
            <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div class="max-w-3xl">
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300">
                    <BadgeCheck :size="14" aria-hidden="true" />

                    Verified Heidelberg station
                  </span>

                  <span class="rounded-full px-3 py-1.5 text-xs font-bold" :class="status.classes
                    ">
                    {{ status.label }}
                  </span>
                </div>

                <h1 class="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
                  {{
                    displayStation.name
                  }}
                </h1>

                <p v-if="
                  displayStation.brand
                " class="mt-2 text-lg font-medium text-slate-500 dark:text-slate-400">
                  {{
                    displayStation.brand
                  }}
                </p>

                <div class="mt-6 flex flex-col gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <div v-if="address" class="flex items-start gap-2">
                    <MapPin :size="17" class="mt-0.5 shrink-0 text-cyan-700 dark:text-cyan-400" aria-hidden="true" />

                    <span>
                      {{ address }}
                    </span>
                  </div>

                  <div v-if="
                    displayStation.districtName
                  " class="flex items-center gap-2">
                    <MapPin :size="17" class="shrink-0 text-slate-400" aria-hidden="true" />

                    <span>
                      District:
                      <strong class="font-semibold text-slate-800 dark:text-slate-100">
                        {{
                          displayStation.districtName
                        }}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <div class="flex shrink-0 flex-col gap-3 sm:flex-row">
                <button type="button" :disabled="requestDisabled
                  " class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-800 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                  @click="
                    requestLiveDetails
                  ">
                  <LoaderCircle v-if="
                    detailStore.liveLoading
                  " :size="18" class="animate-spin" aria-hidden="true" />

                  <RefreshCw v-else :size="18" aria-hidden="true" />

                  {{ requestLabel }}
                </button>

                <a v-if="directionsUrl" :href="directionsUrl" target="_blank" rel="noopener noreferrer"
                  class="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-cyan-700 bg-white px-5 text-sm font-bold text-cyan-700 transition hover:bg-cyan-50 focus-visible:outline-none dark:border-cyan-400 dark:bg-slate-900 dark:text-cyan-300 dark:hover:bg-cyan-950/40">
                  <Navigation :size="18" aria-hidden="true" />

                  Get directions
                </a>
              </div>
            </div>
          </div>

          <div
            class="border-t border-slate-200 bg-slate-50 px-6 py-4 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400 sm:px-8">
            Opening this page does not automatically
            request live provider data. Use the button
            above when you want the current station
            prices and status.
          </div>
        </section>
        <section
          class="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8"
          aria-labelledby="opening-hours-heading">
          <div class="flex items-start gap-3">
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300">
              <Clock3 :size="21" aria-hidden="true" />
            </div>

            <div>
              <p class="text-sm font-bold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-400">
                Verified catalogue
              </p>

              <h2 id="opening-hours-heading" class="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                Opening hours
              </h2>

              <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Regular opening hours reported for this station.
              </p>
            </div>
          </div>

          <div v-if="
            openingHoursRows.length > 0
          " class="mt-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <div v-for="
row in openingHoursRows
              " :key="`${row.days}-${row.hours}`
                "
              class="flex flex-col gap-1 border-b border-slate-200 px-4 py-4 last:border-b-0 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <span class="font-semibold text-slate-800 dark:text-slate-100">
                {{ row.days }}
              </span>

              <span class="font-medium tabular-nums text-slate-600 dark:text-slate-300">
                {{ row.hours }}
              </span>
            </div>
          </div>

          <div v-else
            class="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/60">
            <p class="font-semibold text-slate-800 dark:text-slate-200">
              Opening hours unavailable
            </p>

            <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              The verified catalogue does not provide regular opening hours for this station.
            </p>
          </div>

          <p class="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Opening hours are catalogue information. The current
            open or closed status is loaded separately with live
            station details.
          </p>
        </section>
        <SingleStationMap class="mt-8" :latitude="stationLatitude" :longitude="stationLongitude"
          :station-name="displayStation.name" :address="address" />
        <div v-if="
          detailStore.liveErrorMessage
        " role="alert"
          class="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
          <CircleAlert :size="18" class="mt-0.5 shrink-0" aria-hidden="true" />

          <span>
            {{
              detailStore.liveErrorMessage
            }}
          </span>
        </div>

        <section v-if="
          detailStore.hasLiveDetails
        " class="mt-8" aria-labelledby="live-prices-heading">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p class="text-sm font-bold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-400">
                Current prices
              </p>

              <h2 id="live-prices-heading" class="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                Live station details
              </h2>
            </div>

            <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Clock3 :size="16" aria-hidden="true" />

              {{
                retrievedText
                  ? `Retrieved ${retrievedText}`
                  : 'Retrieval time unavailable'
              }}
            </div>
          </div>

          <div class="mt-5 grid gap-4 md:grid-cols-3">
            <article v-for="
item in priceCards
              " :key="item.fuel" class="rounded-2xl border p-5" :class="item.classes
                ">
              <div class="flex items-center gap-2 text-sm font-bold">
                <Fuel :size="17" aria-hidden="true" />

                {{ item.fuel }}
              </div>

              <p class="mt-4 text-3xl font-black tracking-tight">
                {{
                  formatPrice(
                    item.price,
                  )
                }}
              </p>

              <p v-if="
                typeof item.price ===
                'number' &&
                Number.isFinite(
                  item.price,
                ) &&
                item.price > 0
              " class="mt-1 text-xs font-medium opacity-70">
                per litre
              </p>
            </article>
          </div>

          <div
            class="mt-5 rounded-2xl border border-slate-200 bg-white p-5 text-sm dark:border-slate-800 dark:bg-slate-900">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-slate-500 dark:text-slate-400">
                  Current status
                </p>

                <p class="mt-1 font-bold text-slate-950 dark:text-white">
                  {{ status.label }}
                </p>
              </div>

              <div>
                <p class="text-slate-500 dark:text-slate-400">
                  Source
                </p>

                <p class="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                  {{
                    detailStore.source ??
                    'Unavailable'
                  }}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section v-else
          class="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <Fuel :size="32" class="mx-auto text-cyan-700 dark:text-cyan-400" aria-hidden="true" />

          <h2 class="mt-4 text-xl font-bold text-slate-950 dark:text-white">
            Live details have not been requested yet
          </h2>

          <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            The verified catalogue information above
            is available without using the fuel-price
            provider. Load current details when you need
            fresh prices and opening status.
          </p>
        </section>
      </template>
    </div>
  </main>
</template>
