import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { sessionOptions, SessionData } from '@/lib/session'

// Escape a value for CSV: wrap in quotes if it contains comma, quote, or newline.
// Double any existing quotes per RFC 4180.
function csvCell(value: string | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET() {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const swipes = await prisma.swipe.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        product: true,
      },
    })

    const header = [
      'User Name',
      'User Email',
      'Product Name',
      'Product Description',
      'Direction',
      'Interested',
      'Swipe Date',
    ].join(',')

    const rows = swipes.map((s) =>
      [
        csvCell(s.user.name),
        csvCell(s.user.email),
        csvCell(s.product.name),
        csvCell(s.product.description),
        csvCell(s.direction),
        csvCell(s.direction === 'right' ? 'yes' : 'no'),
        csvCell(s.createdAt.toISOString()),
      ].join(',')
    )

    const csv = [header, ...rows].join('\n')

    const filename = `swipes-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/export:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
