<script>
import { mapActions, mapGetters } from 'vuex'

import PillGroup from '@/components/common/PillGroup.vue'
import { ROUTES, TAB_NAMES } from '@/router/routes.constants'
import { DEFAULT_USER_FILTERS, filterUsers } from '@/utils/admin/consoleFilters'
import { ALL } from '@/utils/common/collections'
import notify from '@/utils/notify'
import { ROLE } from '@/utils/users/userDisplay'
import AdminUsersTable from './AdminUsersTable.vue'
import UserDetailsDrawer from './UserDetailsDrawer.vue'
import UserFormModal from './UserFormModal.vue'

/**
 * Users section of the admin console (E5–E8). `focusId` comes from `?user=`: the user is
 * made visible, highlighted and opened in the details drawer. "View" sets `?user=` too.
 */
export default {
  name: 'AdminUsersSection',
  components: { AdminUsersTable, PillGroup, UserDetailsDrawer, UserFormModal },
  props: {
    focusId: { type: String, default: null },
  },
  data() {
    return {
      editing: null,
      isFormOpen: false,
      isUserLoading: false,
      userError: '',
      userSeq: 0,
    }
  },
  computed: {
    ...mapGetters('admin/users', [
      'filteredUsers',
      'items',
      'filters',
      'isLoading',
      'byId',
      'tripCounts',
    ]),
    ...mapGetters('admin/trips', ['tripsByUser']),
    ...mapGetters('admin/insights', ['now']),
    ...mapGetters('cars', { cars: 'items' }),
    ...mapGetters('auth', { currentUser: 'user' }),
    // Role pill counts respect the search
    roleCounts() {
      const searched = filterUsers(this.items, { ...this.filters, role: ALL })
      return {
        [ALL]: searched.length,
        [ROLE.USER]: searched.filter((user) => user.role === ROLE.USER).length,
        [ROLE.ADMIN]: searched.filter((user) => user.role === ROLE.ADMIN).length,
      }
    },
    roleOptions() {
      return [
        { value: ALL, label: 'All', count: this.roleCounts[ALL] },
        { value: ROLE.USER, label: 'Users', count: this.roleCounts[ROLE.USER] },
        { value: ROLE.ADMIN, label: 'Admins', count: this.roleCounts[ROLE.ADMIN] },
      ]
    },
    showingLabel() {
      return `Showing ${this.filteredUsers.length} of ${this.items.length} users`
    },
    isDrawerOpen() {
      return Boolean(this.focusId)
    },
    // The drawer's user: E6 refreshes it in the store, so the getter brings the fresh copy
    focusedUser() {
      return this.focusId ? this.byId(this.focusId) : null
    },
    focusedTrips() {
      return this.focusId ? (this.tripsByUser[this.focusId] ?? []) : []
    },
    // Re-checked when the users arrive after the query
    focusKey() {
      return this.focusId ? `${this.focusId}:${this.items.length}` : null
    },
  },
  watch: {
    // The drawer is open exactly while `focusId` is set, so this covers opening it too
    focusId: {
      handler(id) {
        if (id) this.loadUser()
      },
      immediate: true,
    },
    focusKey: {
      handler() {
        this.revealFocused()
      },
      immediate: true,
    },
  },
  methods: {
    ...mapActions('admin/users', ['setFilters', 'fetchUser', 'deleteUser']),
    revealFocused() {
      if (!this.focusId) return
      const known = this.items.some((user) => user._id === this.focusId)
      const shown = this.filteredUsers.some((user) => user._id === this.focusId)
      if (known && !shown) this.setFilters(DEFAULT_USER_FILTERS)
    },
    view(user) {
      this.$router.replace({ query: { ...this.$route.query, user: user._id } })
    },
    closeDrawer() {
      this.$router.replace({ query: { ...this.$route.query, user: undefined } })
    },
    onDrawerOpen(isOpen) {
      if (!isOpen) this.closeDrawer()
    },
    // E6 for the details drawer
    async loadUser() {
      const id = this.focusId
      if (!id) return
      // Opening another user while one loads: only the latest answer counts
      const seq = ++this.userSeq
      this.userError = ''
      this.isUserLoading = true
      try {
        await this.fetchUser(id)
      } catch (err) {
        if (seq === this.userSeq) this.userError = err.message
      } finally {
        if (seq === this.userSeq) this.isUserLoading = false
      }
    },
    viewTrip(id) {
      this.$router.push({
        name: ROUTES.ADMIN.NAME,
        query: { ...this.$route.query, tab: TAB_NAMES.ADMIN.TRIPS, trip: id, user: undefined },
      })
    },
    edit(user) {
      this.editing = user
      this.isFormOpen = true
    },
    async remove(user) {
      try {
        await this.deleteUser(user._id)
        notify.success('User deleted')
      } catch (err) {
        notify.apiError(err, 'Could not delete the user')
      }
    },
  },
}
</script>

<template>
  <section class="flex flex-col gap-4" aria-labelledby="admin-users-title">
    <h2 id="admin-users-title" class="sr-only">Users</h2>

    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <a-input-search
          :value="filters.q"
          placeholder="Search name, e-mail or licence"
          allow-clear
          class="sm:w-72"
          aria-label="Search users"
          @update:value="setFilters({ q: $event })"
        />
        <PillGroup
          :model-value="filters.role"
          :options="roleOptions"
          aria-label="Role"
          size="sm"
          @update:model-value="setFilters({ role: $event })"
        />
      </div>
      <p class="m-0 text-body-sm text-muted-foreground" aria-live="polite">{{ showingLabel }}</p>
    </div>

    <div class="rounded-card bg-card p-2 shadow-card">
      <AdminUsersTable
        :users="filteredUsers"
        :highlight-id="focusId"
        :is-loading="isLoading"
        :user-trips="tripsByUser"
        :trip-counts="tripCounts"
        :current-user-id="currentUser?._id"
        :confirm-delete="remove"
        @view="view"
        @edit="edit"
      />
    </div>

    <UserDetailsDrawer
      :open="isDrawerOpen"
      :user="focusedUser"
      :trips="focusedTrips"
      :cars="cars"
      :now="now"
      :loading="isUserLoading"
      :error="userError"
      @update:open="onDrawerOpen"
      @edit="edit"
      @retry="loadUser"
      @view-trip="viewTrip"
    />
    <UserFormModal v-model:open="isFormOpen" :user="editing" />
  </section>
</template>
