import { NextResponse } from 'next/server'
import Coingecko from '@coingecko/coingecko-typescript'
import { createClient } from 'redis'

const CACHE_TTL = 60 * 60 // 1 hour in seconds

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

async function getMarketChartFromCoinGecko(tokenId: string, vsCurrency: string, days: string = '30') {
  const client = new Coingecko({
    environment: 'demo',
    defaultHeaders: {
      'x-cg-pro-api-key': null,
    },
  })
  const response = await client.coins.marketChart.get(tokenId, {
    vs_currency: vsCurrency,
    days: days,
    interval: 'daily',
  })
  return response
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const tokenId = resolvedParams.id
    const { searchParams } = new URL(request.url)
    const days = searchParams.get('days') || '30'

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      )
    }

    const redis = await getRedisClient()
    const cacheKey = `tokens:chart:${tokenId}:${days}`

    // Try to get from cache
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return NextResponse.json(JSON.parse(cached))
      }
    } catch (error) {
      console.error('Redis get error:', error)
    }

    // Fetch data for USD only
    const usdData = await getMarketChartFromCoinGecko(tokenId, 'usd', days)

    // Combine the data
    const chartData = {
      usd: usdData,
    }

    // Cache the result
    try {
      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(chartData))
    } catch (error) {
      console.error('Redis set error:', error)
    } finally {
      await redis.quit()
    }

    return NextResponse.json(chartData)
  } catch (error) {
    console.error('Error fetching market chart:', error)
    return NextResponse.json(
      { error: 'Failed to fetch market chart' },
      { status: 500 }
    )
  }
}

