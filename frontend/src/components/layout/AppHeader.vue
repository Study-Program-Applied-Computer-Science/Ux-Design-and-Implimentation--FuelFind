<script setup>
import {
  Fuel,
  MapPin,
} from 'lucide-vue-next'

import ThemeToggle from './ThemeToggle.vue'
</script>

<template>
  <header
    class="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90"
  >
    <div
      class="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8"
    >
      <div
        class="flex min-w-0 items-center gap-6"
      >
        <RouterLink
          to="/"
          class="group inline-flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline-none"
          aria-label="FuelFind home"
        >
          <span
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-sm transition group-hover:bg-cyan-700 dark:bg-cyan-500 dark:text-slate-950 dark:group-hover:bg-cyan-400"
          >
            <Fuel
              :size="22"
              aria-hidden="true"
            />
          </span>

          <span>
            <span
              class="block text-lg font-bold tracking-tight text-slate-950 dark:text-white"
            >
              FuelFind
            </span>

            <span
              class="hidden items-center gap-1 text-xs font-medium text-slate-500 sm:flex dark:text-slate-400"
            >
              <MapPin
                :size="12"
                aria-hidden="true"
              />

              Heidelberg
            </span>
          </span>
        </RouterLink>

        <nav
          class="hidden items-center gap-1 md:flex"
          aria-label="Primary navigation"
        >
          <RouterLink
            to="/"
            class="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            exact-active-class="bg-cyan-50 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300"
          >
            Find stations
          </RouterLink>

          <RouterLink
            to="/prices"
            class="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            active-class="bg-cyan-50 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300"
          >
            Heidelberg prices
          </RouterLink>
        </nav>
      </div>

      <div
        class="flex shrink-0 items-center gap-2"
      >
        <ThemeToggle />
      </div>
    </div>

    <nav
      class="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden dark:border-slate-800"
      aria-label="Mobile navigation"
    >
      <RouterLink
        to="/"
        class="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300"
        exact-active-class="bg-cyan-50 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300"
      >
        Find stations
      </RouterLink>

      <RouterLink
        to="/prices"
        class="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300"
        active-class="bg-cyan-50 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300"
      >
        Heidelberg prices
      </RouterLink>
    </nav>
  </header>
</template>
