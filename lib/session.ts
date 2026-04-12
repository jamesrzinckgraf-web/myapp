import { SessionOptions } from 'iron-session'

export interface SessionData {
  userId?: string
  isAdmin?: boolean
}

export const sessionOptions: SessionOptions = {
  password:
    process.env.IRON_SESSION_SECRET ||
    'this-is-a-dev-secret-change-in-production-32chars',
  cookieName: 'swipe-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
}
