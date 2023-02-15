// Testing Pure Functions

import {isPasswordAllowed} from 'utils/auth'
import cases from 'jest-in-case'

cases(
  'valid passwords',
  opts => {
    expect(isPasswordAllowed(opts.password)).toBe(true)
  },
  {
    'fulfills all requirements': {
      password: 'aBc123!',
    },
  },
)

cases(
  'invalid passwords',
  opts => {
    expect(isPasswordAllowed(opts.password)).toBe(false)
  },
  {
    'too short': {
      password: 'aB2c!',
    },
    'no alphabet characters': {
      password: '123456!',
    },
    'no numeric characters': {
      password: 'ABCdef!',
    },
    'no uppercase letters': {
      password: 'abc123!',
    },
    'no lowercase letters': {
      password: 'ABC123!',
    },
    'no non-alphanumeric characters': {
      password: 'ABCdef123',
    },
  },
)
