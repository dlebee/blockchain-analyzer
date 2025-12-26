import { NextResponse } from 'next/server'
import Coingecko from '@coingecko/coingecko-typescript'
import { createClient } from 'redis'

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
    environment: 'demo',
    defaultHeaders: {
      'x-cg-pro-api-key': null,
    },
  })
  const response = await client.coins.getID(tokenId, {
    community_data: true,
    developer_data: true,
    market_data: true,
    tickers: true,
    localization: false,
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
      return NextResponse.json({ error: 'Token ID is required' }, { status: 400 })
    }

    // Get token details
    const redis = await getRedisClient()
    const cacheKey = `tokens:details:${tokenId}`

    let tokenDetails
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        tokenDetails = JSON.parse(cached)
      } else {
        tokenDetails = await getTokenDetailsFromCoinGecko(tokenId)
      }
    } catch (error) {
      tokenDetails = await getTokenDetailsFromCoinGecko(tokenId)
    } finally {
      await redis.quit()
    }

    // Get GitHub analysis if available
    let githubAnalysis = null
    try {
      const githubResponse = await fetch(
        `${request.headers.get('origin') || 'http://localhost:3000'}/api/tokens/${tokenId}/github-analysis`,
        {
          headers: {
            'User-Agent': 'Blockchain-Analyzer',
          },
        }
      )
      if (githubResponse.ok) {
        githubAnalysis = await githubResponse.json()
      }
    } catch (error) {
      console.error('Error fetching GitHub analysis:', error)
    }

    // Prepare report data (excluding token data JSON dump)
    const reportData = {
      token: {
        name: tokenDetails.name,
        symbol: tokenDetails.symbol,
        id: tokenDetails.id,
        image: tokenDetails.image?.large,
        marketCapRank: tokenDetails.market_cap_rank,
        description: tokenDetails.description?.en || tokenDetails.description?.[Object.keys(tokenDetails.description || {})[0]] || 'No description available',
        links: {
          homepage: tokenDetails.links?.homepage?.[0],
          github: tokenDetails.links?.repos_url?.github?.[0],
          blockchainSite: tokenDetails.links?.blockchain_site?.[0],
          forum: tokenDetails.links?.official_forum_url?.[0],
        },
      },
      marketData: tokenDetails.market_data ? {
        currentPrice: tokenDetails.market_data.current_price?.usd,
        marketCap: tokenDetails.market_data.market_cap?.usd,
        totalVolume: tokenDetails.market_data.total_volume?.usd,
        priceChange24h: tokenDetails.market_data.price_change_percentage_24h,
        high24h: tokenDetails.market_data.high_24h?.usd,
        low24h: tokenDetails.market_data.low_24h?.usd,
        circulatingSupply: tokenDetails.market_data.circulating_supply,
        totalSupply: tokenDetails.market_data.total_supply,
        maxSupply: tokenDetails.market_data.max_supply,
      } : null,
      githubAnalysis: githubAnalysis ? {
        repository: githubAnalysis.repository,
        contributors: githubAnalysis.contributors,
        analysis: githubAnalysis.analysis,
        analyzedAt: githubAnalysis.analyzedAt,
      } : null,
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json(reportData)
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

