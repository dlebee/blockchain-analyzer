import { NextResponse } from 'next/server'
import Coingecko from '@coingecko/coingecko-typescript'
import OpenAI from 'openai'
import { createClient } from 'redis'
import { getExchangeTypeMap, classifyExchange, DEX_KEYWORDS, knownCEX } from '../../../exchanges/utils'

const CACHE_TTL_ANALYSIS = 15 * 60 // 15 minutes in seconds (for AI analysis)
const CACHE_TTL_DATA = 60 * 60 // 1 hour in seconds (for ticker data)

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

async function getTickersFromCoinGecko(tokenId: string) {
  const client = new Coingecko({
    environment: 'demo',
    defaultHeaders: {
      'x-cg-pro-api-key': null,
    },
  })
  
  // Fetch ALL tickers by paginating through all pages
  // DEX exchanges often don't have trust scores, so we order by volume
  const allTickers: any[] = []
  let page = 1
  let hasMore = true
  
  console.log(`Fetching all tickers for ${tokenId} (paginated)...`)
  
  while (hasMore) {
    try {
      const response = await client.coins.tickers.get(tokenId, {
        include_exchange_logo: true,
        order: 'volume_desc', // Order by volume to get all exchanges including DEX
        depth: false,
        page: page,
      })
      
      if (response.tickers && response.tickers.length > 0) {
        allTickers.push(...response.tickers)
        console.log(`Fetched page ${page}: ${response.tickers.length} tickers (total: ${allTickers.length})`)
        
        // If we got fewer than expected, might be last page
        // CoinGecko typically returns 100 per page, but can vary
        if (response.tickers.length < 100) {
          hasMore = false
        } else {
          page++
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      } else {
        hasMore = false
      }
    } catch (error) {
      console.error(`Error fetching tickers page ${page}:`, error)
      hasMore = false
    }
  }
  
  console.log(`Fetched ${allTickers.length} total tickers for ${tokenId}`)
  
  // Log sample of what we got
  if (allTickers.length > 0) {
    console.log(`Sample tickers (first 20):`)
    allTickers.slice(0, 20).forEach((ticker: any, idx: number) => {
      console.log(`  ${idx + 1}. ${ticker.market?.name || 'Unknown'} (id: ${ticker.market?.identifier || 'N/A'}, trust: ${ticker.trust_score || 'none'}, volume: $${(ticker.converted_volume?.usd || 0).toLocaleString()})`)
    })
  }
  
  return {
    name: tokenId,
    tickers: allTickers,
  }
}

// Map CoinGecko platform IDs to onchain network IDs
const PLATFORM_TO_NETWORK_MAP: Record<string, string> = {
  'ethereum': 'eth',
  'binance-smart-chain': 'bsc',
  'polygon-pos': 'polygon',
  'avalanche': 'avax',
  'fantom': 'fantom',
  'arbitrum-one': 'arbitrum',
  'optimistic-ethereum': 'optimism',
  'base': 'base',
  'solana': 'solana',
  'cardano': 'cardano',
  'polkadot': 'polkadot',
  'cosmos': 'cosmos',
  'cronos': 'cronos',
  'gnosis': 'gnosis',
  'celo': 'celo',
  'moonbeam': 'moonbeam',
  'moonriver': 'moonriver',
  'metis-andromeda': 'metis',
  'boba': 'boba',
  'aurora': 'aurora',
  'evmos': 'evmos',
  'kava': 'kava',
  'zksync': 'zksync',
  'linea': 'linea',
  'scroll': 'scroll',
  'mantle': 'mantle',
  'blast': 'blast',
}

// Wrapper function that uses shared getExchangeTypeMap
async function getExchangeTypeMapForToken(
  redis: ReturnType<typeof createClient>, 
  exchangeIdentifiers: string[],
  tokenPlatformId?: string
): Promise<Map<string, boolean>> {
  // Use shared function from utils
  return await getExchangeTypeMap(exchangeIdentifiers)
}

// Function to check if an exchange is a DEX using exchange map (preferred) or name matching (fallback)
function isDEX(ticker: any, exchangeMap?: Map<string, boolean>): boolean {
  if (!ticker || !ticker.market) {
    return false
  }
  
  const exchangeName = (ticker.market.name || '').toLowerCase().trim()
  const exchangeIdentifier = (ticker.market.identifier || '').toLowerCase().trim()
  
  // First, try to use the exchange map if available (most accurate)
  if (exchangeMap && exchangeIdentifier) {
    const isCentralized = exchangeMap.get(exchangeIdentifier)
    if (isCentralized !== undefined) {
      return !isCentralized // centralized=false means DEX
    }
  }
  
  // Fallback to name matching if exchange map doesn't have this exchange
  // Use shared classification function
  const isCentralized = classifyExchange(exchangeIdentifier, exchangeName)
  return !isCentralized // Return true if DEX (not centralized)
}

async function analyzeListingsWithOpenAI(tickersData: any, tokenData: any, exchangeMap?: Map<string, boolean>) {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  const openai = new OpenAI({
    apiKey: openaiApiKey,
  })

  const tickers = tickersData.tickers || []
  
  // Log ALL exchanges first to see what we're working with
  console.log(`\n=== DEBUGGING DEX DETECTION ===`)
  console.log(`Total tickers received: ${tickers.length}`)
  console.log(`First 20 exchanges:`)
  tickers.slice(0, 20).forEach((t: any, idx: number) => {
    const name = t.market?.name || 'Unknown'
    const identifier = t.market?.identifier || 'N/A'
    const trustScore = t.trust_score || 'none'
    const isDexResult = isDEX(t, exchangeMap)
    const mapValue = exchangeMap?.get(identifier)
    const source = mapValue !== undefined ? 'map' : 'name-matching'
    console.log(`  ${idx + 1}. ${name} | id: ${identifier} | trust: ${trustScore} | DEX: ${isDexResult} (${source})`)
  })
  
  // Analyze ticker data using exchange map
  const totalTickers = tickers.length
  const dexTickers = tickers.filter((t: any) => isDEX(t, exchangeMap))
  const cexTickers = tickers.filter((t: any) => !isDEX(t, exchangeMap))
  
  // Log results
  console.log(`\n=== DETECTION RESULTS ===`)
  console.log(`Total tickers: ${totalTickers}, DEX: ${dexTickers.length}, CEX: ${cexTickers.length}`)
  if (dexTickers.length > 0) {
    console.log(`DEX exchanges found (${dexTickers.length}):`)
    dexTickers.slice(0, 20).forEach((t: any, idx: number) => {
      console.log(`  ${idx + 1}. ${t.market?.name || 'Unknown'} (id: ${t.market?.identifier || 'N/A'}, trust: ${t.trust_score || 'none'})`)
    })
  } else {
    console.log(`WARNING: No DEX exchanges detected!`)
    console.log(`All exchanges (first 30):`)
    tickers.slice(0, 30).forEach((t: any, idx: number) => {
      console.log(`  ${idx + 1}. ${t.market?.name || 'Unknown'} (id: ${t.market?.identifier || 'N/A'}, trust: ${t.trust_score || 'none'})`)
    })
  }
  console.log(`=== END DEBUGGING ===\n`)

  // Calculate volume distribution
  const totalVolume = tickers.reduce((sum: number, t: any) => sum + (t.converted_volume?.usd || 0), 0)
  const cexVolume = cexTickers.reduce((sum: number, t: any) => sum + (t.converted_volume?.usd || 0), 0)
  const dexVolume = dexTickers.reduce((sum: number, t: any) => sum + (t.converted_volume?.usd || 0), 0)
  
  // Trust score distribution
  const trustScores = {
    green: tickers.filter((t: any) => t.trust_score === 'green').length,
    yellow: tickers.filter((t: any) => t.trust_score === 'yellow').length,
    red: tickers.filter((t: any) => t.trust_score === 'red').length,
  }

  // Top exchanges by volume
  const topExchanges = tickers
    .filter((t: any) => t.converted_volume?.usd && t.converted_volume.usd > 0)
    .sort((a: any, b: any) => (b.converted_volume?.usd || 0) - (a.converted_volume?.usd || 0))
    .slice(0, 10)
    .map((t: any) => ({
      name: t.market?.name || 'Unknown',
      volume: t.converted_volume?.usd || 0,
      trustScore: t.trust_score || 'unknown',
      isStale: t.is_stale || false,
      isAnomaly: t.is_anomaly || false,
    }))

  // Major CEX exchanges
  const majorCexExchanges = ['binance', 'coinbase', 'kraken', 'bitfinex', 'bitstamp', 'gemini', 'okx', 'huobi', 'kucoin', 'bybit']
  const listedOnMajorCex = cexTickers.filter((t: any) => {
    const exchangeName = t.market?.name?.toLowerCase() || ''
    return majorCexExchanges.some(major => exchangeName.includes(major))
  })

  const prompt = `You are an expert cryptocurrency analyst specializing in exchange listings and market accessibility. Analyze the following exchange listing data for a token and provide insights on listing quality, accessibility, liquidity distribution, and market presence.

Token Information:
- Name: ${tokenData.name || 'Unknown'}
- Symbol: ${tokenData.symbol || 'Unknown'}

=== EXCHANGE LISTING DATA ===

Total Exchange Listings: ${totalTickers}
- Centralized Exchanges (CEX): ${cexTickers.length}
- Decentralized Exchanges (DEX): ${dexTickers.length}

Volume Distribution:
- Total 24h Volume: $${totalVolume.toLocaleString()}
- CEX Volume: $${cexVolume.toLocaleString()} (${totalVolume > 0 ? ((cexVolume / totalVolume) * 100).toFixed(2) : 0}%)
- DEX Volume: $${dexVolume.toLocaleString()} (${totalVolume > 0 ? ((dexVolume / totalVolume) * 100).toFixed(2) : 0}%)

Trust Score Distribution:
- Green (High Trust): ${trustScores.green}
- Yellow (Medium Trust): ${trustScores.yellow}
- Red (Low Trust): ${trustScores.red}

Major CEX Listings: ${listedOnMajorCex.length} out of ${majorCexExchanges.length} major exchanges
${listedOnMajorCex.length > 0 ? `Listed on: ${listedOnMajorCex.map((t: any) => t.market?.name).join(', ')}` : 'Not listed on any major CEX'}

Top 10 Exchanges by Volume:
${topExchanges.map((ex: any, idx: number) => 
  `${idx + 1}. ${ex.name}: $${ex.volume.toLocaleString()} (Trust: ${ex.trustScore}, Stale: ${ex.isStale ? 'Yes' : 'No'}, Anomaly: ${ex.isAnomaly ? 'Yes' : 'No'})`
).join('\n')}

=== YOUR TASK ===
Based on this exchange listing data, provide a comprehensive analysis that includes:

1. **Listing Quality Assessment**: Evaluate the overall quality of exchange listings:
   - How many exchanges is the token listed on?
   - What is the distribution between CEX and DEX?
   - Are the listings on reputable exchanges?
   - What do the trust scores indicate?

2. **Market Accessibility**: Assess how accessible this token is to traders:
   - Is it available on major centralized exchanges?
   - What is the DEX presence?
   - Are there geographic or regulatory barriers?
   - How easy is it for users to buy/sell this token?

3. **Liquidity Analysis**: Evaluate liquidity distribution:
   - Where is most of the trading volume concentrated?
   - Is liquidity fragmented or concentrated?
   - Are there concerns about liquidity depth?
   - What does the volume distribution tell us about market structure?

4. **Exchange Reputation & Trust**: Analyze exchange quality:
   - What percentage of listings have high trust scores?
   - Are there concerns about exchange reliability?
   - Are there any stale or anomalous listings?

5. **Market Presence & Adoption**: Assess market presence:
   - Does the listing profile suggest broad adoption?
   - Is this token primarily traded on DEX (suggesting DeFi focus) or CEX (suggesting broader appeal)? (Note: CEX dominance is common and indicates mainstream accessibility)
   - What does the exchange mix tell us about the token's target audience?

6. **Risk Assessment**: Identify potential risks:
   - Are there liquidity risks?
   - Are listings concentrated on risky exchanges?
   - Are there concerns about market manipulation potential?

7. **Recommendations**: Provide actionable recommendations:
   - What exchanges should the token consider listing on?
   - Are there improvements needed in listing strategy?
   - What does the current listing profile suggest about the token's maturity?

Format your response as JSON with the following structure:
{
  "listingQuality": {
    "score": 0-100,
    "totalListings": ${totalTickers},
    "cexCount": ${cexTickers.length},
    "dexCount": ${dexTickers.length},
    "majorCexListings": ${listedOnMajorCex.length},
    "assessment": "overall assessment of listing quality",
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"]
  },
  "marketAccessibility": {
    "score": 0-100,
    "accessibilityLevel": "high/medium/low",
    "geographicAccess": "assessment of geographic accessibility",
    "barriers": ["barrier1", "barrier2"],
    "assessment": "how accessible is this token to traders?"
  },
  "liquidityAnalysis": {
    "score": 0-100,
    "totalVolume": ${totalVolume},
    "cexVolumePercentage": ${totalVolume > 0 ? ((cexVolume / totalVolume) * 100).toFixed(2) : 0},
    "dexVolumePercentage": ${totalVolume > 0 ? ((dexVolume / totalVolume) * 100).toFixed(2) : 0},
    "liquidityConcentration": "concentrated/fragmented/balanced",
    "concerns": ["concern1", "concern2"],
    "assessment": "analysis of liquidity distribution"
  },
  "exchangeReputation": {
    "score": 0-100,
    "highTrustPercentage": ${totalTickers > 0 ? ((trustScores.green / totalTickers) * 100).toFixed(2) : 0},
    "trustScoreDistribution": {
      "green": ${trustScores.green},
      "yellow": ${trustScores.yellow},
      "red": ${trustScores.red}
    },
    "reliabilityConcerns": ["concern1", "concern2"],
    "assessment": "assessment of exchange quality and trust"
  },
  "marketPresence": {
    "score": 0-100,
    "marketMaturity": "mature/growing/early",
    "targetAudience": "retail/institutional/defi/mixed",
    "adoptionIndicators": ["indicator1", "indicator2"],
    "assessment": "what does listing profile suggest about adoption?"
  },
  "riskAssessment": {
    "overallRisk": "low/medium/high",
    "liquidityRisks": ["risk1", "risk2"],
    "exchangeRisks": ["risk1", "risk2"],
    "manipulationRisks": ["risk1", "risk2"],
    "combinedRiskAssessment": "overall risk assessment"
  },
  "recommendations": {
    "priorityExchanges": ["exchange1", "exchange2"],
    "improvements": ["improvement1", "improvement2"],
    "strategicAdvice": "strategic recommendations for listing strategy"
  },
  "overallAssessment": "comprehensive summary of listing analysis"
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert cryptocurrency analyst specializing in exchange listings, market accessibility, and liquidity analysis. You excel at evaluating how exchange listings impact token accessibility, liquidity, and market presence. Provide detailed, nuanced assessments that consider both technical metrics and practical implications for traders.\n\nIMPORTANT CONTEXT:\n- Do NOT mention or discuss low DEX representation percentages. This is not relevant information.\n- Focus on overall listing quality, exchange reputation, and liquidity distribution.\n- High CEX representation is typically a positive indicator of market maturity and accessibility.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const analysisText = completion.choices[0]?.message?.content || '{}'
    return JSON.parse(analysisText)
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw error
  }
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

    const redis = await getRedisClient()
    const cacheKey = `tokens:listing-analysis:${tokenId}`
    const tickersCacheKey = `${cacheKey}:tickers`
    const analysisCacheKey = `${cacheKey}:analysis`

    // Try to get analysis from cache
    try {
      const cachedAnalysis = await redis.get(analysisCacheKey)
      if (cachedAnalysis) {
        console.log('Cache hit: listing analysis')
        await redis.quit()
        return NextResponse.json(JSON.parse(cachedAnalysis))
      }
    } catch (error) {
      console.error('Redis get error:', error)
    }

    // Fetch tickers data
    console.log('Fetching tickers data for listing analysis:', tokenId)
    
    let tickersData: any
    try {
      // Try to get tickers from cache first
      const cachedTickers = await redis.get(tickersCacheKey)
      if (cachedTickers) {
        console.log('Cache hit: tickers data')
        tickersData = JSON.parse(cachedTickers)
      } else {
        tickersData = await getTickersFromCoinGecko(tokenId)
        // Cache tickers data
        try {
          await redis.setEx(tickersCacheKey, CACHE_TTL_DATA, JSON.stringify(tickersData))
          console.log(`Cached tickers data (TTL: ${CACHE_TTL_DATA}s / 1 hour)`)
        } catch (error) {
          console.error('Redis set error for tickers:', error)
        }
      }
    } catch (error) {
      console.error('Error fetching tickers:', error)
      await redis.quit()
      return NextResponse.json(
        {
          error: 'Failed to fetch exchange listings',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }

    if (!tickersData.tickers || tickersData.tickers.length === 0) {
      await redis.quit()
      return NextResponse.json(
        { error: 'No exchange listings found for this token' },
        { status: 404 }
      )
    }

    // Extract unique exchange identifiers from tickers
    const exchangeIdentifiers = Array.from(
      new Set(
        tickersData.tickers
          .map((t: any) => t.market?.identifier)
          .filter((id: any) => id && typeof id === 'string')
      )
    ) as string[]

    console.log(`Found ${exchangeIdentifiers.length} unique exchanges`)

    // Get token basic info and platform ID for context
    const coingeckoClient = new Coingecko({
      environment: 'demo',
      defaultHeaders: {
        'x-cg-pro-api-key': null,
      },
    })
    
    let tokenData: any = { name: tokenId, symbol: tokenId }
    let tokenPlatformId: string | undefined
    try {
      const tokenDetails = await coingeckoClient.coins.getID(tokenId, {
        community_data: false,
        developer_data: false,
        market_data: false,
        tickers: false,
        localization: false,
        sparkline: false,
      })
      tokenData = {
        name: tokenDetails.name,
        symbol: tokenDetails.symbol,
      }
      // Get platform ID - prefer asset_platform_id, fallback to first platform key
      tokenPlatformId = tokenDetails.asset_platform_id || 
                       (tokenDetails.platforms && Object.keys(tokenDetails.platforms)[0]) ||
                       undefined
      if (tokenPlatformId) {
        console.log(`Token ${tokenId} is on platform: ${tokenPlatformId}`)
      }
    } catch (error) {
      console.log('Could not fetch token details, using defaults')
    }

    // Build exchange type map (CEX vs DEX) using shared utilities
    const exchangeMap = await getExchangeTypeMapForToken(redis, exchangeIdentifiers, tokenPlatformId)
    console.log(`Exchange map built: ${exchangeMap.size} exchanges (${Array.from(exchangeMap.values()).filter(v => !v).length} DEX, ${Array.from(exchangeMap.values()).filter(v => v).length} CEX)`)

    // Run AI analysis with exchange map
    console.log('Running listing analysis with OpenAI')
    const analysis = await analyzeListingsWithOpenAI(tickersData, tokenData, exchangeMap)

    // Calculate DEX/CEX counts for response (using exchange map)
    const tickers = tickersData.tickers || []
    const dexTickers = tickers.filter((t: any) => isDEX(t, exchangeMap))
    const cexTickers = tickers.filter((t: any) => !isDEX(t, exchangeMap))
    
    // Calculate volumes
    const totalVolume = tickers.reduce((sum: number, t: any) => sum + (t.converted_volume?.usd || 0), 0) || 0
    const cexVolume = cexTickers.reduce((sum: number, t: any) => sum + (t.converted_volume?.usd || 0), 0) || 0
    const dexVolume = dexTickers.reduce((sum: number, t: any) => sum + (t.converted_volume?.usd || 0), 0) || 0
    
    // Calculate concentration metrics
    const cexVolumePercentage = totalVolume > 0 ? (cexVolume / totalVolume) * 100 : 0
    const dexVolumePercentage = totalVolume > 0 ? (dexVolume / totalVolume) * 100 : 0
    const cexListingPercentage = tickers.length > 0 ? (cexTickers.length / tickers.length) * 100 : 0
    const dexListingPercentage = tickers.length > 0 ? (dexTickers.length / tickers.length) * 100 : 0
    
    // Determine concentration type
    // Consider concentrated if >70% of volume OR >70% of listings
    let concentrationType: 'dex' | 'cex' | 'balanced' = 'balanced'
    let concentrationScore = 0
    
    if (dexVolumePercentage >= 70 || dexListingPercentage >= 70) {
      concentrationType = 'dex'
      concentrationScore = Math.max(dexVolumePercentage, dexListingPercentage)
    } else if (cexVolumePercentage >= 70 || cexListingPercentage >= 70) {
      concentrationType = 'cex'
      concentrationScore = Math.max(cexVolumePercentage, cexListingPercentage)
    } else {
      // Balanced - neither exceeds 70%
      concentrationType = 'balanced'
      const maxConcentration = Math.max(cexVolumePercentage, dexVolumePercentage, cexListingPercentage, dexListingPercentage)
      concentrationScore = maxConcentration
    }
    
    // Log for debugging
    console.log(`Response - Total tickers: ${tickers.length}, DEX: ${dexTickers.length}, CEX: ${cexTickers.length}`)
    console.log(`Concentration: ${concentrationType.toUpperCase()} (${concentrationScore.toFixed(1)}%) - Volume: CEX ${cexVolumePercentage.toFixed(1)}% / DEX ${dexVolumePercentage.toFixed(1)}%, Listings: CEX ${cexListingPercentage.toFixed(1)}% / DEX ${dexListingPercentage.toFixed(1)}%`)
    if (dexTickers.length > 0) {
      console.log(`DEX exchanges in response: ${dexTickers.slice(0, 10).map((t: any) => `${t.market?.name} (${t.market?.identifier})`).join(', ')}`)
    }

    // Prepare response
    const response = {
      token: {
        id: tokenId,
        name: tokenData.name,
        symbol: tokenData.symbol,
      },
      listingData: {
        totalListings: tickers.length,
        cexCount: cexTickers.length,
        dexCount: dexTickers.length,
        totalVolume,
        cexVolume,
        dexVolume,
        cexVolumePercentage: parseFloat(cexVolumePercentage.toFixed(2)),
        dexVolumePercentage: parseFloat(dexVolumePercentage.toFixed(2)),
        cexListingPercentage: parseFloat(cexListingPercentage.toFixed(2)),
        dexListingPercentage: parseFloat(dexListingPercentage.toFixed(2)),
        concentration: {
          type: concentrationType,
          score: parseFloat(concentrationScore.toFixed(2)),
          description: concentrationType === 'dex' 
            ? `DEX concentrated: ${dexVolumePercentage.toFixed(1)}% of volume and ${dexListingPercentage.toFixed(1)}% of listings are on DEX exchanges`
            : concentrationType === 'cex'
            ? `CEX concentrated: ${cexVolumePercentage.toFixed(1)}% of volume and ${cexListingPercentage.toFixed(1)}% of listings are on CEX exchanges. This is normal and indicates strong market accessibility.`
            : `Balanced distribution: Mix of CEX (${cexVolumePercentage.toFixed(1)}% volume, ${cexListingPercentage.toFixed(1)}% listings) and DEX (${dexVolumePercentage.toFixed(1)}% volume, ${dexListingPercentage.toFixed(1)}% listings)`
        },
      },
      analysis,
      analyzedAt: new Date().toISOString(),
    }

    // Cache analysis
    try {
      await redis.setEx(analysisCacheKey, CACHE_TTL_ANALYSIS, JSON.stringify(response))
      console.log(`Cached listing analysis (TTL: ${CACHE_TTL_ANALYSIS}s / 15 minutes)`)
    } catch (error) {
      console.error('Redis set error:', error)
    } finally {
      await redis.quit()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching listing analysis:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch listing analysis',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

