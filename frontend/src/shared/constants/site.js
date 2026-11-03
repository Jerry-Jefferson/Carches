// Static site content: brand, support contacts and footer links.

import { ROUTE_NAMES } from './routes'

export const SITE = Object.freeze({
  name: 'Carshes',
  tagline: 'Next-generation premium urban carsharing',
  city: 'Minsk',
  // Placeholder contacts: replace with the real support channels before release
  support: Object.freeze({
    email: 'support@carshes.by',
    phone: '+375 17 000-00-00',
    phoneHref: 'tel:+375170000000',
  }),
})

export const FOOTER_LINKS = Object.freeze([
  { label: 'Fleet', to: { name: ROUTE_NAMES.FLEET } },
  { label: 'My Trips', to: { name: ROUTE_NAMES.MY_TRIPS } },
  { label: 'My Profile', to: { name: ROUTE_NAMES.MY_PROFILE } },
])
