import { NextResponse } from 'next/server'
import Coingecko from '@coingecko/coingecko-typescript'
import OpenAI from 'openai'
import { createClient } from 'redis'

const CACHE_TTL_ANALYSIS = 15 * 60 // 15 minutes in seconds (for AI analysis)

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
    community_data: false,
    developer_data: false,
    market_data: true,
    tickers: false,
    localization: false,
    sparkline: false,
  })
  return response
}

async function getMarketChartData(tokenId: string, days: number = 365) {
  const client = new Coingecko({
    environment: 'demo',
    defaultHeaders: {
      'x-cg-pro-api-key': null,
    },
  })
  const response = await client.coins.marketChart.get(tokenId, {
    vs_currency: 'usd',
    days: days.toString(),
    interval: days <= 1 ? 'hourly' : 'daily',
  })
  return response
}

async function analyzeTokenomicsWithOpenAI(tokenData: any, marketChartData: any) {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  const openai = new OpenAI({
    apiKey: openaiApiKey,
  })

  const marketData = tokenData.market_data || {}
  const prices = marketChartData.prices || []
  
  // Calculate price changes
  const currentPrice = marketData.current_price?.usd || 0
  const price24h = marketData.price_change_percentage_24h || 0
  const price7d = marketData.price_change_percentage_7d || 0
  const price30d = marketData.price_change_percentage_30d || 0
  const price1y = marketData.price_change_percentage_1y || 0
  
  // Calculate price volatility from chart data
  let priceVolatility = 'low'
  if (prices.length > 1) {
    const priceValues = prices.map((p: number[]) => p[1])
    const avgPrice = priceValues.reduce((a: number, b: number) => a + b, 0) / priceValues.length
    const variance = priceValues.reduce((sum: number, price: number) => sum + Math.pow(price - avgPrice, 2), 0) / priceValues.length
    const stdDev = Math.sqrt(variance)
    const coefficientOfVariation = (stdDev / avgPrice) * 100
    if (coefficientOfVariation > 50) priceVolatility = 'very high'
    else if (coefficientOfVariation > 30) priceVolatility = 'high'
    else if (coefficientOfVariation > 15) priceVolatility = 'medium'
  }

  const supplyData = {
    circulating: marketData.circulating_supply || null,
    total: marketData.total_supply || null,
    max: marketData.max_supply || null,
  }

  const volumeData = {
    volume24h: marketData.total_volume?.usd || 0,
    volume24hChange: 0, // CoinGecko doesn't provide volume change percentage
    marketCap: marketData.market_cap?.usd || 0,
    marketCapChange24h: marketData.market_cap_change_percentage_24h || 0,
    fullyDilutedValuation: marketData.fully_diluted_valuation?.usd || null,
  }

  // Calculate supply metrics
  const circulatingPercentage = supplyData.max 
    ? ((supplyData.circulating || 0) / supplyData.max) * 100 
    : null
  const totalPercentage = supplyData.max 
    ? ((supplyData.total || 0) / supplyData.max) * 100 
    : null

  // Get exchange supply data if available
  const exchangeSupplyData = {
    // CoinGecko doesn't directly provide this, but we can infer from market data
    liquidity: marketData.total_value_locked?.usd || null,
  }

  const prompt = `You are an expert cryptocurrency and tokenomics analyst. Analyze the following token data and provide insights on price behavior, tokenomics, and market dynamics.

Token Information:
- Name: ${tokenData.name || 'Unknown'}
- Symbol: ${tokenData.symbol || 'Unknown'}
- Current Price (USD): $${currentPrice.toLocaleString()}

Price Performance:
- 24h Change: ${price24h.toFixed(2)}%
- 7d Change: ${price7d.toFixed(2)}%
- 30d Change: ${price30d.toFixed(2)}%
- 1y Change: ${price1y.toFixed(2)}%
- Volatility: ${priceVolatility}

Supply Metrics:
- Circulating Supply: ${supplyData.circulating ? supplyData.circulating.toLocaleString() : 'Unknown'}
- Total Supply: ${supplyData.total ? supplyData.total.toLocaleString() : 'Unknown'}
- Max Supply: ${supplyData.max ? supplyData.max.toLocaleString() : 'Unlimited/Unknown'}
- Circulating % of Max: ${circulatingPercentage !== null ? circulatingPercentage.toFixed(2) + '%' : 'N/A'}
- Total % of Max: ${totalPercentage !== null ? totalPercentage.toFixed(2) + '%' : 'N/A'}

Volume & Market Data:
- 24h Volume (USD): $${volumeData.volume24h.toLocaleString()}
- 24h Volume Change: ${volumeData.volume24hChange.toFixed(2)}%
- Market Cap (USD): $${volumeData.marketCap.toLocaleString()}
- Market Cap 24h Change: ${volumeData.marketCapChange24h.toFixed(2)}%
- Fully Diluted Valuation: ${volumeData.fullyDilutedValuation ? '$' + volumeData.fullyDilutedValuation.toLocaleString() : 'N/A'}

Price History:
- Historical data points available: ${prices.length}
- Price range: $${prices.length > 0 ? Math.min(...prices.map((p: number[]) => p[1])).toFixed(2) : 'N/A'} - $${prices.length > 0 ? Math.max(...prices.map((p: number[]) => p[1])).toFixed(2) : 'N/A'}

Please analyze and provide:
1. **Price Analysis**: Evaluate price trends, volatility, and market sentiment based on the price changes
2. **Tokenomics Assessment**: Analyze the supply structure:
   - Is there a max supply cap? What are the implications?
   - How much of the supply is circulating vs locked/unreleased?
   - What is the inflation/deflation rate (if determinable)?
   - Are there any red flags in the tokenomics?
3. **Market Dynamics**: Evaluate trading volume, liquidity, and market cap trends
4. **Supply Distribution**: Assess if supply is concentrated or well-distributed (based on available data)
5. **Risk Assessment**: Identify potential risks related to tokenomics, price volatility, or supply structure
6. **Overall Assessment**: Summary of tokenomics health and market position

Format your response as JSON with the following structure:
{
  "priceAnalysis": {
    "score": 0-100,
    "trend": "bullish/bearish/neutral",
    "volatility": "very high/high/medium/low",
    "analysis": "detailed analysis of price behavior and trends",
    "strengths": ["strength1", "strength2"],
    "concerns": ["concern1", "concern2"]
  },
  "tokenomics": {
    "score": 0-100,
    "hasMaxSupply": true/false,
    "maxSupply": null or number,
    "circulatingPercentage": null or number,
    "inflationRate": null or "estimated rate",
    "analysis": "detailed analysis of tokenomics structure",
    "strengths": ["strength1", "strength2"],
    "concerns": ["concern1", "concern2"],
    "redFlags": ["flag1", "flag2"] or []
  },
  "marketDynamics": {
    "score": 0-100,
    "volumeAnalysis": "analysis of trading volume",
    "liquidity": "high/medium/low",
    "marketCapHealth": "healthy/moderate/weak",
    "analysis": "detailed analysis of market dynamics"
  },
  "riskAssessment": {
    "overallRisk": "low/medium/high",
    "risks": ["risk1", "risk2"],
    "recommendations": ["recommendation1", "recommendation2"]
  },
  "overallAssessment": "comprehensive summary of tokenomics health and market position"
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert cryptocurrency analyst specializing in tokenomics, market dynamics, and price analysis. Provide detailed, accurate assessments based on the data provided. Be critical and identify potential red flags.',
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
    const cacheKey = `tokens:tokenomics-analysis:${tokenId}`
    const analysisCacheKey = `${cacheKey}:analysis`

    // Try to get analysis from cache
    try {
      const cachedAnalysis = await redis.get(analysisCacheKey)
      if (cachedAnalysis) {
        console.log('Cache hit: tokenomics analysis')
        await redis.quit()
        return NextResponse.json(JSON.parse(cachedAnalysis))
      }
    } catch (error) {
      console.error('Redis get error:', error)
    }

    // Fetch token data and market chart
    console.log('Fetching token data for tokenomics analysis:', tokenId)
    const [tokenData, marketChartData] = await Promise.all([
      getTokenDetailsFromCoinGecko(tokenId),
      getMarketChartData(tokenId, 365), // 1 year of data
    ])

    // Run AI analysis
    console.log('Running tokenomics analysis with OpenAI')
    const analysis = await analyzeTokenomicsWithOpenAI(tokenData, marketChartData)

    // Prepare response with raw data and analysis
    const response = {
      token: {
        id: tokenData.id,
        name: tokenData.name,
        symbol: tokenData.symbol,
      },
      marketData: {
        currentPrice: tokenData.market_data?.current_price?.usd || 0,
        priceChanges: {
          '24h': tokenData.market_data?.price_change_percentage_24h || 0,
          '7d': tokenData.market_data?.price_change_percentage_7d || 0,
          '30d': tokenData.market_data?.price_change_percentage_30d || 0,
          '1y': tokenData.market_data?.price_change_percentage_1y || 0,
        },
        supply: {
          circulating: tokenData.market_data?.circulating_supply || null,
          total: tokenData.market_data?.total_supply || null,
          max: tokenData.market_data?.max_supply || null,
        },
        volume: {
          '24h': tokenData.market_data?.total_volume?.usd || 0,
          '24hChange': 0, // CoinGecko doesn't provide volume change percentage
        },
        marketCap: tokenData.market_data?.market_cap?.usd || 0,
        marketCapChange24h: tokenData.market_data?.market_cap_change_percentage_24h || 0,
        fullyDilutedValuation: tokenData.market_data?.fully_diluted_valuation?.usd || null,
      },
      analysis,
      analyzedAt: new Date().toISOString(),
    }

    // Cache analysis
    try {
      await redis.setEx(analysisCacheKey, CACHE_TTL_ANALYSIS, JSON.stringify(response))
      console.log(`Cached tokenomics analysis (TTL: ${CACHE_TTL_ANALYSIS}s / 15 minutes)`)
    } catch (error) {
      console.error('Redis set error:', error)
    } finally {
      await redis.quit()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching tokenomics analysis:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch tokenomics analysis',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

