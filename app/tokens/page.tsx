'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type Coingecko from '@coingecko/coingecko-typescript'

type Token = Coingecko.Coins.List.ListGetResponse[number]

const ITEMS_PER_PAGE = 20

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const router = useRouter()

  useEffect(() => {
    async function fetchTokens() {
      try {
        const response = await fetch('/api/tokens')
        if (!response.ok) {
          throw new Error('Failed to fetch tokens')
        }
        const data = await response.json()
        setTokens(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchTokens()
  }, [])

  // Filter tokens based on search query
  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) {
      return tokens
    }

    const query = searchQuery.toLowerCase()
    return tokens.filter((token) => {
      const name = token.name?.toLowerCase() || ''
      const symbol = token.symbol?.toLowerCase() || ''
      const id = token.id?.toLowerCase() || ''
      
      return (
        name.includes(query) ||
        symbol.includes(query) ||
        id.includes(query)
      )
    })
  }, [tokens, searchQuery])

  // Paginate filtered tokens
  const paginatedTokens = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredTokens.slice(startIndex, endIndex)
  }, [filteredTokens, currentPage])

  const totalPages = Math.ceil(filteredTokens.length / ITEMS_PER_PAGE)

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const handleTokenClick = (tokenId: string) => {
    router.push(`/token/${tokenId}`)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading tokens...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Tokens
        </h1>

        {/* Search Box */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by name, symbol, or ID..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
          {searchQuery && (
            <p className="mt-2 text-sm text-gray-600">
              Showing {filteredTokens.length} of {tokens.length} tokens
            </p>
          )}
        </div>

        {/* Tokens List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          {paginatedTokens.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No tokens found matching your search.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {paginatedTokens.map((token) => (
                <li
                  key={token.id}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleTokenClick(token.id || '')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {token.name}
                        </h3>
                        {token.symbol && (
                          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {token.symbol.toUpperCase()}
                          </span>
                        )}
                      </div>
                      {token.id && (
                        <p className="text-sm text-gray-500 mt-1">ID: {token.id}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow-md">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
            <div className="text-sm text-gray-600">
              Showing {paginatedTokens.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredTokens.length)} of{' '}
              {filteredTokens.length}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

