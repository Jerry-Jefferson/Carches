// Toasts and notifications. Components call these instead of Ant Design's
// `message` / `notification` directly, so wording and durations stay consistent.
// They are themed through ConfigProvider.config() in App.vue.

import { message, notification } from 'ant-design-vue'

import { getErrorMessage } from '@/api/http'

const DURATION = 3 // seconds
const ERROR_DURATION = 5

export const notify = {
  success: (text) => message.success(text, DURATION),
  info: (text) => message.info(text, DURATION),
  warning: (text) => message.warning(text, ERROR_DURATION),
  error: (text) => message.error(text, ERROR_DURATION),

  // Backend error message from a failed request, or `fallback`
  apiError: (error, fallback) => message.error(getErrorMessage(error, fallback), ERROR_DURATION),

  // Longer, titled notice (e.g. a partially failed two-step action)
  notice: ({ type = 'info', title, description }) =>
    notification[type]({ message: title, description, duration: ERROR_DURATION }),
}

export default notify
