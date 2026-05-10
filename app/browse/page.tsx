'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import ProductDetailModal from '@/components/ProductDetailModal'

interface ProductImage {
  id: string
  url: string
  isPrimary: boolean
  sortOrder: number
}

interface Product {
  id: string
  name: string
  description: string | null
  imageUrl: string
  images: ProductImage[]
  size: string | null
  requestedPrice: number | null
  swiped: boolean
  swipeDirection: string | null
  bidPrice: number | null
}

export default function BrowsePage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Product | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      if (data.products) setProducts(data.products)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
  }, [])

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId')
    if (!storedUserId) {
      router.replace('/')
      return
    }
    setUserId(storedUserId)
    fetchProducts().then(() => setLoading(false))
  }, [fetchProducts, router])

  if (loading || !userId) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Header with home button */}
      <header className="px-4 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors"
          aria-label="Home"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
          Home
        </button>
        <h1 className="text-base font-semibold text-white">
          All Items{' '}
          <span className="text-white/40 font-normal">({products.length})</span>
        </h1>
        <button
          onClick={() => router.push('/swipe')}
          className="text-sm text-indigo-300 hover:text-indigo-100 font-medium transition-colors"
        >
          Swipe →
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {products.length === 0 ? (
          <div className="text-center py-16 px-6 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-5xl mb-3">📦</div>
            <p className="text-white font-medium">Nothing here yet</p>
            <p className="text-white/50 text-sm mt-1">
              Check back soon for new items.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {products.map((product) => {
              const photoCount = product.images?.length ?? 0
              return (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(product)}
                    className="group w-full text-left bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 overflow-hidden transition-colors"
                  >
                    <div className="relative aspect-square bg-white/10">
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                      {photoCount > 1 && (
                        <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                          {photoCount} photos
                        </span>
                      )}
                      {product.swipeDirection === 'right' && (
                        <span className="absolute top-2 left-2 bg-green-500/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          {product.bidPrice != null ? 'BID' : 'LIKED'}
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-white text-sm truncate">
                        {product.name}
                      </p>
                      <div className="mt-0.5 flex items-baseline justify-between gap-2">
                        <span className="text-xs text-white/50 truncate">
                          {product.size || ' '}
                        </span>
                        {product.requestedPrice != null && (
                          <span className="text-sm font-semibold text-indigo-300 shrink-0">
                            ${product.requestedPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      {selected && (
        <ProductDetailModal
          product={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
