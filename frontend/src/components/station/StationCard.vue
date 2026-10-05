<script setup>
import {
  computed,
} from 'vue'

import {
  ArrowRight,
  Clock3,
  Fuel,
  MapPin,
  Navigation,
} from 'lucide-vue-next'

const props = defineProps({
  station: {
    type: Object,
    required: true,
  },

  fuel: {
    type: String,
    required: true,
  },

  selected: {
    type: Boolean,
    default: false,
  },

  compared: {
    type: Boolean,
    default: false,
  },

  comparisonDisabled: {
    type: Boolean,
    default: false,
  },
})

const emit =
  defineEmits([
    'select',
    'toggle-compare',
  ])

const fuelLabel =
  computed(() => {
    if (
      props.fuel === 'e5'
    ) {
      return 'E5'
    }

    if (
      props.fuel === 'e10'
    ) {
      return 'E10'
    }

    return 'Diesel'
  })

const hasPrice =
  computed(
    () =>
      typeof props.station
        .price === 'number' &&
      Number.isFinite(
        props.station.price,
      ) &&
      props.station.price > 0,
  )

const priceText =
  computed(() =>
    hasPrice.value
      ? `€${props.station.price.toFixed(3)}`
      : 'Unavailable',
  )

const distanceText =
  computed(() =>
    typeof props.station
      .distanceKm === 'number' &&
    Number.isFinite(
      props.station.distanceKm,
    )
      ? `${props.station.distanceKm.toFixed(1)} km`
      : 'Distance unavailable',
  )

const status =
  computed(() => {
    if (
      props.station.isOpen === true
    ) {
      return {
        label: 'Open now',
        classes:
          'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-400/20',
      }
    }

    if (
      props.station.isOpen === false
    ) {
      return {
        label: 'Closed',
        classes:
          'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-400/20',
      }
    }

    return {
      label: 'Status unavailable',
      classes:
        'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-400/20',
    }
  })

const priceClasses =
  computed(() => {
    if (!hasPrice.value) {
      return 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
    }

    if (
      props.fuel === 'e5'
    ) {
      return 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300'
    }

    if (
      props.fuel === 'e10'
    ) {
      return 'border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300'
    }

    return 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
  })

const address =
  computed(() => {
    const firstLine =
      [
        props.station.street,
        props.station.houseNumber,
      ]
        .filter(Boolean)
        .join(' ')

    const secondLine =
      [
        props.station.postCode,
        props.station.place,
      ]
        .filter(Boolean)
        .join(' ')

    return [
      firstLine,
      secondLine,
    ]
      .filter(Boolean)
      .join(', ')
  })

function selectCard() {
  emit(
    'select',
    props.station.id,
  )
}

function toggleComparison() {
  emit(
    'toggle-compare',
    props.station.id,
  )
}
</script>

<template>
  <article
    :id="
      `station-card-${station.id}`
    "
    class="group overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900"
    :class="
      selected
        ? 'border-cyan-500 ring-2 ring-cyan-500/20 dark:border-cyan-400 dark:ring-cyan-400/20'
        : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
    "
  >
    <div
      role="button"
      tabindex="0"
      :aria-pressed="selected"
      :aria-label="
        `Select ${station.name} on the map`
      "
      class="cursor-pointer p-5 focus-visible:outline-none"
      @click="selectCard"
      @keydown.enter="selectCard"
      @keydown.space.prevent="selectCard"
    >
      <div
        class="flex items-start justify-between gap-4"
      >
        <div class="min-w-0">
          <div
            class="flex flex-wrap items-center gap-2"
          >
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset"
              :class="
                status.classes
              "
            >
              <Clock3
                :size="13"
                aria-hidden="true"
              />

              {{ status.label }}
            </span>

            <span
              v-if="
                station.districtName
              "
              class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              {{
                station.districtName
              }}
            </span>

            <span
              v-if="compared"
              class="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300"
            >
              Selected to compare
            </span>
          </div>

          <h3
            class="mt-4 text-lg font-bold leading-6 text-slate-950 dark:text-white"
          >
            {{ station.name }}
          </h3>

          <p
            v-if="station.brand"
            class="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400"
          >
            {{ station.brand }}
          </p>
        </div>

        <div
          class="shrink-0 rounded-2xl border px-4 py-3 text-right"
          :class="
            priceClasses
          "
        >
          <div
            class="flex items-center justify-end gap-1.5 text-xs font-bold uppercase tracking-wide"
          >
            <Fuel
              :size="13"
              aria-hidden="true"
            />

            {{ fuelLabel }}
          </div>

          <p
            class="mt-1 text-xl font-black tracking-tight"
          >
            {{ priceText }}
          </p>

          <p
            v-if="hasPrice"
            class="mt-0.5 text-xs font-medium opacity-70"
          >
            per litre
          </p>
        </div>
      </div>

      <div
        class="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300 sm:grid-cols-2"
      >
        <div
          class="flex items-start gap-2"
        >
          <MapPin
            :size="16"
            class="mt-0.5 shrink-0 text-slate-400"
            aria-hidden="true"
          />

          <span>
            {{
              address ||
              'Address unavailable'
            }}
          </span>
        </div>

        <div
          class="flex items-center gap-2 sm:justify-end"
        >
          <Navigation
            :size="16"
            class="shrink-0 text-cyan-700 dark:text-cyan-400"
            aria-hidden="true"
          />

          <span
            class="font-semibold"
          >
            {{ distanceText }}
          </span>
        </div>
      </div>
    </div>

    <div
      class="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/40 sm:flex-row sm:items-center sm:justify-between"
    >
      <button
        type="button"
        :disabled="
          comparisonDisabled &&
          !compared
        "
        :aria-pressed="compared"
        class="inline-flex min-h-10 items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-bold transition focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        :class="
          compared
            ? 'border-cyan-600 bg-cyan-50 text-cyan-800 dark:border-cyan-400 dark:bg-cyan-950/50 dark:text-cyan-300'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
        "
        @click="toggleComparison"
      >
        {{
          compared
            ? 'Remove from compare'
            : comparisonDisabled
              ? 'Compare limit reached'
              : 'Add to compare'
        }}
      </button>

      <RouterLink
        :to="{
          name:
            'station-details',

          params: {
            stationId:
              station.id,
          },
        }"
        class="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-2 py-1.5 text-sm font-bold text-cyan-700 transition hover:bg-cyan-50 hover:text-cyan-800 focus-visible:outline-none dark:text-cyan-400 dark:hover:bg-cyan-950/40 dark:hover:text-cyan-300"
      >
        View details

        <ArrowRight
          :size="16"
          aria-hidden="true"
        />
      </RouterLink>
    </div>
  </article>
</template>
