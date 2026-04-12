import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
    session.isAdmin = true
    await session.save()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/auth/admin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies()
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
    session.destroy()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/auth/admin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
