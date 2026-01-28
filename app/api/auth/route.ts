import { NextRequest, NextResponse } from 'next/server'
import {
  validateUserPassword,
  validateAdminPassword,
  setUserToken,
  setAdminToken,
  clearUserToken,
  clearAdminToken,
  isUserAuthenticated,
  isAdminAuthenticated,
} from '@/lib/auth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  if (type === 'user') {
    const authenticated = await isUserAuthenticated()
    return NextResponse.json({ authenticated })
  }

  if (type === 'admin') {
    const authenticated = await isAdminAuthenticated()
    return NextResponse.json({ authenticated })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  try {
    const { password, type } = await request.json()

    if (!password || !type) {
      return NextResponse.json(
        { error: 'Password and type are required' },
        { status: 400 }
      )
    }

    if (type === 'user') {
      if (validateUserPassword(password)) {
        await setUserToken()
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    if (type === 'admin') {
      if (validateAdminPassword(password)) {
        await setAdminToken()
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { type } = await request.json()

    if (type === 'user') {
      await clearUserToken()
    } else if (type === 'admin') {
      await clearAdminToken()
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
