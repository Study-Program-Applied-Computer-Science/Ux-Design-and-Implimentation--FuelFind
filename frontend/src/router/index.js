import {
  createRouter,
  createWebHistory,
} from 'vue-router'

import HomeView from '@/views/HomeView.vue'
import CityPricesView from '@/views/CityPricesView.vue'
import StationDetailsView from '@/views/StationDetailsView.vue'

const router = createRouter({
  history:
    createWebHistory(
      import.meta.env.BASE_URL,
    ),

  routes: [
    {
      path: '/',
      name: 'home',
      component:
        HomeView,
    },

    {
      path: '/prices',
      name: 'city-prices',
      component:
        CityPricesView,
    },

    {
      path: '/stations/:stationId',
      name: 'station-details',
      component:
        StationDetailsView,
    },
  ],

  scrollBehavior() {
    return {
      top: 0,
    }
  },
})

export default router
