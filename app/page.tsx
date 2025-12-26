'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type Coingecko from '@coingecko/coingecko-typescript'

type Chain = Coingecko.AssetPlatformGetResponse[number]

const ITEMS_PER_PAGE = 20

export default function Home() {
  const [chains, setChains] = useState<Chain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const router = useRouter()

  useEffect(() => {
    async function fetchChains() {
      try {
        const response = await fetch('/api/chains')
        if (!response.ok) {
          throw new Error('Failed to fetch chains')
        }
        const data = await response.json()
        setChains(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchChains()
  }, [])

  // Filter chains based on search query
  const filteredChains = useMemo(() => {
    if (!searchQuery.trim()) {
      return chains
    }

    const query = searchQuery.toLowerCase()
    return chains.filter((chain) => {
      const name = chain.name?.toLowerCase() || ''
      const shortname = chain.shortname?.toLowerCase() || ''
      const id = chain.id?.toLowerCase() || ''
      const chainId = chain.chain_identifier?.toString() || ''
      
      return (
        name.includes(query) ||
        shortname.includes(query) ||
        id.includes(query) ||
        chainId.includes(query)
      )
    })
  }, [chains, searchQuery])

  // Paginate filtered chains
  const paginatedChains = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredChains.slice(startIndex, endIndex)
  }, [filteredChains, currentPage])

  const totalPages = Math.ceil(filteredChains.length / ITEMS_PER_PAGE)

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const handleChainClick = (chainId: string) => {
    router.push(`/chain/${chainId}`)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading chains...</div>
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
          Blockchain Networks
        </h1>

        {/* Search Box */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by name, shortname, ID, or chain identifier..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
          {searchQuery && (
            <p className="mt-2 text-sm text-gray-600">
              Showing {filteredChains.length} of {chains.length} chains
            </p>
          )}
        </div>

        {/* Chains List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          {paginatedChains.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No chains found matching your search.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {paginatedChains.map((chain) => (
                <li
                  key={chain.id}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleChainClick(chain.id || '')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {chain.image?.thumb && (
                        <img
                          src={chain.image.thumb}
                          alt={chain.name || 'Chain logo'}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {chain.name}
                        </h3>
                        {chain.shortname && (
                          <p className="text-sm text-gray-500">{chain.shortname}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      {chain.chain_identifier && (
                        <span>ID: {chain.chain_identifier}</span>
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
              Showing {paginatedChains.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredChains.length)} of{' '}
              {filteredChains.length}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
