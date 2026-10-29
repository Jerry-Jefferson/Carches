<script>
import {
  SCHEDULE_MAX_DAYS,
  SCHEDULE_STEP_MINUTES,
  SCHEDULE_VALUE_FORMAT,
  START_MODE,
  disabledTimeOf,
  isDayDisabled,
} from '@/utils/schedule'

// "Now" or a scheduled start up to SCHEDULE_MAX_DAYS ahead.
// v-model:mode is 'now' | 'schedule'; v-model:value is a SCHEDULE_VALUE_FORMAT string.
export default {
  name: 'StartTimePicker',
  props: {
    mode: { type: String, default: START_MODE.NOW },
    value: { type: String, default: null },
    error: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:mode', 'update:value'],
  data() {
    return {
      options: [
        { value: START_MODE.NOW, label: 'Now' },
        { value: START_MODE.SCHEDULE, label: 'Schedule' },
      ],
      format: SCHEDULE_VALUE_FORMAT,
      showTime: { format: 'HH:mm', minuteStep: SCHEDULE_STEP_MINUTES },
      hint: `Up to ${SCHEDULE_MAX_DAYS} days ahead. The car stays reserved for you until then.`,
    }
  },
  computed: {
    isScheduled() {
      return this.mode === START_MODE.SCHEDULE
    },
  },
  methods: {
    isDayDisabled(day) {
      return isDayDisabled(day)
    },
    disabledTime(day) {
      return disabledTimeOf(day)
    },
  },
}
</script>

<template>
  <fieldset class="m-0 flex flex-col gap-3 border-0 p-0">
    <legend class="mb-2 text-label-lg">Start</legend>
    <a-segmented
      :value="mode"
      :options="options"
      :disabled="disabled"
      block
      @change="$emit('update:mode', $event)"
    />
    <div v-if="isScheduled" class="flex flex-col gap-1">
      <a-date-picker
        :value="value"
        :value-format="format"
        format="D MMM YYYY, HH:mm"
        :show-time="showTime"
        :disabled-date="isDayDisabled"
        :disabled-time="disabledTime"
        :show-now="false"
        :allow-clear="false"
        :disabled="disabled"
        :status="error ? 'error' : undefined"
        placeholder="Pick a start time"
        aria-label="Start time"
        class="w-full"
        @update:value="$emit('update:value', $event)"
      />
      <p v-if="error" class="m-0 text-body-sm text-destructive" role="alert">{{ error }}</p>
      <p v-else class="m-0 text-body-sm text-muted-foreground">{{ hint }}</p>
    </div>
  </fieldset>
</template>
