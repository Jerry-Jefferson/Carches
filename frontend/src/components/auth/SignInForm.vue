<script>
import { toTypedSchema } from '@vee-validate/zod'
import { Field as VeeField, Form as VeeForm } from 'vee-validate'
import { mapActions, mapState } from 'vuex'

import { mapAuthError, signInSchema } from './schemas'

const schema = toTypedSchema(signInSchema)

// E2. Signs in through the auth store and emits `success` with the user;
// the parent decides where to go next.
export default {
  name: 'SignInForm',
  components: { VeeForm, VeeField },
  props: {
    // Initial e-mail, kept when switching between the auth tabs
    email: { type: String, default: '' },
  },
  emits: ['update:email', 'success'],
  data() {
    return {
      schema,
      initialValues: { email: this.email, password: '', remember: false },
      formError: null,
    }
  },
  computed: {
    ...mapState('auth', ['isSubmitting']),
  },
  methods: {
    ...mapActions('auth', ['signIn']),
    async onSubmit(values, { setFieldError }) {
      this.formError = null
      try {
        const user = await this.signIn(values)
        this.$emit('success', user)
      } catch (err) {
        const { field, message } = mapAuthError(err)
        if (field) setFieldError(field, message)
        else this.formError = message
      }
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
            placeholder="Your password"
            autocomplete="current-password"
            :disabled="isSubmitting"
            @update:value="handleChange"
            @blur="handleBlur"
          >
            <template #prefix><LockOutlined class="text-muted-foreground" /></template>
          </a-input-password>
        </a-form-item>
      </VeeField>

      <VeeField v-slot="{ value, handleChange }" name="remember">
        <a-form-item>
          <a-checkbox :checked="value" :disabled="isSubmitting" @update:checked="handleChange">
            Remember me
          </a-checkbox>
        </a-form-item>
      </VeeField>

      <a-button
        type="primary"
        html-type="submit"
        size="large"
        block
        class="rounded-full"
        :loading="isSubmitting"
      >
        Sign In
        <ArrowRightOutlined />
      </a-button>
    </a-form>
  </VeeForm>
</template>
