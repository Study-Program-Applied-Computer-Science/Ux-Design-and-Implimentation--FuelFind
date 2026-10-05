<script setup>
import {
  computed,
} from 'vue'

import {
  BadgeEuro,
  Clock3,
  Navigation,
} from 'lucide-vue-next'

const props = defineProps({
  stations: {
    type: Array,
    default: () => [],
  },

  fuel: {
    type: String,
    default: 'e10',
  },
})

const emit =
  defineEmits([
    'clear',
  ])

const fuelLabel =
  computed(() => {
    if (props.fuel === 'e5') {
      return 'E5'
    }

    if (props.fuel === 'diesel') {
      return 'Diesel'
    }

    return 'E10'
  })

const firstStation =
  computed(
    () =>
      props.stations[0] ??
      null,
  )

const secondStation =
  computed(
    () =>
      props.stations[1] ??
      null,
  )

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

function formatPrice(value) {
  return validPrice(value)
    ? `€${value.toFixed(3)}`
    : 'Unavailable'
}

function formatDistance(value) {
  return validDistance(value)
    ? `${value.toFixed(1)} km`
    : 'Unavailable'
}

function formatStatus(station) {
  if (
    station?.isOpen === true
  ) {
    return 'Open now'
  }

  if (
    station?.isOpen === false
  ) {
    return 'Closed'
  }

  return 'Unavailable'
}

const priceSummary =
  computed(() => {
    const first =
      firstStation.value

    const second =
      secondStation.value

    if (!first || !second) {
      return null
    }

    if (
      !validPrice(first.price) ||
      !validPrice(second.price)
    ) {
      return 'Price difference unavailable.'
    }

    const difference =
      first.price -
      second.price

    if (
      Math.abs(difference) <
      0.0005
    ) {
      return `${fuelLabel.value}: same price at both stations.`
    }

    const cheaper =
      difference < 0
        ? first
        : second

    const cents =
      Math.abs(
        difference,
      ) * 100

    return `${cheaper.name} is ${cents.toFixed(1)} ct/L cheaper for ${fuelLabel.value}.`
  })

const distanceSummary =
  computed(() => {
    const first =
      firstStation.value

    const second =
      secondStation.value

    if (!first || !second) {
      return null
    }

    if (
      !validDistance(
        first.distanceKm,
      ) ||
      !validDistance(
        second.distanceKm,
      )
    ) {
      return 'Distance difference unavailable.'
    }

    const difference =
      first.distanceKm -
      second.distanceKm

    if (
      Math.abs(difference) <
      0.05
    ) {
      return 'Both stations are approximately the same distance away.'
    }

    const nearer =
      difference < 0
        ? first
        : second

    return `${nearer.name} is ${Math.abs(difference).toFixed(1)} km nearer.`
  })
</script>

<template>
  <section
    class="mt-6 overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-sm dark:border-cyan-900 dark:bg-slate-900"
    aria-labelledby="comparison-heading"
  >
    <div
      class="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p
          class="text-sm font-bold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-400"
        >
          Station comparison
        </p>

        <h3
          id="comparison-heading"
          class="mt-1 text-xl font-bold text-slate-950 dark:text-white"
        >
          Compare selected stations
        </h3>

        <p
          class="mt-1 text-sm text-slate-500 dark:text-slate-400"
        >
          {{ stations.length }} / 2 selected
        </p>
      </div>

      <button
        type="button"
        class="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        @click="
          emit('clear')
        "
      >
        Clear comparison
      </button>
    </div>

    <div
      v-if="
        stations.length === 1
      "
      class="p-5 sm:p-6"
    >
      <div
        class="rounded-2xl border border-dashed border-cyan-300 bg-cyan-50/60 p-5 dark:border-cyan-900 dark:bg-cyan-950/20"
      >
        <p
          class="font-bold text-slate-900 dark:text-white"
        >
          {{ stations[0].name }} selected
        </p>

        <p
          class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400"
        >
          Select one more station using
          “Add to compare” to see the
          side-by-side comparison.
        </p>
      </div>
    </div>

    <div
      v-else-if="
        stations.length === 2
      "
      class="p-5 sm:p-6"
    >
      <div
        class="grid gap-4 md:grid-cols-2"
      >
        <article
          v-for="
            station in stations
          "
          :key="station.id"
          class="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"
        >
          <p
            class="text-lg font-bold text-slate-950 dark:text-white"
          >
            {{ station.name }}
          </p>

          <p
            v-if="
              station.districtName
            "
            class="mt-1 text-sm text-slate-500 dark:text-slate-400"
          >
            {{ station.districtName }}
          </p>

          <div
            class="mt-5 space-y-3"
          >
            <div
              class="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-950/60"
            >
              <span
                class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
              >
                <BadgeEuro
                  :size="16"
                  aria-hidden="true"
                />

                {{ fuelLabel }}
              </span>

              <strong
                class="text-slate-950 dark:text-white"
              >
                {{
                  formatPrice(
                    station.price,
                  )
                }}
              </strong>
            </div>

            <div
              class="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-950/60"
            >
              <span
                class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
              >
                <Navigation
                  :size="16"
                  aria-hidden="true"
                />

                Distance
              </span>

              <strong
                class="text-slate-950 dark:text-white"
              >
                {{
                  formatDistance(
                    station.distanceKm,
                  )
                }}
              </strong>
            </div>

            <div
              class="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-950/60"
            >
              <span
                class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
              >
                <Clock3
                  :size="16"
                  aria-hidden="true"
                />

                Status
              </span>

              <strong
                class="text-slate-950 dark:text-white"
              >
                {{
                  formatStatus(
                    station,
                  )
                }}
              </strong>
            </div>
          </div>
        </article>
      </div>

      <div
        class="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-5 dark:border-cyan-900 dark:bg-cyan-950/30"
      >
        <p
          class="font-bold text-cyan-900 dark:text-cyan-200"
        >
          {{ priceSummary }}
        </p>

        <p
          class="mt-2 text-sm font-medium text-cyan-800 dark:text-cyan-300"
        >
          {{ distanceSummary }}
        </p>
      </div>
    </div>
  </section>
</template>
