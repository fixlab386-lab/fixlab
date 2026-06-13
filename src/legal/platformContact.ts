/**
 * Contatti del fornitore della piattaforma FIXLab (privacy, cookie, assistenza su account/App).
 * Modifica `email` se l’indirizzo @fixlab reale è diverso.
 */
export const PLATFORM_PROVIDER_CONTACT = {
  displayName: 'Samuele Lazzaro',
  email: 'info@fixlab.it',
  phoneDisplay: '+39 302 069 1067',
  /** Valore per attributo `href` del link telefonico */
  phoneHref: 'tel:+393020691067',
} as const

export const platformProviderMailto = `mailto:${PLATFORM_PROVIDER_CONTACT.email}` as const
