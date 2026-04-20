'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'

interface ProductStat {
  id: string
  name: string
  description: string | null
  imageUrl: string
  size: string | null
  requestedPrice: number | null
  createdAt: string
  stats: {
    right: number
    left: number
  }
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [products, setProducts] = useState<ProductStat[]>([])
  const [productsLoading, setProductsLoading] = useState(false)

  // Upload form state
  const [uploadName, setUploadName] = useState('')
  const [uploadDesc, setUploadDesc] = useState('')
  const [uploadSize, setUploadSize] = useState('')
  const [uploadPrice, setUploadPrice] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchProducts = async () => {
    setProductsLoading(true)
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      if (data.products) setProducts(data.products)
    } catch {
      // ignore
    } finally {
      setProductsLoading(false)
    }
  }

  useEffect(() => {
    // Check if admin session exists via localStorage flag
    const adminLoggedIn = sessionStorage.getItem('adminLoggedIn')
    if (adminLoggedIn === '1') {
      setIsAdmin(true)
      fetchProducts()
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = await res.json()
        setLoginError(data.error || 'Invalid password')
        return
      }
      sessionStorage.setItem('adminLoggedIn', '1')
      setIsAdmin(true)
      fetchProducts()
    } catch {
      setLoginError('Something went wrong. Please try again.')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/admin', { method: 'DELETE' })
    sessionStorage.removeItem('adminLoggedIn')
    setIsAdmin(false)
    setProducts([])
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploadError('')
    setUploadSuccess('')

    if (!uploadName.trim()) {
      setUploadError('Product name is required.')
      return
    }
    if (!uploadFile) {
      setUploadError('Please select an image.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('name', uploadName.trim())
      if (uploadDesc.trim()) formData.append('description', uploadDesc.trim())
      if (uploadSize.trim()) formData.append('size', uploadSize.trim())
      if (uploadPrice.trim()) formData.append('requestedPrice', uploadPrice.trim())
      formData.append('image', uploadFile)

      const res = await fetch('/api/products', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        setUploadError(data.error || 'Upload failed.')
        return
      }

      setUploadSuccess('Product uploaded successfully!')
      setUploadName('')
      setUploadDesc('')
      setUploadSize('')
      setUploadPrice('')
      setUploadFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await fetchProducts()
    } catch {
      setUploadError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' })
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch {
      alert('Failed to delete product.')
    } finally {
      setDeletingId(null)
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Admin Login</h1>
          <p className="text-gray-500 text-sm text-center mb-6">
            Enter the admin password to continue.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
            {loginError && (
              <p className="text-red-500 text-sm text-center">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
            >
              {loginLoading ? 'Logging in…' : 'Log In'}
            </button>
          </form>
          <div className="mt-4 text-center">
            <a href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              ← Back to app
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-gray-900">Admin Panel</span>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
            Product Discovery
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            View App
          </a>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
          >
            Log Out
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Upload Form */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Upload New Product</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g. Wireless Headphones"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  placeholder="Short description…"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Size / Dimensions (optional)
                </label>
                <input
                  type="text"
                  value={uploadSize}
                  onChange={(e) => setUploadSize(e.target.value)}
                  placeholder='e.g. 12" x 8" x 4"'
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requested Price (optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={uploadPrice}
                  onChange={(e) => setUploadPrice(e.target.value)}
                  placeholder="e.g. 49.99"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Image <span className="text-red-400">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
              {uploadFile && (
                <p className="mt-1 text-xs text-gray-400">Selected: {uploadFile.name}</p>
              )}
            </div>
            {uploadError && (
              <p className="text-red-500 text-sm">{uploadError}</p>
            )}
            {uploadSuccess && (
              <p className="text-green-600 text-sm">{uploadSuccess}</p>
            )}
            <button
              type="submit"
              disabled={uploading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-xl transition-colors"
            >
              {uploading ? 'Uploading…' : 'Upload Product'}
            </button>
          </form>
        </section>

        {/* Product List */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Products{' '}
              <span className="text-gray-400 font-normal text-base">
                ({products.length})
              </span>
            </h2>
            <div className="flex items-center gap-4">
              <a
                href="/api/export"
                className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Download CSV
              </a>
              <button
                onClick={fetchProducts}
                className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          {productsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-4xl mb-3">📦</p>
              <p>No products yet. Upload one above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{product.name}</p>
                    {product.description && (
                      <p className="text-sm text-gray-400 truncate">{product.description}</p>
                    )}
                    <div className="flex gap-3 mt-0.5 text-xs text-gray-500">
                      {product.size && <span>📏 {product.size}</span>}
                      {product.requestedPrice != null && (
                        <span>💲{product.requestedPrice.toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">{product.stats.right}</p>
                      <p className="text-xs text-gray-400">Interested</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-500">{product.stats.left}</p>
                      <p className="text-xs text-gray-400">Not Int.</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-700">
                        {product.stats.right + product.stats.left}
                      </p>
                      <p className="text-xs text-gray-400">Total</p>
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(product.id)}
                    disabled={deletingId === product.id}
                    className="ml-2 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete product"
                  >
                    {deletingId === product.id ? (
                      <span className="w-5 h-5 block border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
