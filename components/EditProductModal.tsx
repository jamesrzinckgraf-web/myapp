'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

interface EditProductModalProps {
  product: {
    id: string
    name: string
    description: string | null
    size: string | null
    requestedPrice: number | null
    imageUrl: string
  }
  onClose: () => void
  onSaved: (updated: {
    id: string
    name: string
    description: string | null
    size: string | null
    requestedPrice: number | null
    imageUrl: string
  }) => void
}

export default function EditProductModal({
  product,
  onClose,
  onSaved,
}: EditProductModalProps) {
  const [name, setName] = useState(product.name)
  const [description, setDescription] = useState(product.description ?? '')
  const [size, setSize] = useState(product.size ?? '')
  const [price, setPrice] = useState(
    product.requestedPrice != null ? String(product.requestedPrice) : ''
  )
  const [newImage, setNewImage] = useState<File | null>(null)
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generate / clean up an object URL for the file preview
  useEffect(() => {
    if (!newImage) {
      setNewImagePreview(null)
      return
    }
    const url = URL.createObjectURL(newImage)
    setNewImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [newImage])

  const clearNewImage = () => {
    setNewImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Product name is required.')
      return
    }

    let parsedPrice: number | null = null
    if (price.trim() !== '') {
      const p = parseFloat(price)
      if (Number.isNaN(p) || p < 0) {
        setError('Requested price must be a non-negative number.')
        return
      }
      parsedPrice = p
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('description', description.trim())
      formData.append('size', size.trim())
      formData.append('requestedPrice', parsedPrice != null ? String(parsedPrice) : '')
      if (newImage) {
        formData.append('image', newImage)
      }

      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to save changes.')
        return
      }

      const data = await res.json()
      onSaved({
        id: data.product.id,
        name: data.product.name,
        description: data.product.description,
        size: data.product.size,
        requestedPrice:
          data.product.requestedPrice != null
            ? Number(data.product.requestedPrice)
            : null,
        imageUrl: data.product.imageUrl,
      })
    } catch {
      setError('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const displayedImage = newImagePreview || product.imageUrl

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Edit Product</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Image preview + replace */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image
            </label>
            <div className="flex items-start gap-4">
              <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                <Image
                  src={displayedImage}
                  alt={product.name}
                  fill
                  className="object-cover"
                  unoptimized={!!newImagePreview}
                />
                {newImage && (
                  <span className="absolute top-1 left-1 bg-indigo-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                    NEW
                  </span>
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewImage(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  Leave blank to keep the current image.
                </p>
                {newImage && (
                  <button
                    type="button"
                    onClick={clearNewImage}
                    className="mt-2 text-xs text-gray-500 hover:text-red-500 transition-colors"
                  >
                    Cancel replacement
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description…"
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Size / Dimensions
              </label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder='e.g. 12" x 8" x 4"'
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Requested Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 49.99"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
