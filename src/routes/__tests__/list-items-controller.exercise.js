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

describe('getting list items', () => {
  test('returns a list item with included book', async () => {
    const user = generate.buildUser()
    const book = generate.buildBook()
    const listItem = generate.buildListItem({ownerId: user.id, bookId: book.id})
    const req = generate.buildReq({user, listItem})
    const res = generate.buildRes()
    booksDb.readById.mockResolvedValueOnce(book)

    await listItemsController.getListItem(req, res)

    const expectedJson = {listItem: {...listItem, book}}
    expect(res.json).toHaveBeenCalledTimes(1)
    expect(res.json).toHaveBeenCalledWith(expectedJson)
  })

  test('returns an array of list items with included books', async () => {
    const user = generate.buildUser()
    const books = [generate.buildBook(), generate.buildBook()]
    const listItems = books.map((book) => {
      const overrides = {ownerId: user.id, bookId: book.id}
      return generate.buildListItem(overrides)
    })

    const req = generate.buildReq({user})
    const res = generate.buildRes()

    listItemsDb.query.mockReturnValueOnce(listItems)
    booksDb.readManyById.mockReturnValueOnce(books)

    await listItemsController.getListItems(req, res)

    const expectedJson = {
      listItems: listItems.map((it) => {
        return {...it, book: books.find((book) => book.id === it.bookId)}
      }),
    }

    expect(res.json).toHaveBeenCalledTimes(1)
    expect(res.json).toHaveBeenCalledWith(expectedJson)
  })
})

describe('controlling list items', () => {
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

  test('creating a list item fails if user already has one', async () => {
    const user = generate.buildUser({id: 'user-id'})
    const book = generate.buildBook({id: 'book-id'})
    const req = generate.buildReq({user, body: {bookId: book.id}})
    const res = generate.buildRes()
    const listItem = generate.buildListItem({ownerId: user.id, bookId: book.id})
    listItemsDb.query.mockReturnValueOnce([listItem])

    await listItemsController.createListItem(req, res)

    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledTimes(1)
    expect(res.json.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "message": "User user-id already has a list item for the book with the ID book-id",
      }
    `)
  })

  test('creating a list item returns the new created item', async () => {
    const user = generate.buildUser()
    const book = generate.buildBook()
    const listItem = generate.buildListItem({ownerId: user.id, bookId: book.id})
    const req = generate.buildReq({user, body: {bookId: book.id}})
    const res = generate.buildRes()

    listItemsDb.query.mockReturnValueOnce([])
    listItemsDb.create.mockReturnValueOnce(listItem)
    booksDb.readById.mockReturnValueOnce(book)

    await listItemsController.createListItem(req, res)

    expect(listItemsDb.create).toHaveBeenCalledTimes(1)
    const itemData = {ownerId: user.id, bookId: book.id}
    expect(listItemsDb.create).toHaveBeenCalledWith(itemData)
    expect(res.json).toHaveBeenCalledTimes(1)
    expect(res.json).toHaveBeenCalledWith({listItem: {...listItem, book}})
  })

  test('updating a list item returns the updated data', async () => {
    const user = generate.buildUser()
    const book = generate.buildBook()
    const oldListItem = generate.buildListItem({ownerId: user.id, bookId: book.id})
    const updates = {notes: generate.notes()}
    const newListItem = {...oldListItem, ...updates}
    const req = generate.buildReq({
      user,
      listItem: oldListItem,
      body: updates,
    })
    const res = generate.buildRes()

    booksDb.readById.mockReturnValueOnce(book)
    listItemsDb.update.mockReturnValueOnce(newListItem)

    await listItemsController.updateListItem(req, res)

    expect(listItemsDb.update).toHaveBeenCalledTimes(1)
    expect(listItemsDb.update).toHaveBeenCalledWith(oldListItem.id, updates)
    expect(res.json).toHaveBeenCalledTimes(1)
    expect(res.json).toHaveBeenCalledWith({listItem: {...newListItem, book}})
  })

  test('removing a list item returns a success message', async () => {
    const listItem = generate.buildListItem()
    const req = generate.buildReq({listItem})
    const res = generate.buildRes()

    await listItemsController.deleteListItem(req, res)

    expect(listItemsDb.remove).toHaveBeenCalledTimes(1)
    expect(listItemsDb.remove).toHaveBeenCalledWith(listItem.id)
    expect(res.json).toHaveBeenCalledTimes(1)
    expect(res.json).toHaveBeenCalledWith({success: true})
  })
})
