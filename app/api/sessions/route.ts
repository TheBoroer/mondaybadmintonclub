import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// Get the next Monday's date (in local timezone)
function getNextMonday(): string {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek
  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + daysUntilMonday)
  // Use local date parts to avoid timezone issues
  const year = nextMonday.getFullYear()
  const month = String(nextMonday.getMonth() + 1).padStart(2, '0')
  const day = String(nextMonday.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// GET - Get current session or create one if it doesn't exist
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('includeArchived') === 'true'

    // For admin view, get all sessions
    if (includeArchived) {
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: false })

      if (error) throw error
      return NextResponse.json(sessions)
    }

    // For user view, get all non-archived sessions
    const mondayDate = getNextMonday()

    // First, ensure a session exists for the next Monday
    const { data: existingMonday } = await supabase
      .from('sessions')
      .select('*')
      .eq('date', mondayDate)
      .eq('archived', false)
      .single()

    // If no Monday session exists, create one
    if (!existingMonday) {
      await supabase
        .from('sessions')
        .insert([{ date: mondayDate, courts: 2, max_players: 14 }])
    }

    // Get all active sessions, ordered by date
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('archived', false)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (error) throw error

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 })
  }
}

// POST - Create a new session (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { date, courts } = await request.json()

    const max_players = courts === 3 ? 20 : 14

    const { data: session, error } = await supabase
      .from('sessions')
      .insert([{ date, courts, max_players }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(session)
  } catch (error) {
    console.error('Create session error:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

// PATCH - Update a session (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { id, courts, archived } = await request.json()

    const updates: Record<string, unknown> = {}
    if (courts !== undefined) {
      updates.courts = courts
      updates.max_players = courts === 3 ? 20 : 14
    }
    if (archived !== undefined) {
      updates.archived = archived
    }

    const { data: session, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(session)
  } catch (error) {
    console.error('Update session error:', error)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}

// DELETE - Delete a session (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // First delete all players associated with this session
    const { error: playersError } = await supabase
      .from('players')
      .delete()
      .eq('session_id', sessionId)

    if (playersError) throw playersError

    // Then delete the session
    const { error: sessionError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId)

    if (sessionError) throw sessionError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete session error:', error)
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
  }
}
