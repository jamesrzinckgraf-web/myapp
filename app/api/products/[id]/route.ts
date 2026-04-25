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

    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Clean up the underlying image. Legacy products used local /uploads/<file>;
    // current products live in Supabase Storage.
    if (product.imageUrl.startsWith('/uploads/')) {
      const filepath = join(process.cwd(), 'public', product.imageUrl)
      try {
        await unlink(filepath)
      } catch {
        // File may not exist, ignore
      }
    } else {
      const path = supabaseStoragePath(product.imageUrl)
      if (path) {
        try {
          await getSupabase().storage.from('products').remove([path])
        } catch {
          // Best-effort cleanup; don't block deletion
        }
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

    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const data: {
      name?: string
      description?: string | null
      size?: string | null
      requestedPrice?: number | null
      imageUrl?: string
    } = {}

    // Track the previous image so we can remove it from storage *after* the
    // DB update succeeds. This avoids leaving the product pointing at a
    // deleted file if the DB write fails.
    let previousImageUrl: string | null = null

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()

      const nameRaw = formData.get('name')
      if (nameRaw !== null) {
        const trimmed = String(nameRaw).trim()
        if (trimmed.length === 0) {
          return NextResponse.json(
            { error: 'Name cannot be empty' },
            { status: 400 }
          )
        }
        data.name = trimmed
      }

      if (formData.has('description')) {
        const v = String(formData.get('description') ?? '').trim()
        data.description = v || null
      }

      if (formData.has('size')) {
        const v = String(formData.get('size') ?? '').trim()
        data.size = v || null
      }

      if (formData.has('requestedPrice')) {
        const v = String(formData.get('requestedPrice') ?? '').trim()
        if (v === '') {
          data.requestedPrice = null
        } else {
          const parsed = parseFloat(v)
          if (Number.isNaN(parsed) || parsed < 0) {
            return NextResponse.json(
              { error: 'Requested price must be a non-negative number' },
              { status: 400 }
            )
          }
          data.requestedPrice = parsed
        }
      }

      const image = formData.get('image')
      if (image && image instanceof File && image.size > 0) {
        const bytes = await image.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const ext = image.name.split('.').pop() || 'jpg'
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const supabase = getSupabase()
        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filename, buffer, { contentType: image.type })

        if (uploadError) {
          console.error('Supabase upload error:', uploadError)
          return NextResponse.json(
            { error: 'Image upload failed' },
            { status: 500 }
          )
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('products').getPublicUrl(filename)

        data.imageUrl = publicUrl
        previousImageUrl = product.imageUrl
      }
    } else {
      // JSON path — kept for backward compatibility and simpler clients.
      const body = await request.json()

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
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
    })

    // Clean up the previous image (best-effort; don't fail the request if
    // cleanup doesn't work — the DB is already updated).
    if (previousImageUrl) {
      const path = supabaseStoragePath(previousImageUrl)
      if (path) {
        try {
          await getSupabase().storage.from('products').remove([path])
        } catch (err) {
          console.error('Failed to remove old image from storage:', err)
        }
      }
    }

    return NextResponse.json({ product: updated })
  } catch (error) {
    console.error('Error in PATCH /api/products/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
