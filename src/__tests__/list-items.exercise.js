// Testing CRUD API Routes

import axios from 'axios'
import {insertTestUser, resetDb} from 'utils/db-utils'
import {handleRequestFailure, resolve} from 'utils/async'
import * as generate from 'utils/generate'
import * as booksDB from '../db/books'
import startServer from '../start'

let baseURL, server

beforeAll(async () => {
  server = await startServer()
  baseURL = `http://localhost:${server.address().port}/api`
})

afterAll(async () => {
  await server.close()
})

beforeEach(async () => {
  await resetDb()
})

async function setup() {
  // 💰 this bit isn't as important as the rest of what you'll be learning today
  // so I'm going to give it to you, but don't just skip over it. Try to figure
  // out what's going on here.
  const testUser = await insertTestUser()
  const client = axios.create({baseURL})
  client.defaults.headers.common.authorization = `Bearer ${testUser.token}`
  client.interceptors.response.use(resolve, handleRequestFailure)
  return {testUser, client}
}

test('listItem CRUD', async () => {
  const {testUser, client} = await setup()

  const book = generate.buildBook()
  await booksDB.insert(book)

  // CREATE
  const createResponse = await client.post('list-items', {bookId: book.id})
  const listItem = createResponse.data.listItem
  expect(listItem).toMatchObject({ownerId: testUser.id, bookId: book.id})

  const listItemIdUrl = `list-items/${listItem.id}`

  // READ
  const getItemResponse = await client.get(listItemIdUrl)
  expect(getItemResponse.data.listItem).toEqual(listItem)

  // UPDATE
  const updates = {notes: generate.notes()}
  const receivedUpdate = await client.put(listItemIdUrl, updates)
  const expectedUpdate = {...listItem, ...updates}
  expect(receivedUpdate.data.listItem).toEqual(expectedUpdate)

  // DELETE
  const deleteResponse = await client.delete(listItemIdUrl)
  expect(deleteResponse.data).toEqual({success: true})

  const error = await client.get(listItemIdUrl).catch(resolve)
  expect(error.status).toBe(404)
  const withoutId = error.data.message.replace(listItem.id, 'list-item-id')
  expect(withoutId).toMatchInlineSnapshot(
    `"No list item was found with the id of list-item-id"`,
  )
})

/* eslint no-unused-vars:0 */
