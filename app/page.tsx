'use client'

import { useEffect, useState, useCallback } from 'react'
import SwipeCard from '@/components/SwipeCard'
import UserModal from '@/components/UserModal'
import BidModal from '@/components/BidModal'

interface Product {
  id: string
  name: string
  description: string | null
  imageUrl: string
  size: string | null
  requestedPrice: number | null
  swiped: boolean
  swipeDirection: string | null
}

export default function HomePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [swipeLoading, setSwipeLoading] = useState(false)
  const [pendingBid, setPendingBid] = useState<Product | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      if (data.products) {
        const unswiped = data.products.filter((p: Product) => !p.swiped)
        setProducts(unswiped)
        setCurrentIndex(0)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
  }, [])

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId')
    if (storedUserId) {
      setUserId(storedUserId)
      fetchProducts().then(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [fetchProducts])

  const handleUserSubmit = async (name: string, email: string) => {
    const res = await fetch('/api/auth/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    })

    if (!res.ok) {
      throw new Error('Failed to create user')
    }

    const data = await res.json()
    localStorage.setItem('userId', data.user.id)
    setUserId(data.user.id)
    setLoading(true)
    await fetchProducts()
    setLoading(false)
  }

  const recordSwipe = async (
    productId: string,
    direction: 'left' | 'right',
    bidPrice: number | null
  ) => {
    setSwipeLoading(true)
    try {
      await fetch('/api/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, direction, bidPrice }),
      })
    } catch (error) {
      console.error('Failed to record swipe:', error)
    } finally {
      setSwipeLoading(false)
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handleSwipe = async (direction: 'left' | 'right') => {
    const product = products[currentIndex]
    if (!product || swipeLoading) return

    if (direction === 'right') {
      // Hold off committing the swipe — ask for a bid first.
      setPendingBid(product)
      return
    }

    await recordSwipe(product.id, 'left', null)
  }

  const handleBidSubmit = async (bidPrice: number | null) => {
    if (!pendingBid) return
    await recordSwipe(pendingBid.id, 'right', bidPrice)
    setPendingBid(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const currentProduct = products[currentIndex]
  const remaining = products.length - currentIndex

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
      {!userId && (
        <UserModal onSubmit={handleUserSubmit} />
      )}

      {userId && (
        <>
          {/* Header */}
          <div className="w-full max-w-md mb-4 text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">Product Discovery</h1>
            {remaining > 0 && (
              <p className="text-indigo-300 text-sm mt-1">
                {remaining} product{remaining !== 1 ? 's' : ''} left
              </p>
            )}
          </div>

          {/* Card area */}
          <div className="w-full max-w-md flex flex-col items-center">
            {currentProduct ? (
              <>
                {/* Background card for stack effect */}
                {products[currentIndex + 1] && (
                  <div
                    className="absolute w-80 sm:w-96 bg-white rounded-3xl shadow-xl"
                    style={{
                      height: '480px',
                      transform: 'scale(0.95) translateY(10px)',
                      zIndex: 0,
                    }}
                  />
                )}
                <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
                  <SwipeCard
                    key={currentProduct.id}
                    product={currentProduct}
                    onSwipe={handleSwipe}
                  />
                </div>

                {/* Button controls */}
                <div className="flex gap-8 mt-6">
                  <button
                    onClick={() => handleSwipe('left')}
                    disabled={swipeLoading}
                    className="w-16 h-16 bg-white/10 hover:bg-red-500/80 disabled:opacity-50 border-2 border-red-400 text-red-400 hover:text-white rounded-full flex items-center justify-center text-2xl font-bold transition-all hover:scale-110"
                    title="Not Interested"
                  >
                    ✕
                  </button>
                  <button
                    onClick={() => handleSwipe('right')}
                    disabled={swipeLoading}
                    className="w-16 h-16 bg-white/10 hover:bg-green-500/80 disabled:opacity-50 border-2 border-green-400 text-green-400 hover:text-white rounded-full flex items-center justify-center text-2xl font-bold transition-all hover:scale-110"
                    title="Interested"
                  >
                    ♥
                  </button>
                </div>

                <p className="mt-4 text-white/40 text-xs">
                  Drag card or use buttons · ✕ not interested · ♥ interested
                </p>
              </>
            ) : (
              <div className="text-center py-16 px-6">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  You&apos;ve seen all products!
                </h2>
                <p className="text-indigo-300">
                  Check back later for new discoveries.
                </p>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/products')
                      const data = await res.json()
                      if (data.products) {
                        setProducts(data.products)
                        setCurrentIndex(0)
                      }
                    } catch (error) {
                      console.error('Failed to restart:', error)
                    }
                  }}
                  className="mt-8 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
                >
                  Start Over
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Bid modal — shown after a right-swipe */}
      {pendingBid && (
        <BidModal
          productName={pendingBid.name}
          requestedPrice={pendingBid.requestedPrice}
          onSubmit={handleBidSubmit}
        />
      )}

      {/* Admin link */}
      <a
        href="/admin"
        className="fixed bottom-4 right-4 text-white/20 hover:text-white/50 text-xs transition-colors"
      >
        Admin
      </a>
    </div>
  )
}
