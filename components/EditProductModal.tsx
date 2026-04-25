'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'

interface ProductImage {
  id: string
  url: string
  isPrimary: boolean
  sortOrder: number
}

interface EditProductModalProps {
  product: {
    id: string
    name: string
    description: string | null
    size: string | null
    requestedPrice: number | null
    imageUrl: string
    images: ProductImage[]
  }
  onClose: () => void
  onSaved: () => void // Parent should refetch products on save / image change
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

  const [images, setImages] = useState<ProductImage[]>(
    [...product.images].sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
      return a.sortOrder - b.sortOrder
    })
  )

  const [savingFields, setSavingFields] = useState(false)
  const [imageBusy, setImageBusy] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [savedNote, setSavedNote] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSavedNote('')

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

    setSavingFields(true)
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          size: size.trim() || null,
          requestedPrice: parsedPrice,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to save changes.')
        return
      }

      setSavedNote('Saved')
      onSaved()
    } catch {
      setError('Failed to save changes. Please try again.')
    } finally {
      setSavingFields(false)
    }
  }

  const handleAddImages = async (files: File[]) => {
    if (files.length === 0) return
    setError('')
    setUploading(true)
    try {
      const formData = new FormData()
      for (const f of files) formData.append('images', f)

      const res = await fetch(`/api/products/${product.id}/images`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Image upload failed.')
        return
      }

      const data = await res.json()
      setImages((prev) => [...prev, ...(data.images || [])])
      if (addInputRef.current) addInputRef.current.value = ''
      onSaved()
    } catch {
      setError('Image upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleSetPrimary = async (imageId: string) => {
    if (imageBusy) return
    setError('')
    setImageBusy(imageId)
    try {
      const res = await fetch(
        `/api/products/${product.id}/images/${imageId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPrimary: true }),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to set primary image.')
        return
      }
      setImages((prev) =>
        [...prev]
          .map((img) => ({ ...img, isPrimary: img.id === imageId }))
          .sort((a, b) => {
            if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
            return a.sortOrder - b.sortOrder
          })
      )
      onSaved()
    } catch {
      setError('Failed to set primary image. Please try again.')
    } finally {
      setImageBusy(null)
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    if (imageBusy) return
    if (!confirm('Remove this image?')) return
    setError('')
    setImageBusy(imageId)
    try {
      const res = await fetch(
        `/api/products/${product.id}/images/${imageId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to remove image.')
        return
      }
      setImages((prev) => prev.filter((img) => img.id !== imageId))
      onSaved()
    } catch {
      setError('Failed to remove image. Please try again.')
    } finally {
      setImageBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">Edit Product</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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

        <div className="px-6 py-5 space-y-6">
          {/* Image gallery */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Images <span className="text-gray-400 font-normal">({images.length})</span>
              </label>
              <div>
                <input
                  ref={addInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    const files = e.target.files ? Array.from(e.target.files) : []
                    handleAddImages(files)
                  }}
                />
                <button
                  type="button"
                  onClick={() => addInputRef.current?.click()}
                  disabled={uploading}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50 transition-colors"
                >
                  {uploading ? 'Uploading…' : '+ Add images'}
                </button>
              </div>
            </div>

            {images.length === 0 ? (
              <p className="text-sm text-gray-400">No images yet — add some.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {images.map((img) => {
                  const busy = imageBusy === img.id
                  return (
                    <div
                      key={img.id}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 ${
                        img.isPrimary ? 'border-indigo-500' : 'border-gray-200'
                      }`}
                    >
                      <Image
                        src={img.url}
                        alt=""
                        fill
                        className="object-cover"
                      />
                      {img.isPrimary && (
                        <span className="absolute top-1.5 left-1.5 bg-indigo-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                          PRIMARY
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-end justify-center p-2 opacity-0 hover:opacity-100">
                        <div className="flex flex-col gap-1 w-full">
                          {!img.isPrimary && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleSetPrimary(img.id)}
                              className="bg-white text-gray-900 text-xs font-medium px-2 py-1 rounded shadow hover:bg-indigo-50 disabled:opacity-50"
                            >
                              {busy ? '…' : 'Set primary'}
                            </button>
                          )}
                          {!img.isPrimary && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleDeleteImage(img.id)}
                              className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded shadow hover:bg-red-600 disabled:opacity-50"
                            >
                              {busy ? '…' : 'Remove'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-400">
              The primary image is shown on the swipe card. Hover an image to set
              it as primary or remove it.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Text fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
            {savedNote && !error && (
              <p className="text-green-600 text-sm">{savedNote}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={savingFields}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
              >
                {savingFields ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
