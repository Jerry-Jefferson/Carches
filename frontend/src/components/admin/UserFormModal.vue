<script>
import { toTypedSchema } from '@vee-validate/zod'
import { Field as VeeField, Form as VeeForm } from 'vee-validate'
import { mapActions, mapState } from 'vuex'

import notify from '@/utils/notify'
import { mapUserError, userSchema } from './userSchema'

const schema = toTypedSchema(userSchema)

const FIELDS = [
  { name: 'firstName', label: 'First name', autocomplete: 'off' },
  { name: 'lastName', label: 'Last name', autocomplete: 'off' },
  { name: 'email', label: 'E-mail', autocomplete: 'off' },
  { name: 'licenseNumber', label: "Driver's licence number", autocomplete: 'off' },
]

// Edit a user (E7). Only the four profile fields are sent; role and password can't be
// changed through the API (Q10).
export default {
  name: 'UserFormModal',
  components: { VeeForm, VeeField },
  props: {
    open: { type: Boolean, default: false },
    user: { type: Object, default: null },
  },
  emits: ['update:open', 'saved'],
  data() {
    return {
      schema,
      fields: FIELDS,
      formError: null,
    }
  },
  computed: {
    ...mapState('admin/users', ['isMutating']),
    initialValues() {
      const user = this.user ?? {}
      return {
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        email: user.email ?? '',
        licenseNumber: user.licenseNumber ?? '',
      }
    },
    roleLabel() {
      return this.user?.role === 'admin' ? 'Administrator' : 'User'
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) this.formError = null
    },
  },
  methods: {
    ...mapActions('admin/users', ['updateUser']),
    async onSubmit(values, { setFieldError }) {
      this.formError = null
      const { firstName, lastName, email, licenseNumber } = values
      const changes = { firstName, lastName, email, licenseNumber }
      try {
        const user = await this.updateUser({ id: this.user._id, changes })
        notify.success('User updated')
        this.$emit('saved', user)
        this.close()
      } catch (err) {
        const { field, message } = mapUserError(err, changes)
        if (field) setFieldError(field, message)
        else this.formError = message
      }
    },
    close() {
      this.$emit('update:open', false)
    },
  },
}
</script>

<template>
  <a-modal
    :open="open"
    title="Edit user"
    :width="560"
    :footer="null"
    :mask-closable="!isMutating"
    :closable="!isMutating"
    destroy-on-close
    @cancel="close"
  >
    <VeeForm
      v-if="user"
      v-slot="{ handleSubmit }"
      :validation-schema="schema"
      :initial-values="initialValues"
      as="div"
    >
      <a-form layout="vertical" @submit="handleSubmit($event, onSubmit)">
        <a-alert
          v-if="formError"
          class="mb-4"
          type="error"
          show-icon
          :message="formError"
          role="alert"
        />

        <div class="grid gap-x-4 md:grid-cols-2">
          <VeeField
            v-for="field in fields"
            :key="field.name"
            v-slot="{ value, handleChange, handleBlur, errorMessage }"
            :name="field.name"
          >
            <a-form-item
              :label="field.label"
              :name="field.name"
              :validate-status="errorMessage ? 'error' : ''"
              :help="errorMessage"
            >
              <a-input
                :value="value"
                :autocomplete="field.autocomplete"
                :disabled="isMutating"
                @update:value="handleChange"
                @blur="handleBlur"
              />
            </a-form-item>
          </VeeField>
        </div>

        <a-form-item label="Role">
          <a-input :value="roleLabel" disabled />
          <p class="m-0 mt-1 text-body-sm text-muted-foreground">Roles can't be changed here.</p>
        </a-form-item>

        <div class="flex justify-end gap-2">
          <a-button :disabled="isMutating" @click="close">Cancel</a-button>
          <a-button type="primary" html-type="submit" :loading="isMutating">Save changes</a-button>
        </div>
      </a-form>
    </VeeForm>
  </a-modal>
</template>
