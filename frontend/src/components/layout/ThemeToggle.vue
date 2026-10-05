<script setup>
import {
  Moon,
  Sun,
} from 'lucide-vue-next'

import { useUiStore } from '@/stores/uiStore'

const ui = useUiStore()
</script>

<template>
  <button
    type="button"
    class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    :aria-label="
      ui.theme === 'dark'
        ? 'Switch to light mode'
        : 'Switch to dark mode'
    "
    :title="
      ui.theme === 'dark'
        ? 'Light mode'
        : 'Dark mode'
    "
    @click="ui.toggleTheme"
  >
    <Sun
      v-if="ui.theme === 'dark'"
      :size="19"
      aria-hidden="true"
    />

    <Moon
      v-else
      :size="19"
      aria-hidden="true"
    />
  </button>
</template>
