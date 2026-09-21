
import jQuery from 'jquery'

export default defineNuxtPlugin(() => {
  if (typeof window !== 'undefined') {
    window.$ = jQuery
    window.jQuery = jQuery
  }
})
