<script setup>
import {
  BadgeEuro,
  MapPinned,
  ShieldCheck,
} from 'lucide-vue-next'

import StationSearchForm from '@/components/search/StationSearchForm.vue'
import StationResults from '@/components/search/StationResults.vue'
</script>

<template>
  <main>
    <section
      class="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
    >
      <div
        class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(8,145,178,0.12),transparent_36%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_36%)]"
      />

      <div
        class="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-18 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:px-8 lg:py-20"
      >
        <div
          class="max-w-3xl lg:pt-8"
        >
          <div
            class="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-300"
          >
            <MapPinned
              :size="16"
              aria-hidden="true"
            />

            Fuel prices for Heidelberg
          </div>

          <h1
            class="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl dark:text-white"
          >
            Find the right fuel price
            <span
              class="text-cyan-700 dark:text-cyan-400"
            >
              without the guesswork.
            </span>
          </h1>

          <p
            class="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300"
          >
            Compare verified Heidelberg fuel stations,
            current prices, distance and availability
            from one clear dashboard.
          </p>

          <div
            class="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            <span
              class="inline-flex items-center gap-2"
            >
              <BadgeEuro
                :size="17"
                class="text-cyan-700 dark:text-cyan-400"
                aria-hidden="true"
              />

              E5, E10 and Diesel
            </span>

            <span
              class="inline-flex items-center gap-2"
            >
              <ShieldCheck
                :size="17"
                class="text-cyan-700 dark:text-cyan-400"
                aria-hidden="true"
              />

              Verified Heidelberg catalogue
            </span>
          </div>
        </div>

        <section
          class="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 sm:p-7"
          aria-labelledby="search-heading"
        >
          <p
            class="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-400"
          >
            Search dashboard
          </p>

          <h2
            id="search-heading"
            class="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white"
          >
            Find stations near you
          </h2>

          <p
            class="mt-3 leading-7 text-slate-600 dark:text-slate-400"
          >
            Choose your fuel, search radius and
            location. FuelFind will return verified
            Heidelberg stations only.
          </p>

          <StationSearchForm />
        </section>
      </div>
    </section>
    <StationResults />
  </main>
</template>
