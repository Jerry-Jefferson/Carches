import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import CarPlaceholder from '../CarPlaceholder.vue'
import EmptyState from '../EmptyState.vue'
import EnergyBar from '../EnergyBar.vue'
import ErrorState from '../ErrorState.vue'
import InfoCallout from '../InfoCallout.vue'
import InitialsAvatar from '../InitialsAvatar.vue'
import PillGroup from '../PillGroup.vue'
import StatusTag from '../StatusTag.vue'

describe('StatusTag', () => {
  it.each([
    ['car', 'free', 'Available', 'text-success'],
    ['car', 'reserved', 'Reserved', 'text-warning'],
    ['car', 'in_use', 'In trip', 'text-info'],
    ['car', 'unavailable', 'Unavailable', 'text-muted-foreground'],
    ['car', 'in_service', 'In service', 'text-destructive'],
    ['booking', 'active', 'Active', 'text-info'],
    ['booking', 'upcoming', 'Upcoming', 'text-warning'],
    ['booking', 'completed', 'Completed', 'text-success'],
  ])('%s status %s shows "%s" in %s', (kind, status, label, toneClass) => {
    const wrapper = mount(StatusTag, { props: { kind, status } })

    expect(wrapper.text()).toBe(label)
    expect(wrapper.classes()).toContain(toneClass)
    expect(wrapper.find('.anticon').exists()).toBe(true)
  })

  it('shows a pulsing dot instead of the icon', () => {
    const wrapper = mount(StatusTag, { props: { status: 'free', pulse: true } })

    expect(wrapper.find('.animate-status-pulse').exists()).toBe(true)
    expect(wrapper.find('.anticon').exists()).toBe(false)
  })
})

describe('EnergyBar', () => {
  it.each([
    [10, 'bg-destructive'],
    [30, 'bg-warning'],
    [82, 'bg-success'],
  ])('%d %% uses %s', (level, barClass) => {
    const wrapper = mount(EnergyBar, { props: { level } })
    const bar = wrapper.find('[role="progressbar"]')

    expect(bar.attributes('aria-valuenow')).toBe(String(level))
    expect(bar.find('div').classes()).toContain(barClass)
    expect(bar.find('div').attributes('style')).toContain(`width: ${level}%`)
  })

  it('clamps the value and can hide the label', () => {
    const wrapper = mount(EnergyBar, { props: { level: 140, showLabel: false } })

    expect(wrapper.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('100')
    expect(wrapper.text()).toBe('')
  })
})

describe('PillGroup', () => {
  const options = [
    { value: 'all', label: 'All cars', count: 12 },
    { value: 'Toyota', label: 'Toyota', count: 5 },
    { value: 'BMW', label: 'BMW', count: 0, disabled: true },
  ]

  it('marks the selected pill and emits the new value', async () => {
    const wrapper = mount(PillGroup, { props: { options, modelValue: 'all', ariaLabel: 'Brand' } })
    const buttons = wrapper.findAll('button')

    expect(buttons[0].attributes('aria-pressed')).toBe('true')
    expect(buttons[1].attributes('aria-pressed')).toBe('false')
    expect(buttons[0].text()).toContain('12')

    await buttons[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['Toyota']])
  })

  it('ignores the selected and disabled pills', async () => {
    const wrapper = mount(PillGroup, { props: { options, modelValue: 'all', ariaLabel: 'Brand' } })

    await wrapper.findAll('button')[0].trigger('click')
    await wrapper.findAll('button')[2].trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('InfoCallout', () => {
  it('renders the title and text as a note', () => {
    const wrapper = mount(InfoCallout, {
      props: { title: "Driver's licence" },
      slots: { default: 'Your licence number is required to book a car.' },
    })

    expect(wrapper.attributes('role')).toBe('note')
    expect(wrapper.text()).toContain("Driver's licence")
    expect(wrapper.text()).toContain('required to book')
  })
})

describe('EmptyState and ErrorState', () => {
  it('EmptyState emits its action', async () => {
    const wrapper = mount(EmptyState, {
      props: { title: 'No cars match your filters', actionLabel: 'Reset filters' },
    })

    expect(wrapper.text()).toContain('No cars match your filters')
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('action')).toHaveLength(1)
  })

  it('ErrorState shows the message and emits retry', async () => {
    const wrapper = mount(ErrorState, {
      props: { message: 'Network error. Check your connection.' },
    })

    expect(wrapper.text()).toContain('Network error')
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})

describe('CarPlaceholder and InitialsAvatar', () => {
  it('CarPlaceholder labels the car and shows the brand initial', () => {
    const car = { productionInfo: { brand: 'Toyota', model: 'Camry', year: 2023 } }
    const wrapper = mount(CarPlaceholder, { props: { car, size: 'hero' } })

    expect(wrapper.attributes('role')).toBe('img')
    expect(wrapper.attributes('aria-label')).toBe('Toyota Camry (no photo)')
    expect(wrapper.text()).toBe('T')
  })

  it('InitialsAvatar shows the initials', () => {
    const wrapper = mount(InitialsAvatar, { props: { user: { firstName: 'Vera', lastName: 'D' } } })

    expect(wrapper.text()).toBe('VD')
  })
})
