'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import UserModal from '@/components/UserModal'

interface Product {
  id: string
  name: string
  description: string | null
  imageUrl: string
  size: string | null
  requestedPrice: number | null
  swiped: boolean
  swipeDirection: string | null
  bidPrice: number | null
}

export default function HomePage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

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
    const storedName = localStorage.getItem('userName')
    if (storedUserId) {
      setUserId(storedUserId)
      setUserName(storedName)
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
    localStorage.setItem('userName', data.user.name)
    setUserId(data.user.id)
    setUserName(data.user.name)
    setLoading(true)
    await fetchProducts()
    setLoading(false)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/user', { method: 'DELETE' })
    } catch {
      // ignore — clearing local state is the important part
    }
    localStorage.removeItem('userId')
    localStorage.removeItem('userName')
    setUserId(null)
    setUserName(null)
    setProducts([])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <UserModal onSubmit={handleUserSubmit} />
        <a
          href="/admin"
          className="fixed bottom-4 right-4 text-white/20 hover:text-white/50 text-xs transition-colors"
        >
          Admin
        </a>
      </div>
    )
  }

  const rightSwipes = products.filter((p) => p.swipeDirection === 'right')
  const bids = rightSwipes.filter((p) => p.bidPrice != null)
  const likes = rightSwipes.filter((p) => p.bidPrice == null)
  const unswipedCount = products.filter((p) => !p.swiped).length
  const hasMoreToSwipe = unswipedCount > 0

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Header */}
      <header className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-white/10">
        <div>
          <h1 className="stooply-logo text-4xl sm:text-5xl font-black italic tracking-tight bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(217,70,239,0.35)] select-none">
            Stooply<span className="text-fuchsia-400 not-italic">.</span>
          </h1>
          {userName && (
            <p className="text-xs text-white/60 mt-1">Hi, {userName}</p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-white/50 hover:text-red-400 font-medium transition-colors"
        >
          Log Out
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Welcome blurb */}
        <p className="text-white/80 text-base sm:text-lg leading-relaxed mb-6">
          Start swiping to see what we&apos;ve got! Everyone here gets the
          friends and family rate. Feel free to propose any price you want or
          simply click{' '}
          <span className="font-semibold text-white">Just Interested</span>.
          Sale goes to the highest bidder. Reach out to us directly for more
          information.
        </p>

        {/* CTA card */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <h2 className="text-lg font-semibold">
            {hasMoreToSwipe ? 'Keep discovering' : 'All caught up!'}
          </h2>
          <p className="text-indigo-100 text-sm mt-1">
            {hasMoreToSwipe
              ? `${unswipedCount} new item${unswipedCount !== 1 ? 's' : ''} waiting for you.`
              : "You've swiped on everything we have right now."}
          </p>
          <button
            onClick={() =>
              router.push(hasMoreToSwipe ? '/swipe' : '/swipe?all=1')
            }
            className="mt-4 px-5 py-2.5 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors"
          >
            {hasMoreToSwipe
              ? rightSwipes.length > 0
                ? 'Continue Swiping'
                : 'Start Swiping'
              : 'View All Again'}
          </button>
        </div>

        {/* Your Bids */}
        <section className="mt-8">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Your Bids{' '}
              <span className="text-white/40 font-normal text-base">
                ({bids.length})
              </span>
            </h2>
          </div>

          {bids.length === 0 ? (
            <div className="text-center py-10 px-6 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-4xl mb-2">💸</div>
              <p className="text-white/80 text-sm">
                You haven&apos;t placed any bids yet.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {bids.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
                >
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white/10">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{product.name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-white/60">
                      {product.requestedPrice != null && (
                        <span>Asking ${product.requestedPrice.toFixed(2)}</span>
                      )}
                      {product.size && <span>📏 {product.size}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-white/40">Your bid</p>
                    <p className="text-base font-semibold text-green-400">
                      ${product.bidPrice!.toFixed(2)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Your Likes */}
        <section className="mt-8">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Your Likes{' '}
              <span className="text-white/40 font-normal text-base">
                ({likes.length})
              </span>
            </h2>
          </div>

          {likes.length === 0 ? (
            <div className="text-center py-10 px-6 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-4xl mb-2">💝</div>
              <p className="text-white/80 text-sm">
                Items you&apos;re just interested in will show up here.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {likes.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
                >
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white/10">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{product.name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-white/60">
                      {product.requestedPrice != null && (
                        <span>Asking ${product.requestedPrice.toFixed(2)}</span>
                      )}
                      {product.size && <span>📏 {product.size}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Browse-all CTA */}
        <div className="mt-10 mb-2 text-center">
          <button
            onClick={() => router.push('/browse')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl border border-white/15 transition-colors"
          >
            View All Items
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <p className="mt-2 text-xs text-white/40">
            Browse everything without swiping.
          </p>
        </div>
      </main>

      <a
        href="/admin"
        className="fixed bottom-4 right-4 text-white/20 hover:text-white/50 text-xs transition-colors"
      >
        Admin
      </a>
    </div>
  )
}
