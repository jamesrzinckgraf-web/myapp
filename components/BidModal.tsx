'use client'

import { useState } from 'react'

interface BidModalProps {
  productName: string
  requestedPrice: number | null
  onSubmit: (bidPrice: number | null) => void
}

export default function BidModal({ productName, requestedPrice, onSubmit }: BidModalProps) {
  const [bid, setBid] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (value: number | null) => {
    if (submitting) return
    setSubmitting(true)
    try {
      await onSubmit(value)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (bid.trim() === '') {
      submit(null)
      return
    }
    const parsed = parseFloat(bid)
    if (Number.isNaN(parsed) || parsed < 0) {
      setError('Please enter a valid non-negative number.')
      return
    }
    submit(parsed)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
        <h2 className="text-xl font-bold text-gray-900">Place a Bid</h2>
        <p className="text-sm text-gray-500 mt-1">
          How much would you pay for <span className="font-semibold">{productName}</span>?
        </p>
        {requestedPrice != null && (
          <p className="text-xs text-gray-400 mt-1">
            Requested price: ${requestedPrice.toFixed(2)}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={bid}
              onChange={(e) => setBid(e.target.value)}
              placeholder="0.00"
              autoFocus
              className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => submit(null)}
              disabled={submitting}
              className="flex-1 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Just Interested
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Bid'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
