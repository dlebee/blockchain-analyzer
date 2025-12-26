import { NextResponse } from 'next/server'
import Coingecko from '@coingecko/coingecko-typescript'
import { createClient } from 'redis'

const CACHE_TTL = 7 * 24 * 60 * 60 // 1 week in seconds

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

async function getRankedTokensFromCoinGecko(page: number, perPage: number) {
  const client = new Coingecko({
    environment: 'demo', // Use the free public API
    defaultHeaders: {
      'x-cg-pro-api-key': null, // Explicitly omit pro API key header for free API
    },
  })

  const response = await client.coins.markets.get({
    vs_currency: 'usd',
    order: 'market_cap_desc', // Sort by market cap descending (ranked)
    per_page: perPage,
    page: page,
    sparkline: false,
  })

  return response
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : 250

    if (limit > 5000) {
      return NextResponse.json(
        { error: 'Limit cannot exceed 5000' },
        { status: 400 }
      )
    }

    const redis = await getRedisClient()
    const perPage = 250 // Max per page
    const pagesNeeded = Math.ceil(limit / perPage)
    const allTokens = []

    // Fetch pages, checking cache first
    for (let page = 1; page <= pagesNeeded; page++) {
      const cacheKey = `tokens:ranked:page:${page}`

      // Try to get from cache first
      let pageTokens = null
      try {
        const cached = await redis.get(cacheKey)
        if (cached) {
          pageTokens = JSON.parse(cached)
        }
      } catch (error) {
        console.error(`Redis get error for page ${page}:`, error)
      }

      // If not in cache, fetch from CoinGecko
      if (!pageTokens) {
        try {
          pageTokens = await getRankedTokensFromCoinGecko(page, perPage)
          
          // Cache the page
          try {
            await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(pageTokens))
          } catch (error) {
            console.error(`Redis set error for page ${page}:`, error)
          }
        } catch (error) {
          console.error(`Error fetching page ${page}:`, error)
          // Continue with other pages even if one fails
          continue
        }
      }

      allTokens.push(...pageTokens)

      // If we got fewer results than requested, we've reached the end
      if (pageTokens.length < perPage) {
        break
      }

      // Small delay between page fetches (only if fetching from API, not cache)
      if (!pageTokens || pageTokens.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    await redis.quit()

    // Return only the requested limit
    return NextResponse.json(allTokens.slice(0, limit))
  } catch (error) {
    console.error('Error fetching ranked tokens:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ranked tokens' },
      { status: 500 }
    )
  }
}

