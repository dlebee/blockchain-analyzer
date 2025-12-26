import { NextResponse } from 'next/server'
import Coingecko from '@coingecko/coingecko-typescript'
import { createClient } from 'redis'

const CACHE_TTL = 24 * 60 * 60 // 24 hours in seconds

// Common L2/platform GitHub repositories mapping
// This is a fallback for platforms where native token is ETH
const PLATFORM_GITHUB_MAP: { [key: string]: string } = {
  'optimistic-ethereum': 'https://github.com/ethereum-optimism',
  'arbitrum-one': 'https://github.com/OffchainLabs',
  'polygon-pos': 'https://github.com/0xPolygon',
  'polygon-zkevm': 'https://github.com/0xPolygonHermez',
  'base': 'https://github.com/base-org',
  'zksync': 'https://github.com/matter-labs',
  'scroll': 'https://github.com/scroll-tech',
  'starknet': 'https://github.com/starkware-libs',
  'avalanche': 'https://github.com/ava-labs',
  'fantom': 'https://github.com/Fantom-Foundation',
  'celo': 'https://github.com/celo-org',
  'gnosis': 'https://github.com/gnosischain',
  'boba': 'https://github.com/bobanetwork',
  'metis-andromeda': 'https://github.com/MetisProtocol',
  'mantle': 'https://github.com/mantlenetworkio',
  'linea': 'https://github.com/Consensys',
  'blast': 'https://github.com/blast-l2',
}

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
    const cacheKey = `chains:github:${chainId}`

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

    const coingeckoClient = new Coingecko({
      environment: 'demo',
      defaultHeaders: {
        'x-cg-pro-api-key': null,
      },
    })

    let githubUrls: string[] = []
    let source = 'unknown'

    // Strategy 1: Try to get GitHub from native token (if it's not ETH)
    if (platform.native_coin_id) {
      try {
        const nativeToken = await coingeckoClient.coins.getID(platform.native_coin_id, {
          community_data: false,
          developer_data: false,
          market_data: false,
          tickers: false,
          localization: false,
          sparkline: false,
        })

        if (nativeToken.links?.repos_url?.github) {
          githubUrls = nativeToken.links.repos_url.github
          source = 'native_token'
        }
      } catch (error) {
        console.error('Error fetching native token:', error)
      }
    }

    // Strategy 2: If native token is ETH or no GitHub found, check our mapping
    if (githubUrls.length === 0 && PLATFORM_GITHUB_MAP[chainId]) {
      githubUrls = [PLATFORM_GITHUB_MAP[chainId]]
      source = 'platform_mapping'
    }

    // Strategy 3: Try to infer from platform name (common patterns)
    if (githubUrls.length === 0) {
      const platformName = platform.name?.toLowerCase() || ''
      const platformId = chainId.toLowerCase()
      
      // Try common GitHub organization patterns
      const possibleOrgs = [
        platformId.replace(/-/g, ''),
        platformId.replace(/-/g, '-'),
        platformName.replace(/\s+/g, '-').toLowerCase(),
      ]

      // Note: We can't actually verify these exist without GitHub API calls
      // So we'll just return what we found from the native token or mapping
    }

    const result = {
      platform: {
        id: platform.id,
        name: platform.name,
        shortname: platform.shortname,
        native_coin_id: platform.native_coin_id,
      },
      github: {
        urls: githubUrls,
        source,
        note: githubUrls.length === 0 
          ? 'No GitHub repository found. You may need to manually search for the platform repository.'
          : source === 'native_token' && platform.native_coin_id === 'ethereum'
          ? 'This is the native token (ETH) GitHub. For L2 platforms, consider checking the platform mapping or searching manually.'
          : undefined,
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
    console.error('Error fetching platform GitHub:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch platform GitHub',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

