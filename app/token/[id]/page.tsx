'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { FaGlobe, FaGithub, FaLink, FaComments } from 'react-icons/fa'
import type Coingecko from '@coingecko/coingecko-typescript'
import PriceChart from './components/PriceChart'
import GithubAnalysis from './components/GithubAnalysis'
import TokenomicsAnalysis from './components/TokenomicsAnalysis'
import CombinedAnalysis from './components/CombinedAnalysis'
import ListingAnalysis from './components/ListingAnalysis'

type TokenDetails = Coingecko.Coins.CoinGetIDResponse

export default function TokenDetailPage() {
  const params = useParams()
  const router = useRouter()
  const tokenId = params.id as string
  const [token, setToken] = useState<TokenDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [jsonExpanded, setJsonExpanded] = useState(false)
  const [jsonSearch, setJsonSearch] = useState('')

  useEffect(() => {
    async function fetchToken() {
      try {
        console.log('Fetching token details for:', tokenId)
        const response = await fetch(`/api/tokens/${tokenId}`)
        console.log('Response status:', response.status)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('API error:', errorData)
          throw new Error(errorData.error || 'Failed to fetch token details')
        }
        const data = await response.json()
        console.log('Token data received:', Object.keys(data))
        setToken(data)
      } catch (err) {
        console.error('Fetch error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    if (tokenId) {
      fetchToken()
    }
  }, [tokenId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading token details...</div>
      </div>
    )
  }

  if (error || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Error: {error || 'Token not found'}</div>
      </div>
    )
  }

  const marketData = token.market_data
  const description = token.description?.en || token.description?.[Object.keys(token.description || {})[0]] || 'No description available'

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link
                href="/tokens"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Tokens
              </Link>
            </li>
            <li className="text-gray-500">/</li>
            <li className="text-gray-900 font-medium truncate max-w-xs">
              {token.name}
            </li>
          </ol>
        </nav>

        {/* Header with Image */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start gap-6">
            {token.image?.large && (
              <img
                src={token.image.large}
                alt={token.name || 'Token logo'}
                className="w-24 h-24 rounded-full object-cover flex-shrink-0 border-2 border-gray-200"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-gray-900">
                  {token.name}
                </h1>
                {token.symbol && (
                  <span className="text-2xl text-gray-600 bg-gray-100 px-4 py-1 rounded">
                    {token.symbol.toUpperCase()}
                  </span>
                )}
                {token.market_cap_rank && (
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded">
                    Rank #{token.market_cap_rank}
                  </span>
                )}
              </div>
              {token.id && (
                <p className="text-sm text-gray-500 mb-4">ID: {token.id}</p>
              )}
              
              {/* Market Data Summary */}
              {marketData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {marketData.current_price?.usd && (
                    <div>
                      <p className="text-sm text-gray-500">Price</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ${marketData.current_price.usd.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6,
                        })}
                      </p>
                    </div>
                  )}
                  {marketData.market_cap?.usd && (
                    <div>
                      <p className="text-sm text-gray-500">Market Cap</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ${(marketData.market_cap.usd / 1e9).toFixed(2)}B
                      </p>
                    </div>
                  )}
                  {marketData.total_volume?.usd && (
                    <div>
                      <p className="text-sm text-gray-500">24h Volume</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ${(marketData.total_volume.usd / 1e6).toFixed(2)}M
                      </p>
                    </div>
                  )}
                  {marketData.price_change_percentage_24h !== undefined && (
                    <div>
                      <p className="text-sm text-gray-500">24h Change</p>
                      <p className={`text-lg font-semibold ${
                        marketData.price_change_percentage_24h >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {marketData.price_change_percentage_24h >= 0 ? '+' : ''}
                        {marketData.price_change_percentage_24h.toFixed(2)}%
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {description && description !== 'No description available' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Description
            </h2>
            <div 
              className="text-gray-700 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          </div>
        )}

        {/* Links */}
        {token.links && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Links
            </h2>
            <div className="flex flex-wrap gap-4">
              {token.links.homepage && token.links.homepage[0] && (
                <a
                  href={token.links.homepage[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 underline"
                >
                  <FaGlobe className="w-4 h-4" />
                  <span>Homepage</span>
                </a>
              )}
              {token.links?.repos_url?.github && token.links.repos_url.github.length > 0 && (
                <>
                  {token.links.repos_url.github.map((githubUrl, index) => (
                    <a
                      key={index}
                      href={githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 underline"
                    >
                      <FaGithub className="w-4 h-4" />
                      <span>{(token.links?.repos_url?.github?.length || 0) > 1 ? `GitHub ${index + 1}` : 'GitHub'}</span>
                    </a>
                  ))}
                </>
              )}
              {token.links.blockchain_site && token.links.blockchain_site[0] && (
                <a
                  href={token.links.blockchain_site[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 underline"
                >
                  <FaLink className="w-4 h-4" />
                  <span>Blockchain Explorer</span>
                </a>
              )}
              {token.links.official_forum_url && token.links.official_forum_url[0] && (
                <a
                  href={token.links.official_forum_url[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 underline"
                >
                  <FaComments className="w-4 h-4" />
                  <span>Forum</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Price Chart */}
        <PriceChart tokenId={tokenId} />

        {/* Listing Analysis */}
        <ListingAnalysis tokenId={tokenId} />

        {/* GitHub Analysis */}
        {token.links?.repos_url?.github && token.links.repos_url.github[0] && (
          <GithubAnalysis tokenId={tokenId} githubUrl={token.links.repos_url.github[0]} />
        )}

        {/* Tokenomics Analysis */}
        <TokenomicsAnalysis tokenId={tokenId} />

        {/* Combined Analysis */}
        {token.links?.repos_url?.github && token.links.repos_url.github[0] && (
          <CombinedAnalysis tokenId={tokenId} githubUrl={token.links.repos_url.github[0]} />
        )}

        {/* Token Data JSON Dump */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Token Data
            </h2>
            <button
              onClick={() => setJsonExpanded(!jsonExpanded)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              {jsonExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
          
          {jsonExpanded && (
            <>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search JSON data..."
                  value={jsonSearch}
                  onChange={(e) => setJsonSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
              </div>
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm font-mono max-h-[600px]">
                  {(() => {
                    const jsonString = JSON.stringify(token, null, 2)
                    if (!jsonSearch.trim()) {
                      return jsonString
                    }
                    
                    // Filter JSON to show only matching lines
                    const searchLower = jsonSearch.toLowerCase()
                    const lines = jsonString.split('\n')
                    const filteredLines = lines.filter(line => 
                      line.toLowerCase().includes(searchLower)
                    )
                    
                    if (filteredLines.length === 0) {
                      return <span className="text-gray-500">No matches found</span>
                    }
                    
                    // Highlight matches in the filtered lines
                    const searchRegex = new RegExp(`(${jsonSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
                    return filteredLines.map((line, index) => {
                      const parts = line.split(searchRegex)
                      return (
                        <div key={index}>
                          {parts.map((part, partIndex) => {
                            if (searchRegex.test(part)) {
                              return (
                                <mark key={partIndex} className="bg-yellow-500 text-gray-900">
                                  {part}
                                </mark>
                              )
                            }
                            return <span key={partIndex}>{part}</span>
                          })}
                        </div>
                      )
                    })
                  })()}
                </pre>
                {jsonSearch && (
                  <div className="absolute top-2 right-2 text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                    {(() => {
                      const jsonString = JSON.stringify(token, null, 2)
                      const searchLower = jsonSearch.toLowerCase()
                      const matches = jsonString.toLowerCase().split(searchLower).length - 1
                      return `${matches} match${matches !== 1 ? 'es' : ''}`
                    })()}
                  </div>
                )}
              </div>
            </>
          )}
          
          {!jsonExpanded && (
            <div className="text-sm text-gray-500 italic">
              Click "Expand" to view full JSON data
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
