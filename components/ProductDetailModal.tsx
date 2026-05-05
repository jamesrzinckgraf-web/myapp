'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import ImageLightbox from './ImageLightbox'

interface ProductImage {
  id: string
  url: string
}

interface ProductDetailModalProps {
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
}

export default function ProductDetailModal({
  product,
  onClose,
}: ProductDetailModalProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxIndex === null) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, lightboxIndex])

  // Lock background scroll
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  // Build the image list — fall back to imageUrl if no gallery (legacy data)
  const galleryImages =
    product.images.length > 0
      ? product.images
      : [{ id: 'legacy', url: product.imageUrl }]

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <div
          className="w-full sm:max-w-lg bg-white sm:rounded-2xl shadow-2xl h-full sm:max-h-[90vh] overflow-y-auto relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky header with close */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 px-5 py-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 truncate pr-4">
              {product.name}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors -mr-1 p-1"
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

          {/* Primary image */}
          <button
            type="button"
            onClick={() => setLightboxIndex(0)}
            className="relative w-full aspect-square bg-gray-100 block group"
            aria-label="View full size"
          >
            <Image
              src={galleryImages[0].url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 512px"
              priority
            />
            {galleryImages.length > 1 && (
              <span className="absolute top-3 right-3 bg-black/60 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
                {galleryImages.length} photos
              </span>
            )}
            <span className="absolute bottom-3 right-3 bg-black/50 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
              Tap to enlarge
            </span>
          </button>

          {/* Thumbnail strip (if multiple) */}
          {galleryImages.length > 1 && (
            <div className="px-5 pt-4 -mb-1">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {galleryImages.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setLightboxIndex(idx)}
                    className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 hover:border-indigo-400 transition-colors"
                    aria-label={`View image ${idx + 1}`}
                  >
                    <Image src={img.url} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="px-5 py-5 space-y-4">
            {/* Price + size row */}
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h3 className="text-2xl font-bold text-gray-900">{product.name}</h3>
              {product.requestedPrice != null && (
                <span className="text-2xl font-semibold text-indigo-600">
                  ${product.requestedPrice.toFixed(2)}
                </span>
              )}
            </div>

            {product.size && (
              <div className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">Size:</span>{' '}
                {product.size}
              </div>
            )}

            {product.description ? (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Description
                </h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {product.description}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">
                No description provided.
              </p>
            )}
          </div>
        </div>
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={galleryImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
