<script>
import { mapActions, mapGetters } from 'vuex'

import InitialsAvatar from '@/components/common/InitialsAvatar.vue'
import { BOOKING_STATUS, bookingStatus } from '@/utils/bookings/bookingStatus'
import { shortId } from '@/utils/common/ids'
import { formatDate } from '@/utils/format/dateTime'
import { ROLE, fullName } from '@/utils/users/userDisplay'
import { copyText } from '@/utils/clipboard'
import notify from '@/utils/notify'
import { toneClasses } from '@/assets/styles/tones'

const EMPTY_COUNTS = Object.freeze({ total: 0, completed: 0 })
const time = (value) => new Date(value ?? 0).getTime()

// Users table (E5 rows, E8 delete). The current admin can't delete themselves (Q16).
export default {
  name: 'AdminUsersTable',
  components: { InitialsAvatar },
  props: {
    users: { type: Array, required: true },
    // Row to highlight, e.g. picked in the top search
    highlightId: { type: String, default: null },
    isLoading: { type: Boolean, default: false },
  },
  emits: ['view', 'edit'],
  data() {
    return {
      // Controlled, so a highlighted user past page 1 can be brought into view
      page: 1,
      pageSize: 10,
      // Ant Design's sorter state ({ columnKey, order }), to find a row's page
      sort: { columnKey: null, order: null },
      scroll: { x: 960 },
    }
  },
  computed: {
    ...mapGetters('auth', { currentUser: 'user' }),
    ...mapGetters('admin/users', ['tripCounts']),
    ...mapGetters('admin/trips', ['tripsByUser']),
    columns() {
      return [
        {
          key: 'user',
          title: 'User',
          sorter: (a, b) => fullName(a).localeCompare(fullName(b)),
        },
        { key: 'email', title: 'E-mail' },
        { key: 'licence', title: 'Licence number', dataIndex: 'licenseNumber' },
        { key: 'role', title: 'Role', width: 130 },
        {
          key: 'signedUp',
          title: 'Signed up',
          sorter: (a, b) => time(a.createdAt) - time(b.createdAt),
          width: 140,
        },
        {
          key: 'trips',
          title: 'Trips',
          sorter: (a, b) => this.countsOf(a).total - this.countsOf(b).total,
          width: 100,
        },
        { key: 'actions', title: 'Actions', align: 'right', width: 150 },
      ]
    },
    pagination() {
      return {
        current: this.page,
        pageSize: this.pageSize,
        pageSizeOptions: ['5', '10', '20', '50'],
        showSizeChanger: true,
      }
    },
    // Rows in the order the table shows them
    displayed() {
      const sorter = this.columns.find((column) => column.key === this.sort.columnKey)?.sorter
      if (!sorter || !this.sort.order) return this.users
      const direction = this.sort.order === 'descend' ? -1 : 1
      return this.users.toSorted((a, b) => direction * sorter(a, b))
    },
  },
  watch: {
    // Jump to the page of the highlighted user
    highlightId: {
      handler(id) {
        this.showRow(id)
      },
      immediate: true,
    },
    users() {
      if (this.highlightId) this.showRow(this.highlightId)
      const lastPage = Math.max(1, Math.ceil(this.users.length / this.pageSize))
      if (this.page > lastPage) this.page = lastPage
    },
  },
  methods: {
    ...mapActions('admin/users', ['deleteUser']),
    showRow(id) {
      const index = id ? this.displayed.findIndex((user) => user._id === id) : -1
      if (index !== -1) this.page = Math.floor(index / this.pageSize) + 1
    },
    onChange({ current, pageSize }, filters, sorter) {
      this.page = current
      this.pageSize = pageSize
      this.sort = { columnKey: sorter?.columnKey ?? null, order: sorter?.order ?? null }
    },
    fullName,
    formatDate,
    shortId,
    countsOf(user) {
      return this.tripCounts[user._id] ?? EMPTY_COUNTS
    },
    isAdmin(user) {
      return user.role === ROLE.ADMIN
    },
    roleClass(user) {
      return toneClasses(this.isAdmin(user) ? 'accent' : 'muted').soft
    },
    isSelf(user) {
      return user._id === this.currentUser?._id
    },
    hasActiveTrip(user) {
      return (this.tripsByUser[user._id] ?? []).some(
        (trip) => bookingStatus(trip) === BOOKING_STATUS.ACTIVE,
      )
    },
    deleteTitle(user) {
      const base = `Delete ${fullName(user)}? Their credit cards will also be removed.`
      return this.hasActiveTrip(user) ? `${base} They have an active trip.` : base
    },
    rowClass(user) {
      // On the cells: Ant Design paints their background over the row's
      return user._id === this.highlightId ? '[&>td]:bg-primary/15' : ''
    },
    async copyEmail(email) {
      try {
        await copyText(email)
        notify.success('E-mail copied')
      } catch {
        notify.error('Could not copy the e-mail')
      }
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
  <a-table
    :columns="columns"
    :data-source="users"
    :row-key="(user) => user._id"
    :row-class-name="rowClass"
    :pagination="pagination"
    :loading="isLoading"
    :scroll="scroll"
    size="middle"
    @change="onChange"
  >
    <template #bodyCell="{ column, record }">
      <div v-if="column.key === 'user'" class="flex items-center gap-3">
        <InitialsAvatar :user="record" :size="32" />
        <div class="min-w-0">
          <p class="m-0 truncate text-label-lg">{{ fullName(record) }}</p>
          <p class="m-0 text-label-sm text-muted-foreground">{{ shortId(record._id) }}</p>
        </div>
      </div>

      <span v-else-if="column.key === 'email'" class="inline-flex items-center gap-1">
        <span class="truncate">{{ record.email }}</span>
        <a-button
          type="text"
          size="small"
          :aria-label="`Copy e-mail ${record.email}`"
          @click="copyEmail(record.email)"
        >
          <template #icon><CopyOutlined /></template>
        </a-button>
      </span>

      <span v-else-if="column.key === 'licence'" class="uppercase">{{ record.licenseNumber }}</span>

      <span
        v-else-if="column.key === 'role'"
        class="inline-flex rounded-full px-2.5 py-0.5 text-label-md"
        :class="roleClass(record)"
      >
        {{ isAdmin(record) ? 'Admin' : 'User' }}
      </span>

      <template v-else-if="column.key === 'signedUp'">{{ formatDate(record.createdAt) }}</template>

      <span v-else-if="column.key === 'trips'">
        <span aria-hidden="true">
          {{ countsOf(record).completed }} / {{ countsOf(record).total }}
        </span>
        <span class="sr-only">
          {{ countsOf(record).completed }} completed of {{ countsOf(record).total }} trips
        </span>
      </span>

      <div v-else-if="column.key === 'actions'" class="flex justify-end gap-1">
        <a-button
          type="text"
          size="small"
          :aria-label="`View ${fullName(record)}`"
          @click="$emit('view', record)"
        >
          <template #icon><EyeOutlined /></template>
        </a-button>
        <a-button
          type="text"
          size="small"
          :aria-label="`Edit ${fullName(record)}`"
          @click="$emit('edit', record)"
        >
          <template #icon><EditOutlined /></template>
        </a-button>
        <a-popconfirm
          v-if="!isSelf(record)"
          :title="deleteTitle(record)"
          ok-text="Delete"
          ok-type="default"
          :ok-button-props="{ danger: true }"
          cancel-text="Cancel"
          placement="topRight"
          @confirm="remove(record)"
        >
          <a-button type="text" size="small" danger :aria-label="`Delete ${fullName(record)}`">
            <template #icon><DeleteOutlined /></template>
          </a-button>
        </a-popconfirm>
      </div>
    </template>
  </a-table>
</template>
