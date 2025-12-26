'use client'

import { useEffect, useState } from 'react'
import { FaExchangeAlt, FaBuilding, FaCoins, FaSearch, FaGlobe, FaShieldAlt } from 'react-icons/fa'

interface Exchange {
  id: string
  name: string
  centralized: boolean
  country?: string
  trust_score?: number
  trade_volume_24h_btc?: number
  year_established?: number
  image?: string
  url?: string
}

interface ExchangesResponse {
  total: number
  cex: number
  dex: number
  exchanges: Exchange[]
  fetchedAt: string
}

export default function ExchangesPage() {
  const [data, setData] = useState<ExchangesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'cex' | 'dex'>('all')

  useEffect(() => {
    async function fetchExchanges() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/exchanges')
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to fetch exchanges')
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchExchanges()
  }, [])

  // Deduplicate exchanges by ID before filtering (in case API returns duplicates)
  const uniqueExchanges = data?.exchanges ? Array.from(
    new Map(data.exchanges.map(ex => [ex.id, ex])).values()
  ) : []

  const filteredExchanges = uniqueExchanges.filter((exchange) => {
    const matchesSearch = exchange.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exchange.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || 
                       (filterType === 'cex' && exchange.centralized) ||
                       (filterType === 'dex' && !exchange.centralized)
    return matchesSearch && matchesType
  }) || []

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-lg text-gray-500">Loading exchanges...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-red-500">Error: {error || 'Failed to load exchanges'}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <FaExchangeAlt className="w-8 h-8" />
            All Exchanges
          </h1>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <FaExchangeAlt className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-gray-600">Total</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.total}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <FaBuilding className="w-4 h-4 text-purple-600" />
                <p className="text-xs text-gray-600">CEX</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.cex}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <FaCoins className="w-4 h-4 text-green-600" />
                <p className="text-xs text-gray-600">DEX</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.dex}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <FaGlobe className="w-4 h-4 text-gray-600" />
                <p className="text-xs text-gray-600">Filtered</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{filteredExchanges.length}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search exchanges by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('cex')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  filterType === 'cex'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <FaBuilding className="w-4 h-4" />
                CEX ({data.cex})
              </button>
              <button
                onClick={() => setFilterType('dex')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  filterType === 'dex'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <FaCoins className="w-4 h-4" />
                DEX ({data.dex})
              </button>
            </div>
          </div>
        </div>

        {/* Exchanges List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exchange
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trust Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    24h Volume (BTC)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Country
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Established
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExchanges.map((exchange) => (
                  <tr key={exchange.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {exchange.image && (
                          <img
                            src={exchange.image}
                            alt={exchange.name}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{exchange.name}</div>
                          <div className="text-xs text-gray-500">{exchange.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          exchange.centralized
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {exchange.centralized ? (
                          <>
                            <FaBuilding className="w-3 h-3" />
                            CEX
                          </>
                        ) : (
                          <>
                            <FaCoins className="w-3 h-3" />
                            DEX
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {exchange.trust_score !== undefined && exchange.trust_score !== null ? (
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              exchange.trust_score >= 8
                                ? 'bg-green-500'
                                : exchange.trust_score >= 5
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                          />
                          <span className="text-sm text-gray-900">{exchange.trust_score}/10</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {exchange.trade_volume_24h_btc
                        ? `${(exchange.trade_volume_24h_btc / 1000).toFixed(2)}K BTC`
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {exchange.country || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {exchange.year_established || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredExchanges.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No exchanges found matching your criteria.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          Last updated: {new Date(data.fetchedAt).toLocaleString()} • Total: {data.total} exchanges
        </div>
      </div>
    </div>
  )
}

