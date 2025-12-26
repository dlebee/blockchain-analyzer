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

async function getChainsFromCoinGecko() {
  const client = new Coingecko({
    environment: 'demo', // Use the free public API
    defaultHeaders: {
      'x-cg-pro-api-key': null, // Explicitly omit pro API key header for free API
    },
  })
  const response = await client.assetPlatforms.get()
  return response
}

export async function GET() {
  try {
    const redis = await getRedisClient()
    const cacheKey = 'chains:asset_platforms'

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
    const chains = await getChainsFromCoinGecko()

    // Cache the result
    try {
      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(chains))
    } catch (error) {
      console.error('Redis set error:', error)
      // Continue even if caching fails
    } finally {
      await redis.quit()
    }

    return NextResponse.json(chains)
  } catch (error) {
    console.error('Error fetching chains:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chains' },
      { status: 500 }
    )
  }
}
