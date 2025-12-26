import { NextResponse } from 'next/server'
import Coingecko from '@coingecko/coingecko-typescript'
import OpenAI from 'openai'
import { createClient } from 'redis'

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
  
  // Fetch tickers with exchange logos and sorted by trust score
  const response = await client.coins.tickers.get(tokenId, {
    include_exchange_logo: true,
    order: 'trust_score_desc',
    depth: false,
  })
  
  return response
}

async function analyzeListingsWithOpenAI(tickersData: any, tokenData: any) {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  const openai = new OpenAI({
    apiKey: openaiApiKey,
  })

  const tickers = tickersData.tickers || []
  
  // Analyze ticker data
  const totalTickers = tickers.length
  const cexTickers = tickers.filter((t: any) => {
    const exchangeName = t.market?.name?.toLowerCase() || ''
    // Common DEX indicators
    const dexIndicators = ['uniswap', 'pancakeswap', 'sushiswap', 'curve', 'balancer', '1inch', 'dodo', 'kyberswap', 'raydium', 'orca', 'serum']
    return !dexIndicators.some(indicator => exchangeName.includes(indicator))
  })
  const dexTickers = tickers.filter((t: any) => {
    const exchangeName = t.market?.name?.toLowerCase() || ''
    const dexIndicators = ['uniswap', 'pancakeswap', 'sushiswap', 'curve', 'balancer', '1inch', 'dodo', 'kyberswap', 'raydium', 'orca', 'serum']
    return dexIndicators.some(indicator => exchangeName.includes(indicator))
  })

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
   - Is this token primarily traded on DEX (suggesting DeFi focus) or CEX (suggesting broader appeal)?
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
            'You are an expert cryptocurrency analyst specializing in exchange listings, market accessibility, and liquidity analysis. You excel at evaluating how exchange listings impact token accessibility, liquidity, and market presence. Provide detailed, nuanced assessments that consider both technical metrics and practical implications for traders.',
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

    // Get token basic info for context
    const coingeckoClient = new Coingecko({
      environment: 'demo',
      defaultHeaders: {
        'x-cg-pro-api-key': null,
      },
    })
    
    let tokenData: any = { name: tokenId, symbol: tokenId }
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
    } catch (error) {
      console.log('Could not fetch token details, using defaults')
    }

    // Run AI analysis
    console.log('Running listing analysis with OpenAI')
    const analysis = await analyzeListingsWithOpenAI(tickersData, tokenData)

    // Prepare response
    const response = {
      token: {
        id: tokenId,
        name: tokenData.name,
        symbol: tokenData.symbol,
      },
      listingData: {
        totalListings: tickersData.tickers?.length || 0,
        cexCount: tickersData.tickers?.filter((t: any) => {
          const exchangeName = t.market?.name?.toLowerCase() || ''
          const dexIndicators = ['uniswap', 'pancakeswap', 'sushiswap', 'curve', 'balancer', '1inch', 'dodo', 'kyberswap', 'raydium', 'orca', 'serum']
          return !dexIndicators.some(indicator => exchangeName.includes(indicator))
        }).length || 0,
        dexCount: tickersData.tickers?.filter((t: any) => {
          const exchangeName = t.market?.name?.toLowerCase() || ''
          const dexIndicators = ['uniswap', 'pancakeswap', 'sushiswap', 'curve', 'balancer', '1inch', 'dodo', 'kyberswap', 'raydium', 'orca', 'serum']
          return dexIndicators.some(indicator => exchangeName.includes(indicator))
        }).length || 0,
        totalVolume: tickersData.tickers?.reduce((sum: number, t: any) => sum + (t.converted_volume?.usd || 0), 0) || 0,
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

