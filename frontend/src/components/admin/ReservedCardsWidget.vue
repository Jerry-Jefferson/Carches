<script>
import { mapActions, mapGetters } from 'vuex'

import { reservedRowKey } from '@/utils/admin/reservedCards'
import { formatCoords } from '@/utils/geo/geoFormat'

// Reserved cars by whether the booker's credit card is authorised (E15). A failed load is
// shown as an error, never as "no reserved cars".
export default {
  name: 'ReservedCardsWidget',
  emits: ['show-on-map'],
  data() {
    return {
      isSwitching: false,
      options: [
        { value: false, label: 'Card not authorised' },
        { value: true, label: 'Card authorised' },
      ],
    }
  },
  computed: {
    ...mapGetters('admin/fleet', ['reservedAuthorized', 'isLoadingWidgets']),
    ...mapGetters('admin/fleet', { error: 'reservedError' }),
    ...mapGetters('admin/fleet', { rows: 'reservedRows' }),
    ...mapGetters('cars', { cars: 'items' }),
    // E15 rows have no car id, only the VIN
    carsByVin() {
      return new Map(this.cars.map((car) => [car.vin, car]))
    },
  },
  methods: {
    ...mapActions('admin/fleet', ['fetchReserved']),
    async select(authorized) {
      this.isSwitching = true
      try {
        await this.fetchReserved(authorized)
      } catch {
        // kept in `error` and shown in the widget
      } finally {
        this.isSwitching = false
      }
    },
    carOf(row) {
      return this.carsByVin.get(row.vin) ?? null
    },
    rowKey: reservedRowKey,
    driver(row) {
      return [row.userFirstName, row.userLastName].filter(Boolean).join(' ') || 'Unknown driver'
    },
    formatCoords,
  },
}
</script>

<template>
  <section
    class="flex flex-col gap-3 rounded-card bg-card p-4 text-card-foreground shadow-card"
    aria-labelledby="reserved-cards-title"
  >
    <h2 id="reserved-cards-title" class="m-0 text-label-lg">Reserved cars & card authorisation</h2>
    <a-segmented
      :value="reservedAuthorized"
      :options="options"
      :disabled="isSwitching"
      block
      @change="select"
    />

    <a-spin :spinning="isSwitching || isLoadingWidgets">
      <a-alert
        v-if="error"
        type="error"
        show-icon
        message="Reserved cars could not be loaded"
        :description="error"
      >
        <template #action>
          <a-button size="small" :loading="isSwitching" @click="select(reservedAuthorized)">
            Retry
          </a-button>
        </template>
      </a-alert>
      <p v-else-if="!rows.length" class="m-0 py-2 text-body-md text-muted-foreground">
        No reserved cars in this group.
      </p>
      <ul v-else class="m-0 flex list-none flex-col gap-2 p-0">
        <li
          v-for="row in rows"
          :key="rowKey(row)"
          class="flex items-start gap-2 rounded-control bg-surface p-2"
        >
          <div class="min-w-0 flex-1">
            <p class="m-0 text-label-md">{{ driver(row) }}</p>
            <p class="m-0 text-body-sm text-muted-foreground">
              Licence {{ row.userLicenseNumber }} ·
              <code class="font-mono">{{ row.vin }}</code>
            </p>
            <p class="m-0 text-body-sm text-muted-foreground">{{ formatCoords(row.location) }}</p>
          </div>
          <a-button
            v-if="carOf(row)"
            type="link"
            size="small"
            @click="$emit('show-on-map', carOf(row))"
          >
            Show on map
          </a-button>
        </li>
      </ul>
    </a-spin>
  </section>
</template>
