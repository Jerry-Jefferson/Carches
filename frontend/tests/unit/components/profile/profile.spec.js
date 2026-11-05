import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import ProfileCard from '@/components/profile/ProfileCard.vue'

const USER = {
  _id: 'u1',
  email: 'hanna@carshes.test',
  role: 'user',
  firstName: 'Hanna',
  lastName: 'Paulava',
  licenseNumber: 'AB123456',
  createdAt: '2026-03-14T10:00:00.000Z',
}

describe('ProfileCard', () => {
  it('lists the profile fields with their labels', () => {
    const wrapper = mount(ProfileCard, { props: { user: USER } })

    const labels = wrapper.findAll('.ant-descriptions-item-label').map((cell) => cell.text())
    const values = wrapper.findAll('.ant-descriptions-item-content').map((cell) => cell.text())
    expect(labels).toEqual(['E-mail', 'Driving licence', 'First name', 'Last name'])
    expect(values).toEqual(['hanna@carshes.test', 'AB123456', 'Hanna', 'Paulava'])
    expect(wrapper.text()).toContain('Member since 14 Mar 2026')
    expect(wrapper.text()).not.toContain('Administrator')
  })

  it('marks an administrator', () => {
    const wrapper = mount(ProfileCard, { props: { user: { ...USER, role: 'admin' } } })

    expect(wrapper.text()).toContain('Administrator')
  })
})
