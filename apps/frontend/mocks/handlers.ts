import { rest } from 'msw'

export const handlers = [
  // Mocks a GET request to /api/health
  rest.get('/api/health', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ status: 'healthy' })
    )
  }),
]

export const errorHandlers = [
  rest.get('/api/health', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({ message: 'Internal Server Error' })
    )
  }),
]
