// One-time backfill: copy each Product.imageUrl into a ProductImage row
// flagged as primary. Safe to re-run — skips products that already have
// at least one image.
//
// Run with: npx tsx scripts/backfill-product-images.ts
import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  const products = await prisma.product.findMany({
    include: { images: true },
  })

  let created = 0
  let skipped = 0

  for (const product of products) {
    if (product.images.length > 0) {
      skipped++
      continue
    }
    if (!product.imageUrl) {
      skipped++
      continue
    }

    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: product.imageUrl,
        isPrimary: true,
        sortOrder: 0,
      },
    })
    created++
  }

  console.log(`Backfill complete: ${created} created, ${skipped} skipped.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect?.()
  })
