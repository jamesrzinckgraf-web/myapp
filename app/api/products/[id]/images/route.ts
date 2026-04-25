import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { sessionOptions, SessionData } from '@/lib/session'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/products/[id]/images
// Adds one or more images to an existing product. Newly added images are
// non-primary and appended to the end of the sort order. Use the per-image
// PATCH route to promote one to primary.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

    if (!session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id: productId } = await params

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const files = (formData.getAll('images') as File[]).filter(
      (f) => f && typeof f === 'object' && 'size' in f && f.size > 0
    )

    if (files.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 })
    }

    const startSortOrder =
      product.images.reduce((max, img) => Math.max(max, img.sortOrder), -1) + 1

    const supabase = getSupabase()
    const created: { id: string; url: string; isPrimary: boolean; sortOrder: number }[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const ext = file.name.split('.').pop() || 'jpg'
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filename, buffer, { contentType: file.type })

      if (uploadError) {
        console.error('Supabase upload error:', uploadError)
        return NextResponse.json({ error: 'Image upload failed' }, { status: 500 })
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('products').getPublicUrl(filename)

      // If the product currently has no images at all, make the first one primary.
      const isPrimary = product.images.length === 0 && i === 0

      const row = await prisma.productImage.create({
        data: {
          productId,
          url: publicUrl,
          isPrimary,
          sortOrder: startSortOrder + i,
        },
      })

      // Keep the legacy denormalized imageUrl in sync if this is the new primary
      if (isPrimary) {
        await prisma.product.update({
          where: { id: productId },
          data: { imageUrl: publicUrl },
        })
      }

      created.push({
        id: row.id,
        url: row.url,
        isPrimary: row.isPrimary,
        sortOrder: row.sortOrder,
      })
    }

    return NextResponse.json({ images: created })
  } catch (error) {
    console.error('Error in POST /api/products/[id]/images:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
