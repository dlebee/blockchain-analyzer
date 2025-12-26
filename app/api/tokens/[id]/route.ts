import { NextResponse } from 'next/server'
import Coingecko from '@coingecko/coingecko-typescript'
import { createClient } from 'redis'

const CACHE_TTL = 24 * 60 * 60 // 24 hours in seconds

async function getRedisClient() {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is not set')
  }

  const client = createClient({
    url: redisUrl,
  })

  if (!client.isOpen) {
    await client.connect()
  }

  return client
}

async function getTokenDetailsFromCoinGecko(tokenId: string) {
  const client = new Coingecko({
    environment: 'demo', // Use the free public API
    defaultHeaders: {
      'x-cg-pro-api-key': null, // Explicitly omit pro API key header for free API
    },
  })
  const response = await client.coins.getID(tokenId, {
    community_data: true,
    developer_data: true,
    market_data: true,
    tickers: true,
    localization: false, // Set to false to reduce response size
    sparkline: false,
  })
  return response
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const tokenId = resolvedParams.id

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      )
    }

    const redis = await getRedisClient()
    const cacheKey = `tokens:details:${tokenId}`

    // Try to get from cache
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return NextResponse.json(JSON.parse(cached))
      }
    } catch (error) {
      console.error('Redis get error:', error)
      // Continue to fetch from API if cache fails
    }

    // Fetch from CoinGecko
    console.log(`Fetching token details for ID: ${tokenId}`)
    const tokenDetails = await getTokenDetailsFromCoinGecko(tokenId)
    console.log(`Token details received, keys: ${Object.keys(tokenDetails).join(', ')}`)

    // Cache the result
    try {
      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(tokenDetails))
    } catch (error) {
      console.error('Redis set error:', error)
      // Continue even if caching fails
    } finally {
      await redis.quit()
    }

    return NextResponse.json(tokenDetails)
  } catch (error) {
    console.error('Error fetching token details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch token details' },
      { status: 500 }
    )
  }
}

