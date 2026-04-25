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

function supabaseStoragePath(imageUrl: string): string | null {
  const marker = '/storage/v1/object/public/products/'
  const idx = imageUrl.indexOf(marker)
  if (idx === -1) return null
  return imageUrl.slice(idx + marker.length)
}

// PATCH /api/products/[id]/images/[imageId]
// Currently supports promoting an image to primary via { isPrimary: true }.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

    if (!session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id: productId, imageId } = await params
    const body = await request.json()

    const image = await prisma.productImage.findUnique({ where: { id: imageId } })
    if (!image || image.productId !== productId) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    if (body.isPrimary === true) {
      // Atomically move "primary" to this image.
      await prisma.$transaction([
        prisma.productImage.updateMany({
          where: { productId, isPrimary: true },
          data: { isPrimary: false },
        }),
        prisma.productImage.update({
          where: { id: imageId },
          data: { isPrimary: true },
        }),
        prisma.product.update({
          where: { id: productId },
          data: { imageUrl: image.url },
        }),
      ])
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  } catch (error) {
    console.error('Error in PATCH /api/products/[id]/images/[imageId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/products/[id]/images/[imageId]
// Removes an image from the gallery and from Supabase storage. Refuses if
// it's the only image, or if it's currently the primary (promote another
// first).
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

    if (!session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id: productId, imageId } = await params

    const image = await prisma.productImage.findUnique({ where: { id: imageId } })
    if (!image || image.productId !== productId) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    const totalImages = await prisma.productImage.count({ where: { productId } })
    if (totalImages <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove the last image — products must have at least one.' },
        { status: 400 }
      )
    }

    if (image.isPrimary) {
      return NextResponse.json(
        { error: 'Set another image as primary before removing this one.' },
        { status: 400 }
      )
    }

    await prisma.productImage.delete({ where: { id: imageId } })

    // Best-effort storage cleanup
    const path = supabaseStoragePath(image.url)
    if (path) {
      try {
        await getSupabase().storage.from('products').remove([path])
      } catch (err) {
        console.error('Failed to remove image from storage:', err)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/products/[id]/images/[imageId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
