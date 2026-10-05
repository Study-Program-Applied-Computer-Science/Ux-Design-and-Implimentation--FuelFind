import { ref } from 'vue'
import { defineStore } from 'pinia'

const THEME_STORAGE_KEY = 'fuelfind-theme'

function getInitialTheme() {
  const savedTheme =
    localStorage.getItem(THEME_STORAGE_KEY)

  if (
    savedTheme === 'light' ||
    savedTheme === 'dark'
  ) {
    return savedTheme
  }

  return window.matchMedia(
    '(prefers-color-scheme: dark)',
  ).matches
    ? 'dark'
    : 'light'
}

export const useUiStore = defineStore(
  'ui',
  () => {
    const theme = ref(
      getInitialTheme(),
    )

    function applyTheme() {
      document.documentElement.classList.toggle(
        'dark',
        theme.value === 'dark',
      )

      localStorage.setItem(
        THEME_STORAGE_KEY,
        theme.value,
      )
    }

    function toggleTheme() {
      theme.value =
        theme.value === 'dark'
          ? 'light'
          : 'dark'

      applyTheme()
    }

    applyTheme()

    return {
      theme,
      toggleTheme,
    }
  },
)
