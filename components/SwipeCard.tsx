'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'

interface ProductImage {
  id: string
  url: string
}

interface Product {
  id: string
  name: string
  description: string | null
  imageUrl: string
  size: string | null
  requestedPrice: number | null
  images?: ProductImage[]
}

interface SwipeCardProps {
  product: Product
  onSwipe: (direction: 'left' | 'right') => void
  onImageClick?: () => void
}

const SWIPE_THRESHOLD = 100
// Movement under this many pixels is considered a tap, not a drag.
const TAP_MAX_MOVEMENT = 6

export default function SwipeCard({ product, onSwipe, onImageClick }: SwipeCardProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isAnimatingOut, setIsAnimatingOut] = useState<'left' | 'right' | null>(null)
  const startPos = useRef({ x: 0, y: 0 })
  const movedRef = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const imageCount = product.images?.length ?? 0
  const hasMultiple = imageCount > 1

  const triggerSwipe = useCallback(
    (direction: 'left' | 'right') => {
      setIsAnimatingOut(direction)
      setTimeout(() => {
        onSwipe(direction)
        setOffset({ x: 0, y: 0 })
        setIsAnimatingOut(null)
      }, 350)
    },
    [onSwipe]
  )

  const handleStart = (clientX: number, clientY: number) => {
    if (isAnimatingOut) return
    setIsDragging(true)
    startPos.current = { x: clientX, y: clientY }
    movedRef.current = false
  }

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || isAnimatingOut) return
    const dx = clientX - startPos.current.x
    const dy = clientY - startPos.current.y
    if (Math.abs(dx) > TAP_MAX_MOVEMENT || Math.abs(dy) > TAP_MAX_MOVEMENT) {
      movedRef.current = true
    }
    setOffset({ x: dx, y: dy })
  }

  const handleEnd = () => {
    if (!isDragging) return
    setIsDragging(false)
    if (offset.x > SWIPE_THRESHOLD) {
      triggerSwipe('right')
    } else if (offset.x < -SWIPE_THRESHOLD) {
      triggerSwipe('left')
    } else {
      // Snap back. If the user barely moved, treat it as a tap on the card.
      const wasTap = !movedRef.current
      setOffset({ x: 0, y: 0 })
      if (wasTap && onImageClick) onImageClick()
    }
  }

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY)
  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY)
  const onMouseUp = () => handleEnd()
  const onMouseLeave = () => {
    if (isDragging) handleEnd()
  }

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    handleStart(t.clientX, t.clientY)
  }
  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0]
    handleMove(t.clientX, t.clientY)
  }
  const onTouchEnd = () => handleEnd()

  // Compute transform
  const rotation = offset.x / 15
  let transform = `translateX(${offset.x}px) translateY(${offset.y * 0.3}px) rotate(${rotation}deg)`
  let transition = isDragging ? 'none' : 'transform 0.3s ease'

  if (isAnimatingOut === 'right') {
    transform = `translateX(120vw) rotate(30deg)`
    transition = 'transform 0.35s ease-out'
  } else if (isAnimatingOut === 'left') {
    transform = `translateX(-120vw) rotate(-30deg)`
    transition = 'transform 0.35s ease-out'
  }

  // Overlay opacity
  const rightOpacity = Math.max(0, Math.min(1, offset.x / SWIPE_THRESHOLD))
  const leftOpacity = Math.max(0, Math.min(1, -offset.x / SWIPE_THRESHOLD))

  return (
    <div className="relative flex items-center justify-center w-full" style={{ height: '480px' }}>
      <div
        ref={cardRef}
        className="absolute w-80 sm:w-96 bg-white rounded-3xl shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{
          transform,
          transition,
          touchAction: 'none',
          maxHeight: '480px',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* YES overlay */}
        <div
          className="absolute inset-0 z-10 flex items-start justify-start p-6 pointer-events-none"
          style={{ opacity: rightOpacity }}
        >
          <span className="border-4 border-green-500 text-green-500 font-black text-3xl px-4 py-1 rounded-xl rotate-[-15deg]">
            YES
          </span>
        </div>

        {/* NO overlay */}
        <div
          className="absolute inset-0 z-10 flex items-start justify-end p-6 pointer-events-none"
          style={{ opacity: leftOpacity }}
        >
          <span className="border-4 border-red-500 text-red-500 font-black text-3xl px-4 py-1 rounded-xl rotate-[15deg]">
            NO
          </span>
        </div>

        {/* Image */}
        <div className="relative w-full" style={{ height: '320px' }}>
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            draggable={false}
          />
          {hasMultiple && (
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                  clipRule="evenodd"
                />
              </svg>
              {imageCount} photos
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-bold text-gray-900 truncate flex-1">{product.name}</h2>
            {product.requestedPrice != null && (
              <span className="text-lg font-semibold text-indigo-600 shrink-0">
                ${product.requestedPrice.toFixed(2)}
              </span>
            )}
          </div>
          {product.description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{product.description}</p>
          )}
          {product.size && (
            <p className="mt-1 text-xs text-gray-400">Size: {product.size}</p>
          )}
        </div>
      </div>
    </div>
  )
}
