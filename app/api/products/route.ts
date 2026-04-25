import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { sessionOptions, SessionData } from '@/lib/session'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  // Use service_role key on the server so admin uploads bypass Storage RLS.
  // This key is secret — only ever used in server-side route handlers.
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
    const userId = session.userId

    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        swipes: true,
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    })

    const productsWithStats = products.map((product) => {
      const userSwipe = userId
        ? product.swipes.find((s) => s.userId === userId)
        : null

      const images = product.images.map((img) => ({
        id: img.id,
        url: img.url,
        isPrimary: img.isPrimary,
        sortOrder: img.sortOrder,
      }))

      const primary = images.find((i) => i.isPrimary) || images[0]

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        imageUrl: primary?.url || product.imageUrl,
        images,
        size: product.size,
        requestedPrice: product.requestedPrice,
        createdAt: product.createdAt,
        swiped: !!userSwipe,
        swipeDirection: userSwipe?.direction || null,
        bidPrice: userSwipe?.bidPrice ?? null,
        stats: {
          right: product.swipes.filter((s) => s.direction === 'right').length,
          left: product.swipes.filter((s) => s.direction === 'left').length,
        },
      }
    })

    return NextResponse.json({ products: productsWithStats })
  } catch (error) {
    console.error('Error in GET /api/products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

    if (!session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const formData = await request.formData()
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const size = formData.get('size') as string | null
    const requestedPriceRaw = formData.get('requestedPrice') as string | null

    // Accept either a single 'image' (legacy) or multiple 'images' entries.
    const rawImages = formData.getAll('images') as File[]
    const legacyImage = formData.get('image') as File | null
    const imageFiles: File[] = (rawImages.length > 0 ? rawImages : [legacyImage].filter(Boolean) as File[])
      .filter((f) => f && typeof f === 'object' && 'size' in f && f.size > 0)

    if (!name || imageFiles.length === 0) {
      return NextResponse.json(
        { error: 'Name and at least one image are required' },
        { status: 400 }
      )
    }

    let requestedPrice: number | null = null
    if (requestedPriceRaw && requestedPriceRaw.trim() !== '') {
      const parsed = parseFloat(requestedPriceRaw)
      if (Number.isNaN(parsed) || parsed < 0) {
        return NextResponse.json(
          { error: 'Requested price must be a non-negative number' },
          { status: 400 }
        )
      }
      requestedPrice = parsed
    }

    const supabase = getSupabase()

    // Upload every image. The first one is the primary.
    const uploadedUrls: string[] = []
    for (const file of imageFiles) {
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
      uploadedUrls.push(publicUrl)
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: description || null,
        size: size && size.trim() !== '' ? size : null,
        requestedPrice,
        imageUrl: uploadedUrls[0], // legacy denormalized cache
        images: {
          create: uploadedUrls.map((url, idx) => ({
            url,
            isPrimary: idx === 0,
            sortOrder: idx,
          })),
        },
      },
      include: { images: true },
    })

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error in POST /api/products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
