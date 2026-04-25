import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { sessionOptions, SessionData } from '@/lib/session'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

    if (!session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params

    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Delete image file
    if (product.imageUrl.startsWith('/uploads/')) {
      const filepath = join(process.cwd(), 'public', product.imageUrl)
      try {
        await unlink(filepath)
      } catch {
        // File may not exist, ignore
      }
    }

    await prisma.product.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/products/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

    if (!session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Build update object — only include fields that were provided
    const data: {
      name?: string
      description?: string | null
      size?: string | null
      requestedPrice?: number | null
    } = {}

    if (typeof body.name === 'string') {
      const trimmed = body.name.trim()
      if (trimmed.length === 0) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      }
      data.name = trimmed
    }

    if ('description' in body) {
      const v = body.description
      data.description = typeof v === 'string' && v.trim() ? v.trim() : null
    }

    if ('size' in body) {
      const v = body.size
      data.size = typeof v === 'string' && v.trim() ? v.trim() : null
    }

    if ('requestedPrice' in body) {
      const v = body.requestedPrice
      if (v === null || v === '' || v === undefined) {
        data.requestedPrice = null
      } else {
        const parsed = typeof v === 'number' ? v : parseFloat(String(v))
        if (Number.isNaN(parsed) || parsed < 0) {
          return NextResponse.json(
            { error: 'Requested price must be a non-negative number' },
            { status: 400 }
          )
        }
        data.requestedPrice = parsed
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
    })

    return NextResponse.json({ product: updated })
  } catch (error) {
    console.error('Error in PATCH /api/products/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
