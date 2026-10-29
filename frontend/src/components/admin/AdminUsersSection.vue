<script>
import { mapActions, mapGetters, mapState } from 'vuex'

import PillGroup from '@/components/common/PillGroup.vue'
import { ALL, DEFAULT_USER_FILTERS, ROLE, filterUsers } from '@/utils/admin'
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
    }
  },
  computed: {
    ...mapState('admin/users', ['items', 'filters', 'isLoading']),
    ...mapGetters('admin/users', ['filteredUsers']),
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
    // Re-checked when the users arrive after the query
    focusKey() {
      return this.focusId ? `${this.focusId}:${this.items.length}` : null
    },
  },
  watch: {
    focusKey: {
      handler() {
        this.revealFocused()
      },
      immediate: true,
    },
  },
  methods: {
    ...mapActions('admin/users', ['setFilters']),
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
    edit(user) {
      this.editing = user
      this.isFormOpen = true
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
        @view="view"
        @edit="edit"
      />
    </div>

    <UserDetailsDrawer
      :open="isDrawerOpen"
      :user-id="focusId"
      @update:open="onDrawerOpen"
      @edit="edit"
    />
    <UserFormModal v-model:open="isFormOpen" :user="editing" />
  </section>
</template>
