import { registerSW } from 'virtual:pwa-register'

// Dopo un deploy: nuovo service worker → ricarica automatica (senza F5 manuale).
// I primi secondi ignoriamo `controllerchange` (prima installazione SW, evita doppio caricamento).
let refreshing = false
let allowSwReload = false
setTimeout(() => {
  allowSwReload = true
}, 2500)

navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (!allowSwReload || refreshing) return
  refreshing = true
  window.location.reload()
})

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, r) {
    if (r) {
      void r.update()
      setInterval(() => {
        void r.update()
      }, 90_000)
    }
  },
})
