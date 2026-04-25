import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { sessionOptions, SessionData } from '@/lib/session'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Extract the storage path (filename within the `products` bucket) from a
// Supabase public URL like:
//   https://<proj>.supabase.co/storage/v1/object/public/products/<filename>
function supabaseStoragePath(imageUrl: string): string | null {
  const marker = '/storage/v1/object/public/products/'
  const idx = imageUrl.indexOf(marker)
  if (idx === -1) return null
  return imageUrl.slice(idx + marker.length)
}

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

    const product = await prisma.product.findUnique({
      where: { id },
      include: { images: true },
    })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Collect every image URL we know about (gallery + legacy denormalized cache)
    const allImageUrls = [
      ...product.images.map((img) => img.url),
      product.imageUrl,
    ].filter((u, i, arr) => u && arr.indexOf(u) === i)

    // Clean up local /uploads/* legacy files
    for (const url of allImageUrls) {
      if (url.startsWith('/uploads/')) {
        const filepath = join(process.cwd(), 'public', url)
        try {
          await unlink(filepath)
        } catch {
          // File may not exist, ignore
        }
      }
    }

    // Bulk-remove Supabase-hosted images
    const supabasePaths = allImageUrls
      .map((u) => supabaseStoragePath(u))
      .filter((p): p is string => !!p)
    if (supabasePaths.length > 0) {
      try {
        await getSupabase().storage.from('products').remove(supabasePaths)
      } catch (err) {
        console.error('Failed to remove images from storage:', err)
      }
    }

    await prisma.product.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/products/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/products/[id] — text-field edits only.
// Image management lives at /api/products/[id]/images.
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

    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const body = await request.json()

    const data: {
      name?: string
      description?: string | null
      size?: string | null
      requestedPrice?: number | null
    } = {}

    if (typeof body.name === 'string') {
      const trimmed = body.name.trim()
      if (trimmed.length === 0) {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        )
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
