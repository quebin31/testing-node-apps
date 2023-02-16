// Testing Authentication API Routes

import axios from 'axios'
import {resetDb} from 'utils/db-utils'
import * as generate from 'utils/generate'
import {resolve, handleRequestFailure} from 'utils/async'
import startServer from '../start'

let server, client

beforeAll(async () => {
  server = await startServer()
  const baseURL = `http://localhost:${server.address().port}/api`
  client = axios.create({baseURL})
  client.interceptors.response.use(resolve, handleRequestFailure)
})

afterAll(async () => {
  await server.close()
})

beforeEach(async () => {
  await resetDb()
})

test('auth flow', async () => {
  const loginForm = generate.loginForm()

  const registerResponse = await client.post('auth/register', loginForm)
  expect(registerResponse.data.user).toEqual({
    id: expect.any(String),
    username: loginForm.username,
    token: expect.any(String),
  })

  const loginResponse = await client.post('auth/login', loginForm)
  expect(loginResponse.data.user).toEqual(registerResponse.data.user)

  const authConfig = {
    headers: {Authorization: `Bearer ${loginResponse.data.user.token}`},
  }

  const profileResponse = await client.get('auth/me', authConfig)
  expect(profileResponse.data.user).toEqual(loginResponse.data.user)
})

test('username must be unique', async () => {
  const loginForm = generate.loginForm()
  await client.post('auth/register', loginForm)

  const error = await client.post('auth/register', loginForm).catch(resolve)

  expect(error).toMatchInlineSnapshot(
    `[Error: 400: {"message":"username taken"}]`,
  )
})

test('get me unauthenticated returns error', async () => {
  const error = await client.get('auth/me').catch(resolve)
  expect(error).toMatchInlineSnapshot(
    `[Error: 401: {"code":"credentials_required","message":"No authorization token was found"}]`,
  )
})

test('a username is required to register', async () => {
  const error = await client
    .post('auth/register', {password: generate.password()})
    .catch(resolve)
  expect(error).toMatchInlineSnapshot(
    `[Error: 400: {"message":"username can't be blank"}]`,
  )
})

test('a password is required to register', async () => {
  const error = await client
    .post('auth/register', {username: generate.username()})
    .catch(resolve)
  expect(error).toMatchInlineSnapshot(
    `[Error: 400: {"message":"password can't be blank"}]`,
  )
})

test('a username is required to login', async () => {
  const error = await client
    .post('auth/login', {password: generate.password()})
    .catch(resolve)
  expect(error).toMatchInlineSnapshot(
    `[Error: 400: {"message":"username can't be blank"}]`,
  )
})

test('a password is required to login', async () => {
  const error = await client
    .post('auth/login', {username: generate.username()})
    .catch(resolve)
  expect(error).toMatchInlineSnapshot(
    `[Error: 400: {"message":"password can't be blank"}]`,
  )
})

test('user must exist to login', async () => {
  const loginForm = generate.loginForm({username: '__unperson__'})
  const error = await client.post('auth/login', loginForm).catch(resolve)
  expect(error).toMatchInlineSnapshot(
    `[Error: 400: {"message":"username or password is invalid"}]`,
  )
})
