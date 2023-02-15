// Testing Middleware

import {UnauthorizedError} from 'express-jwt'
import errorMiddleware from 'utils/error-middleware'
import {buildNext, buildReq, buildRes} from 'utils/generate'

test('unauthorized error responds with JSON and 401 status code', () => {
  const error = new UnauthorizedError('some_error_code', {message: 'Some message'})
  const req = buildReq()
  const res = buildRes()
  const next = buildNext()

  errorMiddleware(error, req, res, next)

  const expectedJson = {code: error.code, message: error.message}
  expect(next).not.toHaveBeenCalled()
  expect(res.json).toHaveBeenCalledTimes(1)
  expect(res.json).toHaveBeenCalledWith(expectedJson)
  expect(res.status).toHaveBeenCalledTimes(1)
  expect(res.status).toHaveBeenCalledWith(401)
})

test('if headers are sent, error is passed to the next handler', () => {
  const error = new Error('some error')
  const req = buildReq()
  const res = buildRes({headersSent: true})
  const next = buildNext()

  errorMiddleware(error, req, res, next)

  expect(next).toHaveBeenCalledTimes(1)
  expect(next).toHaveBeenCalledWith(error)
})

test('in any other case respond with a 500 status code', () => {
  const error = new Error('some error')
  const req = buildReq()
  const res = buildRes()
  const next = buildNext()

  errorMiddleware(error, req, res, next)

  const expectedJson = {message: error.message, stack: error.stack}
  expect(next).not.toHaveBeenCalled()
  expect(res.status).toHaveBeenCalledTimes(1)
  expect(res.status).toHaveBeenCalledWith(500)
  expect(res.json).toHaveBeenCalledTimes(1)
  expect(res.json).toHaveBeenCalledWith(expectedJson)
})
