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
    environment: 'demo',
    defaultHeaders: {
      'x-cg-pro-api-key': null,
    },
  })
  const response = await client.assetPlatforms.get()
  return response
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const chainId = resolvedParams.id

    if (!chainId) {
      return NextResponse.json({ error: 'Chain ID is required' }, { status: 400 })
    }

    const redis = await getRedisClient()
    const cacheKey = `chains:native-token:${chainId}`

    // Try to get from cache
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return NextResponse.json(JSON.parse(cached))
      }
    } catch (error) {
      console.error('Redis get error:', error)
    }

    // Fetch asset platforms
    const platforms = await getChainsFromCoinGecko()
    const platform = platforms.find((p) => p.id === chainId)

    if (!platform) {
      await redis.quit()
      return NextResponse.json(
        { error: 'Platform not found' },
        { status: 404 }
      )
    }

    if (!platform.native_coin_id) {
      await redis.quit()
      return NextResponse.json(
        { error: 'No native coin ID found for this platform' },
        { status: 404 }
      )
    }

    // Fetch native token details
    const coingeckoClient = new Coingecko({
      environment: 'demo',
      defaultHeaders: {
        'x-cg-pro-api-key': null,
      },
    })

    const nativeToken = await coingeckoClient.coins.getID(platform.native_coin_id, {
      community_data: false,
      developer_data: false,
      market_data: true,
      tickers: false,
      localization: false,
      sparkline: false,
    })

    const result = {
      platform: {
        id: platform.id,
        name: platform.name,
        shortname: platform.shortname,
        chain_identifier: platform.chain_identifier,
      },
      nativeToken: {
        id: nativeToken.id,
        name: nativeToken.name,
        symbol: nativeToken.symbol,
        image: nativeToken.image,
        market_cap_rank: nativeToken.market_cap_rank,
        current_price: nativeToken.market_data?.current_price?.usd,
        market_cap: nativeToken.market_data?.market_cap?.usd,
      },
    }

    // Cache the result
    try {
      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(result))
    } catch (error) {
      console.error('Redis set error:', error)
    } finally {
      await redis.quit()
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching native token:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch native token',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

