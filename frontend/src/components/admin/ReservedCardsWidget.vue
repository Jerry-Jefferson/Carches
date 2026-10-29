<script>
import { mapActions, mapState } from 'vuex'

import { formatCoords } from '@/utils/format'
import notify from '@/utils/notify'

// Reserved cars by whether the booker's credit card is authorised (E15)
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
    ...mapState('admin/fleet', ['reserved', 'reservedAuthorized', 'isLoadingWidgets']),
    ...mapState('cars', { cars: 'items' }),
  },
  methods: {
    ...mapActions('admin/fleet', ['fetchReserved']),
    async select(authorized) {
      this.isSwitching = true
      try {
        await this.fetchReserved(authorized)
      } catch (err) {
        notify.apiError(err, 'Could not load the reserved cars')
      } finally {
        this.isSwitching = false
      }
    },
    // E15 rows have no car id, only the VIN
    carOf(row) {
      return this.cars.find((car) => car.vin === row.vin) ?? null
    },
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
      <p v-if="!reserved.length" class="m-0 py-2 text-body-md text-muted-foreground">
        No reserved cars in this group.
      </p>
      <ul v-else class="m-0 flex list-none flex-col gap-2 p-0">
        <li
          v-for="row in reserved"
          :key="row.vin"
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
