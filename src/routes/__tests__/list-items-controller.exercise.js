// Testing Controllers

import * as generate from 'utils/generate'
import * as booksDb from 'db/books'
import * as listItemsDb from 'db/list-items'
import * as listItemsController from 'routes/list-items-controller'

jest.mock('db/books')
jest.mock('db/list-items')

beforeEach(() => {
  jest.resetAllMocks()
})

describe('setting list item from request params', () => {
  test('sets the list item in request if user is the owner', async () => {
    const user = generate.buildUser()
    const listItem = generate.buildListItem({ownerId: user.id})
    const req = generate.buildReq({user, params: {id: listItem.id}})
    const res = generate.buildRes()
    const next = generate.buildNext()
    listItemsDb.readById.mockReturnValueOnce(listItem)

    await listItemsController.setListItem(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith()
    expect(req.listItem).toBeDefined()
    expect(req.listItem).toEqual(listItem)
  })

  test('fails with 404 if no item is found with the provided id', async () => {
    const req = generate.buildReq({params: {id: 'something'}})
    const res = generate.buildRes()
    const next = generate.buildNext()
    listItemsDb.readById.mockReturnValueOnce(null)

    await listItemsController.setListItem(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledTimes(1)
    expect(res.json.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "message": "No list item was found with the id of something",
      }
    `)
  })

  test('fails with 403 if the user doesn\'t own the item', async () => {
    const user = generate.buildUser({id: 'static-id'})
    const listItem = generate.buildListItem({ownerId: `not-${user.id}`})
    const req = generate.buildReq({user, params: {id: 'something'}})
    const res = generate.buildRes()
    const next = generate.buildNext()
    listItemsDb.readById.mockReturnValueOnce(listItem)

    await listItemsController.setListItem(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledTimes(1)
    expect(res.json.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "message": "User with id static-id is not authorized to access the list item something",
      }
    `)
  })
})

test('getting an valid list item returns it with a valid book', async () => {
  const user = generate.buildUser()
  const book = generate.buildBook()
  const listItem = generate.buildListItem({ownerId: user.id, bookId: book.id})
  const req = generate.buildReq({user, listItem})
  const res = generate.buildRes()
  booksDb.readById.mockResolvedValueOnce(book)

  await listItemsController.getListItem(req, res)

  expect(booksDb.readById).toHaveBeenCalledWith(listItem.bookId)
  expect(booksDb.readById).toHaveBeenCalledTimes(1)

  const expectedJson = {listItem: {...listItem, book}}
  expect(res.json).toHaveBeenCalledTimes(1)
  expect(res.json).toHaveBeenCalledWith(expectedJson)
})

test('creating a list item returns a 400 error if no book id is provided', async () => {
  const user = generate.buildUser()
  const req = generate.buildReq({user})
  const res = generate.buildRes()

  await listItemsController.createListItem(req, res)

  expect(res.status).toHaveBeenCalledTimes(1)
  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledTimes(1)
  expect(res.json.mock.calls[0][0]).toMatchInlineSnapshot(`
    Object {
      "message": "No bookId provided",
    }
  `)
})
