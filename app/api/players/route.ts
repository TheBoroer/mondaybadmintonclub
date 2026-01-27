import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// GET - Get all players for a session (excluding pin for security)
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const { data: players, error } = await supabase
      .from('players')
      .select('id, session_id, name, position, is_waitlist, paid, signed_up_at')
      .eq('session_id', sessionId)
      .order('position', { ascending: true })

    if (error) throw error

    return NextResponse.json(players)
  } catch (error) {
    console.error('Get players error:', error)
    return NextResponse.json({ error: 'Failed to get players' }, { status: 500 })
  }
}

// POST - Sign up a player
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { sessionId, name, pin } = await request.json()

    if (!sessionId || !name || !pin) {
      return NextResponse.json({ error: 'Session ID, name, and PIN required' }, { status: 400 })
    }

    // Validate PIN is exactly 4 digits
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
    }

    // Get session to check max players
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('max_players')
      .eq('id', sessionId)
      .single()

    if (sessionError) throw sessionError

    // Get current player count (non-waitlist)
    const { data: currentPlayers, error: countError } = await supabase
      .from('players')
      .select('id')
      .eq('session_id', sessionId)
      .eq('is_waitlist', false)

    if (countError) throw countError

    const currentCount = currentPlayers?.length || 0
    const isWaitlist = currentCount >= session.max_players

    // Get the next position
    const { data: allPlayers, error: posError } = await supabase
      .from('players')
      .select('position')
      .eq('session_id', sessionId)
      .eq('is_waitlist', isWaitlist)
      .order('position', { ascending: false })
      .limit(1)

    if (posError) throw posError

    const nextPosition = allPlayers && allPlayers.length > 0 ? allPlayers[0].position + 1 : 1

    // Insert new player
    const { data: player, error: insertError } = await supabase
      .from('players')
      .insert([{
        session_id: sessionId,
        name: name.trim(),
        pin: pin,
        position: nextPosition,
        is_waitlist: isWaitlist,
        paid: false
      }])
      .select('id, session_id, name, position, is_waitlist, paid, signed_up_at')
      .single()

    if (insertError) throw insertError

    return NextResponse.json(player)
  } catch (error) {
    console.error('Sign up error:', error)
    return NextResponse.json({ error: 'Failed to sign up' }, { status: 500 })
  }
}

// DELETE - Cancel signup (with waitlist auto-promotion)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId')
    const pin = searchParams.get('pin')
    const adminBypass = searchParams.get('admin') === 'true'

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID required' }, { status: 400 })
    }

    // Get the player being removed
    const { data: player, error: getError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single()

    if (getError) throw getError

    // Verify PIN unless admin bypass
    if (!adminBypass) {
      if (!pin) {
        return NextResponse.json({ error: 'PIN required' }, { status: 400 })
      }
      if (player.pin !== pin) {
        return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
      }
    }

    const { session_id, is_waitlist } = player

    // Delete the player
    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId)

    if (deleteError) throw deleteError

    // If the removed player was NOT on the waitlist, promote first waitlist player
    if (!is_waitlist) {
      // Get first waitlist player
      const { data: waitlistPlayers, error: waitlistError } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', session_id)
        .eq('is_waitlist', true)
        .order('position', { ascending: true })
        .limit(1)

      if (waitlistError) throw waitlistError

      if (waitlistPlayers && waitlistPlayers.length > 0) {
        const promotedPlayer = waitlistPlayers[0]

        // Get the max position in the main list
        const { data: mainPlayers, error: mainError } = await supabase
          .from('players')
          .select('position')
          .eq('session_id', session_id)
          .eq('is_waitlist', false)
          .order('position', { ascending: false })
          .limit(1)

        if (mainError) throw mainError

        const newPosition = mainPlayers && mainPlayers.length > 0 ? mainPlayers[0].position + 1 : 1

        // Promote the waitlist player
        const { error: promoteError } = await supabase
          .from('players')
          .update({ is_waitlist: false, position: newPosition })
          .eq('id', promotedPlayer.id)

        if (promoteError) throw promoteError

        // Reorder remaining waitlist
        const { data: remainingWaitlist, error: remainingError } = await supabase
          .from('players')
          .select('id')
          .eq('session_id', session_id)
          .eq('is_waitlist', true)
          .order('position', { ascending: true })

        if (remainingError) throw remainingError

        // Update positions
        for (let i = 0; i < (remainingWaitlist?.length || 0); i++) {
          await supabase
            .from('players')
            .update({ position: i + 1 })
            .eq('id', remainingWaitlist![i].id)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancel error:', error)
    return NextResponse.json({ error: 'Failed to cancel signup' }, { status: 500 })
  }
}

// PATCH - Update player (e.g., mark as paid)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { id, paid } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Player ID required' }, { status: 400 })
    }

    const { data: player, error } = await supabase
      .from('players')
      .update({ paid })
      .eq('id', id)
      .select('id, session_id, name, position, is_waitlist, paid, signed_up_at')
      .single()

    if (error) throw error

    return NextResponse.json(player)
  } catch (error) {
    console.error('Update player error:', error)
    return NextResponse.json({ error: 'Failed to update player' }, { status: 500 })
  }
}
