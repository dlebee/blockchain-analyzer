'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type Coingecko from '@coingecko/coingecko-typescript'

type RankedToken = Coingecko.Coins.Markets.MarketGetResponse[number]

const ITEMS_PER_PAGE = 250
const DEFAULT_LIMIT = 250

export default function TokenRanksPage() {
  const [tokens, setTokens] = useState<RankedToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const router = useRouter()

  useEffect(() => {
    async function fetchRankedTokens() {
      try {
        setLoading(true)
        const response = await fetch(`/api/tokens/ranked?limit=${limit}`)
        if (!response.ok) {
          throw new Error('Failed to fetch ranked tokens')
        }
        const data = await response.json()
        setTokens(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchRankedTokens()
  }, [limit])

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

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLimit(parseInt(e.target.value, 10))
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading ranked tokens...</div>
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
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Token Rankings
          </h1>
          <div className="flex items-center gap-4">
            <label htmlFor="limit" className="text-sm text-gray-700">
              Show top:
            </label>
            <select
              id="limit"
              value={limit}
              onChange={handleLimitChange}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value={250}>250</option>
              <option value={500}>500</option>
            </select>
          </div>
        </div>

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

        {/* Tokens Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          {paginatedTokens.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No tokens found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Token
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      24h Change
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Market Cap
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      24h Volume
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedTokens.map((token) => (
                    <tr
                      key={token.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleTokenClick(token.id || '')}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{token.market_cap_rank || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {token.image && (
                            <img
                              src={token.image}
                              alt={token.name || 'Token'}
                              className="w-8 h-8 rounded-full"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {token.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {token.symbol?.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        ${token.current_price?.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6,
                        }) || '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                        (token.price_change_percentage_24h || 0) >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {(token.price_change_percentage_24h || 0) >= 0 ? '+' : ''}
                        {token.price_change_percentage_24h?.toFixed(2) || '-'}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {token.market_cap ? (
                          token.market_cap >= 1e9 ? (
                            `$${(token.market_cap / 1e9).toFixed(2)}B`
                          ) : token.market_cap >= 1e6 ? (
                            `$${(token.market_cap / 1e6).toFixed(2)}M`
                          ) : (
                            `$${token.market_cap.toLocaleString()}`
                          )
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {token.total_volume ? (
                          token.total_volume >= 1e9 ? (
                            `$${(token.total_volume / 1e9).toFixed(2)}B`
                          ) : token.total_volume >= 1e6 ? (
                            `$${(token.total_volume / 1e6).toFixed(2)}M`
                          ) : (
                            `$${token.total_volume.toLocaleString()}`
                          )
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

