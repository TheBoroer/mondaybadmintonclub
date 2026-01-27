import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const USER_TOKEN_NAME = 'badminton_user_token'
const ADMIN_TOKEN_NAME = 'badminton_admin_token'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect /signup route
  if (pathname.startsWith('/signup')) {
    const userToken = request.cookies.get(USER_TOKEN_NAME)
    if (!userToken) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Protect /admin/dashboard route
  if (pathname.startsWith('/admin/dashboard')) {
    const adminToken = request.cookies.get(ADMIN_TOKEN_NAME)
    if (!adminToken) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/signup/:path*', '/admin/dashboard/:path*'],
}
