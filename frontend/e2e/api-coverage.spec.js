// Q-03: every endpoint of plan §14 (E1–E23) called against the running stack, checking the
// status codes and the behaviours the frontend relies on (Q2–Q16). It creates its own user
// and car and removes them. E16 / E17 act on every matching car, as they do from the console.

import { test, expect } from '@playwright/test'

import {
  adminCredentials,
  call,
  newUserProfile,
  removeBooking,
  removeCar,
  removeUser,
  signInByApi,
  uniqueVin,
} from './support'

const HOUR = 3600000

test('every endpoint answers as the frontend expects', async ({ request }, testInfo) => {
  const results = []
  const hit = async (id, method, path, options, expected) => {
    const response = await call(request, method, path, options)
    results.push({ id, method, path, status: response.status, expected })
    expect(response.status, `${id} ${method} ${path}: ${response.body?.message ?? ''}`).toBe(
      expected,
    )
    return response.body?.data
  }

  const profile = newUserProfile()
  const vin = uniqueVin()
  let admin = null
  let userId = null
  let bookingId = null
  try {
    // Auth and "me" (E1–E4)
    const signedUp = await hit('E1', 'POST', '/auth/signup', { data: profile }, 201)
    userId = signedUp.user._id
    expect(signedUp.user.role).toBe('user')
    const { token } = await hit(
      'E2',
      'POST',
      '/auth/signin',
      { data: { email: profile.email, password: profile.password } },
      200,
    )
    const me = await hit('E4', 'GET', '/users/me', { token }, 200)
    expect(me.email).toBe(profile.email)
    admin = await signInByApi(request, adminCredentials())
    const adminToken = admin.token

    // Access rules: guests get 401, users get 403 on admin endpoints
    await hit('E9 (guest)', 'GET', '/cars', {}, 401)
    await hit('E5 (user)', 'GET', '/users', { token }, 403)

    // Users, admin side (E5–E7)
    const users = await hit('E5', 'GET', '/users', { token: adminToken }, 200)
    expect(users.some((user) => user._id === userId)).toBe(true)
    await hit('E6', 'GET', `/users/${userId}`, { token: adminToken }, 200)
    const renamed = await hit(
      'E7',
      'PUT',
      `/users/${userId}`,
      { token: adminToken, data: { firstName: 'Renamed', role: 'admin' } },
      200,
    )
    expect(renamed).toMatchObject({ firstName: 'Renamed', role: 'user' }) // Q10

    // Cars (E9–E13)
    await hit(
      'E11',
      'POST',
      '/cars',
      {
        token: adminToken,
        data: {
          productionInfo: { brand: 'Coverage', model: 'Check', year: 2024 },
          vin,
          registrationNumber: `CV ${vin.slice(-4)}-7`,
          fuelLevel: 80,
          mileage: 1200,
          location: { type: 'Point', coordinates: [27.5615, 53.9023] },
        },
      },
      201,
    )
    const cars = await hit('E9', 'GET', '/cars', { token }, 200)
    const car = cars.find((item) => item.vin === vin)
    expect(car.productionInfo.brand).toBe('Coverage') // populated (Q9: after a reload)
    await hit('E10', 'GET', `/cars/${car._id}`, { token }, 200)
    await hit('E10 (bad id)', 'GET', '/cars/not-an-id', { token }, 400)
    const updated = await hit(
      'E12',
      'PUT',
      `/cars/${vin}`,
      { token: adminToken, data: { mileage: 1300 } },
      200,
    )
    expect(updated).toMatchObject({ mileage: 1300, productionInfo: { model: 'Check' } })

    // A user's booking (E21, E18): userId is forced to the caller, the car goes in trip
    const booking = await hit(
      'E21',
      'POST',
      '/bookings',
      {
        token,
        data: {
          carId: car._id,
          userId: admin.user._id,
          startDate: new Date().toISOString(),
          startFuelLevel: 80,
          startMileage: 1300,
        },
      },
      201,
    )
    bookingId = booking._id
    expect(booking.userId).toBe(userId)
    expect((await hit('E10', 'GET', `/cars/${car._id}`, { token }, 200)).status).toBe('in_use')
    const mine = await hit('E18', 'GET', '/bookings/my', { token }, 200)
    expect(mine[0]._id).toBe(booking._id)
    expect(typeof mine[0].carId).toBe('object') // populated, without brand (Q5)

    // Admin booking management (E19, E20, E22): finishing frees the car (Q7)
    const all = await hit('E19', 'GET', '/bookings', { token: adminToken }, 200)
    expect(all.some((item) => item._id === booking._id)).toBe(true)
    await hit('E20', 'GET', `/bookings/${booking._id}`, { token: adminToken }, 200)
    await hit(
      'E22',
      'PUT',
      `/bookings/${booking._id}`,
      {
        token: adminToken,
        data: { endDate: new Date().toISOString(), finishFuelLevel: 70, finishMileage: 1340 },
      },
      200,
    )
    const freed = await hit('E10', 'GET', `/cars/${car._id}`, { token }, 200)
    expect(freed).toMatchObject({ status: 'free', mileage: 1300 }) // mileage unchanged (Q7)

    // A future booking by the admin reserves the car; deleting it keeps that status (Q8)
    const future = await hit(
      'E21 (admin)',
      'POST',
      '/bookings',
      {
        token: adminToken,
        data: {
          carId: car._id,
          userId,
          startDate: new Date(Date.now() + 2 * HOUR).toISOString(),
          startFuelLevel: 70,
          startMileage: 1340,
        },
      },
      201,
    )
    expect(future.userId).toBe(userId)
    expect((await hit('E10', 'GET', `/cars/${car._id}`, { token }, 200)).status).toBe('reserved')
    for (const authorized of [false, true]) {
      const rows = await hit(
        `E15 (authorized=${authorized})`,
        'GET',
        '/cars/reserved',
        { token: adminToken, params: { authorized: String(authorized) } },
        200,
      )
      expect(Array.isArray(rows)).toBe(true)
    }
    await hit('E23', 'DELETE', `/bookings/${future._id}`, { token: adminToken }, 204)
    expect((await hit('E10', 'GET', `/cars/${car._id}`, { token }, 200)).status).toBe('reserved')

    // Widgets and maintenance (E14, E16, E17)
    const lowFuel = await hit('E14', 'GET', '/cars/in-use/low-fuel', { token: adminToken }, 200)
    expect(lowFuel.every((item) => item.status === 'in_use' && item.fuelLevel < 25)).toBe(true)
    const service = await hit(
      'E16',
      'PUT',
      '/cars/service-old-or-high-mileage',
      { token: adminToken },
      200,
    )
    expect(typeof service.modifiedCount).toBe('number')
    const relocated = await hit(
      'E17',
      'PUT',
      '/cars/relocate-frequently-booked',
      { token: adminToken },
      200,
    )
    expect(typeof relocated.modifiedCount).toBe('number')

    // Removing (E13, E3, E8)
    await hit('E13', 'DELETE', `/cars/${vin}`, { token: adminToken }, 204)
    await hit('E10 (deleted)', 'GET', `/cars/${car._id}`, { token }, 404)
    await hit('E3', 'POST', '/auth/logout', { token }, 204)
    await hit('E4 (revoked)', 'GET', '/users/me', { token }, 401)
    await hit('E8', 'DELETE', `/users/${userId}`, { token: adminToken }, 204)
    userId = null
    await hit(
      'E2 (deleted user)',
      'POST',
      '/auth/signin',
      { data: { email: profile.email, password: profile.password } },
      401,
    )

    const covered = new Set(results.map((result) => result.id.split(' ')[0]))
    expect([...covered].sort()).toEqual(Array.from({ length: 23 }, (_, i) => `E${i + 1}`).sort())
  } finally {
    await testInfo.attach('endpoint-coverage.json', {
      body: JSON.stringify(results, null, 2),
      contentType: 'application/json',
    })
    if (admin) {
      await removeBooking(request, admin.token, bookingId)
      await removeCar(request, admin.token, vin)
      await removeUser(request, admin.token, userId)
    }
  }
})
