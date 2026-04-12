import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { sessionOptions, SessionData } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

    if (!session.userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { productId, direction } = await request.json()

    if (!productId || !direction || !['left', 'right'].includes(direction)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const swipe = await prisma.swipe.upsert({
      where: {
        userId_productId: {
          userId: session.userId,
          productId,
        },
      },
      update: { direction },
      create: {
        userId: session.userId,
        productId,
        direction,
      },
    })

    return NextResponse.json({ swipe })
  } catch (error) {
    console.error('Error in POST /api/swipe:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
