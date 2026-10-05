<script setup>
import AppHeader from '@/components/layout/AppHeader.vue'
</script>

<template>
  <div
    class="min-h-screen bg-slate-50 text-slate-950 transition-colors dark:bg-slate-950 dark:text-white"
  >
    <AppHeader />

    <RouterView />
  </div>
</template>
