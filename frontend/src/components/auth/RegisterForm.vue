<script>
import { SafetyCertificateOutlined } from '@ant-design/icons-vue'
import { toTypedSchema } from '@vee-validate/zod'
import { Field as VeeField, Form as VeeForm } from 'vee-validate'
import { mapActions, mapState } from 'vuex'

import InfoCallout from '@/components/common/InfoCallout.vue'
import { mapAuthError, registerSchema } from './schemas'

const schema = toTypedSchema(registerSchema)

// E1. Creates the account through the auth store (the API signs the user in) and
// emits `success` with the new user. Only the backend fields are sent — not confirmPassword.
export default {
  name: 'RegisterForm',
  components: { VeeForm, VeeField, InfoCallout },
  props: {
    // Initial e-mail, kept when switching between the auth tabs
    email: { type: String, default: '' },
  },
  emits: ['update:email', 'success'],
  data() {
    return {
      schema,
      initialValues: { email: this.email },
      formError: null,
      calloutIcon: SafetyCertificateOutlined,
    }
  },
  computed: {
    ...mapState('auth', ['isSubmitting']),
  },
  methods: {
    ...mapActions('auth', ['signUp']),
    async onSubmit(values, { setFieldError }) {
      this.formError = null
      const { email, password, firstName, lastName, licenseNumber } = values
      try {
        const user = await this.signUp({ email, password, firstName, lastName, licenseNumber })
        this.$emit('success', user)
      } catch (err) {
        const { field, message } = mapAuthError(err)
        if (field) setFieldError(field, message)
        else this.formError = message
      }
    },
    // Licence numbers are stored in upper case; show that before submitting
    normalizeLicence(value, handleChange, handleBlur, event) {
      if (typeof value === 'string') handleChange(value.trim().toUpperCase())
      handleBlur(event)
    },
  },
}
</script>

<template>
  <VeeForm
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
        <VeeField v-slot="{ value, handleChange, handleBlur, errorMessage }" name="firstName">
          <a-form-item
            label="First name"
            name="firstName"
            :validate-status="errorMessage ? 'error' : ''"
            :help="errorMessage"
          >
            <a-input
              :value="value"
              size="large"
              placeholder="Vera"
              autocomplete="given-name"
              :disabled="isSubmitting"
              @update:value="handleChange"
              @blur="handleBlur"
            >
              <template #prefix><UserOutlined class="text-muted-foreground" /></template>
            </a-input>
          </a-form-item>
        </VeeField>

        <VeeField v-slot="{ value, handleChange, handleBlur, errorMessage }" name="lastName">
          <a-form-item
            label="Last name"
            name="lastName"
            :validate-status="errorMessage ? 'error' : ''"
            :help="errorMessage"
          >
            <a-input
              :value="value"
              size="large"
              placeholder="Davydova"
              autocomplete="family-name"
              :disabled="isSubmitting"
              @update:value="handleChange"
              @blur="handleBlur"
            >
              <template #prefix><UserOutlined class="text-muted-foreground" /></template>
            </a-input>
          </a-form-item>
        </VeeField>
      </div>

      <VeeField v-slot="{ value, handleChange, handleBlur, errorMessage }" name="licenseNumber">
        <a-form-item
          label="Driver's licence number"
          name="licenseNumber"
          :validate-status="errorMessage ? 'error' : ''"
          :help="errorMessage"
        >
          <a-input
            :value="value"
            size="large"
            placeholder="MP1234567"
            autocomplete="off"
            :disabled="isSubmitting"
            @update:value="handleChange"
            @blur="normalizeLicence(value, handleChange, handleBlur, $event)"
          >
            <template #prefix><IdcardOutlined class="text-muted-foreground" /></template>
          </a-input>
        </a-form-item>
      </VeeField>

      <VeeField v-slot="{ value, handleChange, handleBlur, errorMessage }" name="email">
        <a-form-item
          label="Email"
          name="email"
          :validate-status="errorMessage ? 'error' : ''"
          :help="errorMessage"
        >
          <a-input
            :value="value"
            size="large"
            type="email"
            placeholder="name@carshes.by"
            autocomplete="email"
            :disabled="isSubmitting"
            @update:value="
              (next) => {
                handleChange(next)
                $emit('update:email', next)
              }
            "
            @blur="handleBlur"
          >
            <template #prefix><MailOutlined class="text-muted-foreground" /></template>
          </a-input>
        </a-form-item>
      </VeeField>

      <div class="grid gap-x-4 md:grid-cols-2">
        <VeeField v-slot="{ value, handleChange, handleBlur, errorMessage }" name="password">
          <a-form-item
            label="Password"
            name="password"
            :validate-status="errorMessage ? 'error' : ''"
            :help="errorMessage"
          >
            <a-input-password
              :value="value"
              size="large"
              placeholder="At least 8 characters"
              autocomplete="new-password"
              :disabled="isSubmitting"
              @update:value="handleChange"
              @blur="handleBlur"
            >
              <template #prefix><LockOutlined class="text-muted-foreground" /></template>
            </a-input-password>
          </a-form-item>
        </VeeField>

        <VeeField v-slot="{ value, handleChange, handleBlur, errorMessage }" name="confirmPassword">
          <a-form-item
            label="Confirm password"
            name="confirmPassword"
            :validate-status="errorMessage ? 'error' : ''"
            :help="errorMessage"
          >
            <a-input-password
              :value="value"
              size="large"
              placeholder="Repeat the password"
              autocomplete="new-password"
              :disabled="isSubmitting"
              @update:value="handleChange"
              @blur="handleBlur"
            >
              <template #prefix><LockOutlined class="text-muted-foreground" /></template>
            </a-input-password>
          </a-form-item>
        </VeeField>
      </div>

      <InfoCallout class="mb-6" title="Driver's licence" :icon="calloutIcon">
        Your driver's licence number is required to book a car.
      </InfoCallout>

      <a-button
        type="primary"
        html-type="submit"
        size="large"
        block
        class="rounded-full"
        :loading="isSubmitting"
      >
        Create Account
        <CheckCircleOutlined />
      </a-button>
    </a-form>
  </VeeForm>
</template>
