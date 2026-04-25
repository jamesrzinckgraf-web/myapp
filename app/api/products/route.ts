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
      include: { swipes: true },
    })

    const productsWithStats = products.map((product) => {
      const userSwipe = userId
        ? product.swipes.find((s) => s.userId === userId)
        : null

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
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
    const image = formData.get('image') as File | null

    if (!name || !image) {
      return NextResponse.json({ error: 'Name and image are required' }, { status: 400 })
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
      return NextResponse.json({ error: 'Image upload failed' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('products')
      .getPublicUrl(filename)

    const product = await prisma.product.create({
      data: {
        name,
        description: description || null,
        size: size && size.trim() !== '' ? size : null,
        requestedPrice,
        imageUrl: publicUrl,
      },
    })

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error in POST /api/products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
