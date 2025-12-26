'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type Coingecko from '@coingecko/coingecko-typescript'

type Chain = Coingecko.AssetPlatformGetResponse[number]

export default function ChainDetailPage() {
  const params = useParams()
  const router = useRouter()
  const chainId = params.id as string
  const [chain, setChain] = useState<Chain | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Chain Data
          </h2>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm font-mono">
            {JSON.stringify(chain, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}

