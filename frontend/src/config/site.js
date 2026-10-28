// Static site content: brand, support contacts and footer links.

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

// Route names, defined in src/router/index.js
export const FOOTER_LINKS = Object.freeze([
  { label: 'Fleet', to: { name: 'fleet' } },
  { label: 'My Trips', to: { name: 'my-trips' } },
  { label: 'My Profile', to: { name: 'my-profile' } },
])
