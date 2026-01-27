import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// Get the next Monday's date
function getNextMonday(): string {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek
  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + daysUntilMonday)
  return nextMonday.toISOString().split('T')[0]
}

// This endpoint is called by Vercel Cron at 00:00 UTC every Tuesday
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron (in production)
    const authHeader = request.headers.get('authorization')
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    // Archive all non-archived sessions that are in the past
    const today = new Date().toISOString().split('T')[0]

    const { error: archiveError } = await supabase
      .from('sessions')
      .update({ archived: true })
      .eq('archived', false)
      .lt('date', today)

    if (archiveError) {
      console.error('Archive error:', archiveError)
    }

    // Create next Monday's session if it doesn't exist
    const nextMondayDate = getNextMonday()

    const { data: existingSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('date', nextMondayDate)
      .single()

    if (!existingSession) {
      const { error: createError } = await supabase
        .from('sessions')
        .insert([{ date: nextMondayDate, courts: 2, max_players: 14 }])

      if (createError) {
        console.error('Create session error:', createError)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Archived past sessions and ensured session exists for ${nextMondayDate}`
    })
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
