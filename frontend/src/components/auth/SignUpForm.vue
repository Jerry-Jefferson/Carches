<script>
import { SafetyCertificateOutlined } from '@ant-design/icons-vue'
import { toTypedSchema } from '@vee-validate/zod'
import { Field as VeeField, Form as VeeForm } from 'vee-validate'
import { mapActions, mapGetters } from 'vuex'
import { z } from 'zod'

import InfoCallout from '@/components/common/InfoCallout.vue'
import { mapAuthError } from '@/utils/formErrors'

// Rules mirror the backend (middleware/validateAuthBody.js, models/user.model.js). bcrypt
// reads only the first 72 bytes of a password, so the backend rejects longer ones.
const filled = (label) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
// `upper` upper-cases before the length checks, like the backend ('ß' becomes 'SS')
const sized = (label, min, max, upper = false) =>
  (upper ? filled(label).toUpperCase() : filled(label))
    .min(min, `${label} must be at least ${min} characters long`)
    .max(max, `${label} cannot exceed ${max} characters`)
const bytes = (value) => new TextEncoder().encode(value).length
const password = z.string({ required_error: 'Password is required' })
const confirmPassword = z.string({ required_error: 'Confirm your password' })

export const signUpSchema = z.intersection(
  z.object({
    firstName: sized('First name', 2, 50),
    lastName: sized('Last name', 2, 50),
    licenseNumber: sized('Licence number', 6, 20, true),
    email: filled('Email')
      .max(254, 'Email cannot exceed 254 characters')
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email'),
    password: password
      .min(8, 'Password must be at least 8 characters')
      .refine((v) => bytes(v) <= 72, 'Password cannot exceed 72 bytes'),
    confirmPassword,
  }),
  // Checked on its own: a Zod 3 refine on the whole form runs only once every field is valid,
  // so "Passwords do not match" would appear last
  z.object({ password, confirmPassword }).refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
)
const schema = toTypedSchema(signUpSchema)

// E1. Creates the account through the auth store (the API signs the user in) and
// emits `success` with the new user. Only the backend fields are sent — not confirmPassword.
export default {
  name: 'SignUpForm',
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
    ...mapGetters('auth', ['isSubmitting']),
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
