<script>
import { DEFAULT_CENTER } from '@/utils/geo'
import { toneClasses } from '@/theme/tones'

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

// Leaflet (~150 kB) is fetched only when the first map is shown
const loadLeaflet = () =>
  Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]).then(
    ([module]) => module.default ?? module,
  )

const markerHtml = (tone, isUser) =>
  isUser
    ? '<span class="block size-4 rounded-full border-2 border-surface bg-info shadow-popover ring-4 ring-info/25"></span>'
    : `<span class="block size-5 rounded-full border-2 border-surface shadow-popover ${toneClasses(tone).solid}"></span>`

/**
 * Leaflet + OpenStreetMap map.
 * - markers: [{ id, lat, lng, tone?, label }] — tone colours the dot (utils/derive tones)
 * - userLocation: { lat, lng } shown as a blue dot
 * - `popup` scoped slot ({ marker }) is shown when a marker is clicked or openPopup(id) is called
 * - pickable: clicking the map emits `pick` with { lat, lng } (location pickers)
 */
export default {
  name: 'MapView',
  props: {
    markers: { type: Array, default: () => [] },
    center: { type: Object, default: () => DEFAULT_CENTER },
    zoom: { type: Number, default: 13 },
    userLocation: { type: Object, default: null },
    // Zoom to show every marker (and the user) whenever markers change
    fitBounds: { type: Boolean, default: true },
    pickable: { type: Boolean, default: false },
    ariaLabel: { type: String, default: 'Map' },
  },
  emits: ['pick', 'marker-click', 'ready'],
  data() {
    return {
      isLoading: true,
      loadError: false,
      activeMarkerId: null,
    }
  },
  computed: {
    activeMarker() {
      return this.markers.find((marker) => marker.id === this.activeMarkerId) ?? null
    },
  },
  watch: {
    markers: {
      handler() {
        this.renderMarkers()
      },
      deep: true,
    },
    userLocation: {
      handler() {
        this.renderMarkers()
      },
      deep: true,
    },
    center(value) {
      this.map?.setView([value.lat, value.lng], this.map.getZoom())
    },
  },
  async mounted() {
    try {
      this.L = await loadLeaflet()
    } catch {
      this.loadError = true
      this.isLoading = false
      return
    }
    // The component may have been unmounted while Leaflet was loading
    if (!this.$refs.container) return

    const L = this.L
    this.map = L.map(this.$refs.container, { zoomControl: true }).setView(
      [this.center.lat, this.center.lng],
      this.zoom,
    )
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(this.map)
    this.layer = L.layerGroup().addTo(this.map)

    if (this.pickable) {
      this.map.on('click', (event) => {
        this.$emit('pick', { lat: event.latlng.lat, lng: event.latlng.lng })
      })
    }
    this.map.on('popupclose', () => this.returnPopupContent())

    // Maps inside drawers and tabs get their real size only after they open
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize())
    this.resizeObserver.observe(this.$refs.container)

    this.isLoading = false
    this.renderMarkers()
    this.$emit('ready')
  },
  beforeUnmount() {
    this.resizeObserver?.disconnect()
    this.returnPopupContent()
    this.map?.remove()
    this.map = null
  },
  methods: {
    renderMarkers() {
      if (!this.map) return
      const L = this.L
      this.layer.clearLayers()
      this.markerById = new Map()

      for (const marker of this.markers) {
        const leafletMarker = L.marker([marker.lat, marker.lng], {
          icon: L.divIcon({ html: markerHtml(marker.tone), className: '', iconSize: [20, 20] }),
          title: marker.label,
          alt: marker.label,
          keyboard: true,
        })
        leafletMarker.on('click', () => this.openPopup(marker.id))
        leafletMarker.addTo(this.layer)
        this.markerById.set(marker.id, leafletMarker)
      }

      if (this.userLocation) {
        L.marker([this.userLocation.lat, this.userLocation.lng], {
          icon: L.divIcon({ html: markerHtml(null, true), className: '', iconSize: [16, 16] }),
          title: 'Your location',
          alt: 'Your location',
          interactive: false,
        }).addTo(this.layer)
      }

      if (this.fitBounds) this.fitToContent()
    },
    fitToContent() {
      const points = this.markers.map((marker) => [marker.lat, marker.lng])
      if (this.userLocation) points.push([this.userLocation.lat, this.userLocation.lng])
      if (points.length === 1) this.map.setView(points[0], Math.max(this.map.getZoom(), 15))
      if (points.length > 1) this.map.fitBounds(points, { padding: [32, 32], maxZoom: 16 })
    },
    // Public: also used by "Show on map" buttons through a template ref
    async openPopup(id) {
      const leafletMarker = this.markerById?.get(id)
      if (!leafletMarker) return
      this.activeMarkerId = id
      this.$emit('marker-click', id)
      if (!this.$slots.popup) return

      await this.$nextTick()
      this.map.setView(leafletMarker.getLatLng(), Math.max(this.map.getZoom(), 15))
      this.L.popup({ offset: [0, -6], maxWidth: 280 })
        .setLatLng(leafletMarker.getLatLng())
        .setContent(this.$refs.popupContent)
        .openOn(this.map)
    },
    // Leaflet moves the slot element into its popup; put it back so Vue keeps owning it
    returnPopupContent() {
      const content = this.$refs.popupContent
      if (content && this.$refs.popupHost && content.parentNode !== this.$refs.popupHost) {
        this.$refs.popupHost.appendChild(content)
      }
    },
  },
}
</script>

<template>
  <div class="relative isolate overflow-hidden rounded-card bg-muted">
    <div ref="container" class="size-full min-h-48" role="region" :aria-label="ariaLabel" />
    <div
      v-if="isLoading || loadError"
      class="absolute inset-0 flex items-center justify-center text-body-md text-muted-foreground"
    >
      <a-spin v-if="isLoading" />
      <span v-else>The map could not be loaded.</span>
    </div>
    <div ref="popupHost" class="hidden">
      <div ref="popupContent" class="font-sans text-popover-foreground">
        <slot v-if="activeMarker" name="popup" :marker="activeMarker" />
      </div>
    </div>
  </div>
</template>
