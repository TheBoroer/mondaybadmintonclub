import { cookies } from 'next/headers'

const USER_TOKEN_NAME = 'badminton_user_token'
const ADMIN_TOKEN_NAME = 'badminton_admin_token'

// Simple token generation (in production, use a proper JWT)
function generateToken(type: 'user' | 'admin'): string {
  const timestamp = Date.now()
  return Buffer.from(`${type}:${timestamp}`).toString('base64')
}

export function validateUserPassword(password: string): boolean {
  return password === process.env.USER_PASSWORD
}

export function validateAdminPassword(password: string): boolean {
  return password === process.env.ADMIN_PASSWORD
}

export async function setUserToken(): Promise<string> {
  const token = generateToken('user')
  const cookieStore = await cookies()
  cookieStore.set(USER_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  })
  return token
}

export async function setAdminToken(): Promise<string> {
  const token = generateToken('admin')
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 1 day
    path: '/',
  })
  return token
}

export async function isUserAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(USER_TOKEN_NAME)
  return !!token?.value
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_TOKEN_NAME)
  return !!token?.value
}

export async function clearUserToken(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(USER_TOKEN_NAME)
}

export async function clearAdminToken(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_TOKEN_NAME)
}
