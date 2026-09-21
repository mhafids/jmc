
import '@tabler/core/dist/js/tabler.min.js'
import { initCustomScripts } from '~/assets/js/tabler.custom.js'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => {
    initCustomScripts()
  })

  nuxtApp.hook('page:finish', () => {
    setTimeout(() => {
      initCustomScripts()
    }, 50)
  })
})
