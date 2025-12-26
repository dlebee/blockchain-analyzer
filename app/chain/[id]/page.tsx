'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type Coingecko from '@coingecko/coingecko-typescript'

type Chain = Coingecko.AssetPlatformGetResponse[number]

interface NativeTokenData {
  platform: {
    id: string
    name: string
    shortname: string
    chain_identifier: number | null
  }
  nativeToken: {
    id: string
    name: string
    symbol: string
    image: {
      thumb?: string
      small?: string
      large?: string
    }
    market_cap_rank: number | null
    current_price: number | null
    market_cap: number | null
  }
}

export default function ChainDetailPage() {
  const params = useParams()
  const router = useRouter()
  const chainId = params.id as string
  const [chain, setChain] = useState<Chain | null>(null)
  const [nativeTokenData, setNativeTokenData] = useState<NativeTokenData | null>(null)
  const [loading, setLoading] = useState(true)
  const [nativeTokenLoading, setNativeTokenLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chainJsonExpanded, setChainJsonExpanded] = useState(false)
  const [chainJsonSearch, setChainJsonSearch] = useState('')
  const [nativeTokenJsonExpanded, setNativeTokenJsonExpanded] = useState(false)
  const [nativeTokenJsonSearch, setNativeTokenJsonSearch] = useState('')

  useEffect(() => {
    async function fetchChain() {
      try {
        const response = await fetch('/api/chains')
        if (!response.ok) {
          throw new Error('Failed to fetch chains')
        }
        const chains = await response.json()
        const foundChain = chains.find((c: Chain) => c.id === chainId)
        
        if (!foundChain) {
          setError('Chain not found')
          return
        }
        
        setChain(foundChain)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    if (chainId) {
      fetchChain()
    }
  }, [chainId])

  useEffect(() => {
    async function fetchNativeToken() {
      if (!chainId) return

      try {
        setNativeTokenLoading(true)
        const response = await fetch(`/api/chains/${chainId}/native-token`)
        if (response.ok) {
          const data = await response.json()
          setNativeTokenData(data)
        } else {
          // Native token not found is not an error, just means this platform doesn't have one
          console.log('No native token found for this platform')
        }
      } catch (err) {
        console.error('Error fetching native token:', err)
      } finally {
        setNativeTokenLoading(false)
      }
    }

    if (chainId) {
      fetchNativeToken()
    }
  }, [chainId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading chain details...</div>
      </div>
    )
  }

  if (error || !chain) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Error: {error || 'Chain not found'}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <button
                onClick={() => router.push('/')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Chains
              </button>
            </li>
            <li className="text-gray-500">/</li>
            <li className="text-gray-900 font-medium truncate max-w-xs">
              {chain.name}
            </li>
          </ol>
        </nav>

        {/* Title with Image */}
        <div className="flex items-center gap-4 mb-8">
          {chain.image?.small && (
            <img
              src={chain.image.small}
              alt={chain.name || 'Chain logo'}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0 border-2 border-gray-200"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {chain.name}
            </h1>
            {chain.shortname && (
              <p className="text-lg text-gray-600 mt-1">{chain.shortname}</p>
            )}
            {chain.chain_identifier && (
              <p className="text-sm text-gray-500 mt-1">Chain ID: {chain.chain_identifier}</p>
            )}
          </div>
        </div>

        {/* Native Token Information */}
        {nativeTokenLoading ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Native Token
            </h2>
            <div className="text-gray-500">Loading native token information...</div>
          </div>
        ) : nativeTokenData ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Native Token
            </h2>
            <Link
              href={`/token/${nativeTokenData.nativeToken.id}`}
              className="block hover:bg-gray-50 rounded-lg p-4 transition-colors"
            >
              <div className="flex items-start gap-4">
                {nativeTokenData.nativeToken.image?.large && (
                  <img
                    src={nativeTokenData.nativeToken.image.large}
                    alt={nativeTokenData.nativeToken.name || 'Token logo'}
                    className="w-16 h-16 rounded-full object-cover flex-shrink-0 border-2 border-gray-200"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      {nativeTokenData.nativeToken.name}
                    </h3>
                    {nativeTokenData.nativeToken.symbol && (
                      <span className="text-lg text-gray-600 bg-gray-100 px-3 py-1 rounded">
                        {nativeTokenData.nativeToken.symbol.toUpperCase()}
                      </span>
                    )}
                    {nativeTokenData.nativeToken.market_cap_rank && (
                      <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded">
                        Rank #{nativeTokenData.nativeToken.market_cap_rank}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    {nativeTokenData.nativeToken.current_price !== null && (
                      <div>
                        <p className="text-sm text-gray-500">Price</p>
                        <p className="text-lg font-semibold text-gray-900">
                          ${nativeTokenData.nativeToken.current_price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6,
                          })}
                        </p>
                      </div>
                    )}
                    {nativeTokenData.nativeToken.market_cap !== null && (
                      <div>
                        <p className="text-sm text-gray-500">Market Cap</p>
                        <p className="text-lg font-semibold text-gray-900">
                          ${(nativeTokenData.nativeToken.market_cap / 1e9).toFixed(2)}B
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-500">Token ID</p>
                      <p className="text-sm font-medium text-gray-900">
                        {nativeTokenData.nativeToken.id}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ) : null}

        {/* Chain Data JSON */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Chain Data
            </h2>
            <button
              onClick={() => setChainJsonExpanded(!chainJsonExpanded)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              {chainJsonExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
          
          {chainJsonExpanded && (
            <>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search JSON data..."
                  value={chainJsonSearch}
                  onChange={(e) => setChainJsonSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
              </div>
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm font-mono max-h-[600px]">
                  {(() => {
                    const jsonString = JSON.stringify(chain, null, 2)
                    if (!chainJsonSearch.trim()) {
                      return jsonString
                    }
                    
                    const searchLower = chainJsonSearch.toLowerCase()
                    const lines = jsonString.split('\n')
                    const filteredLines = lines.filter(line => 
                      line.toLowerCase().includes(searchLower)
                    )
                    
                    if (filteredLines.length === 0) {
                      return <span className="text-gray-500">No matches found</span>
                    }
                    
                    const searchRegex = new RegExp(`(${chainJsonSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
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
                {chainJsonSearch && (
                  <div className="absolute top-2 right-2 text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                    {(() => {
                      const jsonString = JSON.stringify(chain, null, 2)
                      const searchLower = chainJsonSearch.toLowerCase()
                      const matches = jsonString.toLowerCase().split(searchLower).length - 1
                      return `${matches} match${matches !== 1 ? 'es' : ''}`
                    })()}
                  </div>
                )}
              </div>
            </>
          )}
          
          {!chainJsonExpanded && (
            <div className="text-sm text-gray-500 italic">
              Click "Expand" to view full JSON data
            </div>
          )}
        </div>

        {/* Native Token Data JSON */}
        {nativeTokenData && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Native Token Data
              </h2>
              <button
                onClick={() => setNativeTokenJsonExpanded(!nativeTokenJsonExpanded)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                {nativeTokenJsonExpanded ? 'Collapse' : 'Expand'}
              </button>
            </div>
            
            {nativeTokenJsonExpanded && (
              <>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search JSON data..."
                    value={nativeTokenJsonSearch}
                    onChange={(e) => setNativeTokenJsonSearch(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm font-mono max-h-[600px]">
                    {(() => {
                      const jsonString = JSON.stringify(nativeTokenData, null, 2)
                      if (!nativeTokenJsonSearch.trim()) {
                        return jsonString
                      }
                      
                      const searchLower = nativeTokenJsonSearch.toLowerCase()
                      const lines = jsonString.split('\n')
                      const filteredLines = lines.filter(line => 
                        line.toLowerCase().includes(searchLower)
                      )
                      
                      if (filteredLines.length === 0) {
                        return <span className="text-gray-500">No matches found</span>
                      }
                      
                      const searchRegex = new RegExp(`(${nativeTokenJsonSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
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
                  {nativeTokenJsonSearch && (
                    <div className="absolute top-2 right-2 text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                      {(() => {
                        const jsonString = JSON.stringify(nativeTokenData, null, 2)
                        const searchLower = nativeTokenJsonSearch.toLowerCase()
                        const matches = jsonString.toLowerCase().split(searchLower).length - 1
                        return `${matches} match${matches !== 1 ? 'es' : ''}`
                      })()}
                    </div>
                  )}
                </div>
              </>
            )}
            
            {!nativeTokenJsonExpanded && (
              <div className="text-sm text-gray-500 italic">
                Click "Expand" to view full JSON data
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

