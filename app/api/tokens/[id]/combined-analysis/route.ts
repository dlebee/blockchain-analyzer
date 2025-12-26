import { NextResponse } from 'next/server'
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

async function analyzeCombinedWithOpenAI(
  githubAnalysis: any | null,
  tokenomicsAnalysis: any,
  tokenData: any
) {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  const openai = new OpenAI({
    apiKey: openaiApiKey,
  })

  const hasGitHubAnalysis = githubAnalysis && githubAnalysis.analysis

  const prompt = `You are an expert cryptocurrency analyst, blockchain protocol evaluator, and market sentiment specialist. Analyze the following comprehensive data about a blockchain protocol/token and provide insights on code quality, tokenomics, market dynamics, and most importantly - AUDIENCE SENTIMENT and COMMUNITY FEELING.

Token Information:
- Name: ${tokenData.token?.name || 'Unknown'}
- Symbol: ${tokenData.token?.symbol || 'Unknown'}

${hasGitHubAnalysis ? `=== GITHUB CODE ANALYSIS ===
This represents the SUBSTANCE of the protocol - the actual codebase quality and development health.

Code Quality Score: ${githubAnalysis.analysis?.codeQuality?.score || 'N/A'}/100
${githubAnalysis.analysis?.codeQuality?.analysis || 'No code quality analysis available'}

Blockchain Framework: ${githubAnalysis.analysis?.blockchainInfo?.framework || 'Unknown'}
EVM Compatible: ${githubAnalysis.analysis?.blockchainInfo?.isEVMCompatible ? 'Yes' : 'No'}
Layer 2: ${githubAnalysis.analysis?.blockchainInfo?.isL2 ? 'Yes' : 'No'}

Project Health Score: ${githubAnalysis.analysis?.projectHealth?.score || 'N/A'}/100
Activity: ${githubAnalysis.analysis?.projectHealth?.indicators?.activity || 'Unknown'}
Maintenance: ${githubAnalysis.analysis?.projectHealth?.indicators?.maintenance || 'Unknown'}
Community: ${githubAnalysis.analysis?.projectHealth?.indicators?.community || 'Unknown'}

Top Contributors: ${githubAnalysis.contributors?.topContributors?.length || 0}
Repository Stars: ${githubAnalysis.repository?.info?.stars || 0}
Repository Forks: ${githubAnalysis.repository?.info?.forks || 0}

Code Strengths:
${githubAnalysis.analysis?.codeQuality?.strengths?.map((s: string) => `- ${s}`).join('\n') || 'None listed'}

Code Concerns:
${githubAnalysis.analysis?.codeQuality?.concerns?.map((c: string) => `- ${c}`).join('\n') || 'None listed'}` : `=== GITHUB CODE ANALYSIS ===
GitHub analysis is not available for this token. This may be because:
- No GitHub repository is linked to this token
- The repository is private or inaccessible
- GitHub analysis has not been completed yet

You should proceed with the analysis based on tokenomics and market data only, noting that code quality assessment cannot be performed without GitHub data.`}

=== TOKENOMICS & MARKET ANALYSIS ===
This represents the ECONOMIC MODEL and MARKET PERFORMANCE.

Price Analysis Score: ${tokenomicsAnalysis.analysis?.priceAnalysis?.score || 'N/A'}/100
Price Trend: ${tokenomicsAnalysis.analysis?.priceAnalysis?.trend || 'Unknown'}
Volatility: ${tokenomicsAnalysis.analysis?.priceAnalysis?.volatility || 'Unknown'}
Current Price: $${tokenomicsAnalysis.marketData?.currentPrice?.toLocaleString() || 'Unknown'}
24h Change: ${tokenomicsAnalysis.marketData?.priceChanges?.['24h']?.toFixed(2) || '0'}%
7d Change: ${tokenomicsAnalysis.marketData?.priceChanges?.['7d']?.toFixed(2) || '0'}%
30d Change: ${tokenomicsAnalysis.marketData?.priceChanges?.['30d']?.toFixed(2) || '0'}%

Tokenomics Score: ${tokenomicsAnalysis.analysis?.tokenomics?.score || 'N/A'}/100
Has Max Supply: ${tokenomicsAnalysis.analysis?.tokenomics?.hasMaxSupply ? 'Yes' : 'No'}
Circulating Supply: ${tokenomicsAnalysis.marketData?.supply?.circulating?.toLocaleString() || 'Unknown'}
Max Supply: ${tokenomicsAnalysis.marketData?.supply?.max?.toLocaleString() || 'Unlimited'}
Circulating %: ${tokenomicsAnalysis.analysis?.tokenomics?.circulatingPercentage?.toFixed(2) || 'N/A'}%

Market Cap: $${(tokenomicsAnalysis.marketData?.marketCap / 1e9).toFixed(2) || '0'}B
24h Volume: $${(tokenomicsAnalysis.marketData?.volume?.['24h'] / 1e6).toFixed(2) || '0'}M

Tokenomics Strengths:
${tokenomicsAnalysis.analysis?.tokenomics?.strengths?.map((s: string) => `- ${s}`).join('\n') || 'None listed'}

Tokenomics Concerns:
${tokenomicsAnalysis.analysis?.tokenomics?.concerns?.map((c: string) => `- ${c}`).join('\n') || 'None listed'}

Tokenomics Red Flags:
${tokenomicsAnalysis.analysis?.tokenomics?.redFlags?.map((f: string) => `- ${f}`).join('\n') || 'None listed'}

Risk Level: ${tokenomicsAnalysis.analysis?.riskAssessment?.overallRisk || 'Unknown'}

=== YOUR TASK ===
Based on this comprehensive data, provide a COMBINED ANALYSIS that:

1. **Protocol Substance Assessment**: ${hasGitHubAnalysis ? 'Evaluate the actual technical quality and development health of the protocol based on code analysis. Is this a serious, well-built protocol or does it have fundamental issues?' : 'NOTE: GitHub analysis is not available. You cannot assess code quality or development health. Focus on what can be determined from tokenomics and market data. Note this limitation in your assessment.'}

2. **Economic Model Evaluation**: Assess how the tokenomics align with the protocol's goals. Are the economics sustainable? ${hasGitHubAnalysis ? 'How do they align with the protocol\'s technical foundation?' : 'Without code analysis, focus on the economic model itself.'}

3. **Market Performance Context**: Analyze how market performance relates to tokenomics${hasGitHubAnalysis ? ' and code quality' : ''}. Is the price action justified by fundamentals?

4. **AUDIENCE SENTIMENT & COMMUNITY FEELING** (CRITICAL): Based on all the data provided, analyze:
   - What is the general sentiment of the community/audience about this token?
   - Are developers and users excited, skeptical, or indifferent?
   ${hasGitHubAnalysis ? `- What does the GitHub activity (stars, forks, contributors) tell you about community engagement?` : `- NOTE: GitHub activity data is not available, so you cannot assess developer community engagement from code repositories.`}
   - How does price performance reflect community confidence or lack thereof?
   - What are the key factors driving positive or negative sentiment?
   ${hasGitHubAnalysis ? '- Is there a disconnect between technical quality and market sentiment (e.g., great code but poor price, or vice versa)?' : ''}
   - What does the combination of${hasGitHubAnalysis ? ' code quality, ' : ''} tokenomics, and market data suggest about how the AUDIENCE FEELS about this project?

5. **Holistic Risk Assessment**: Combine risks from${hasGitHubAnalysis ? ' both code and ' : ''} tokenomics perspectives. ${hasGitHubAnalysis ? '' : 'Note that technical risks cannot be assessed without GitHub analysis.'}

6. **Investment/Adoption Readiness**: Based on everything, is this protocol ready for serious adoption? What would need to change? ${hasGitHubAnalysis ? '' : 'Note that without code analysis, you cannot fully assess technical readiness.'}

Format your response as JSON with the following structure:
{
  "protocolSubstance": {
    "score": 0-100,
    "technicalQuality": "assessment of code quality and development health",
    "developmentHealth": "active/stale/archived",
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "assessment": "overall assessment of protocol substance"
  },
  "economicModel": {
    "score": 0-100,
    "alignment": "how well tokenomics align with protocol goals",
    "sustainability": "assessment of economic sustainability",
    "strengths": ["strength1", "strength2"],
    "concerns": ["concern1", "concern2"],
    "assessment": "overall assessment of economic model"
  },
  "marketContext": {
    "score": 0-100,
    "priceJustification": "is price action justified by fundamentals?",
    "marketEfficiency": "how efficiently does market reflect protocol quality",
    "assessment": "assessment of market performance in context"
  },
  "audienceSentiment": {
    "overallSentiment": "bullish/bearish/neutral/mixed",
    "sentimentScore": 0-100,
    "communityEngagement": "high/medium/low",
    "developerSentiment": "positive/neutral/negative",
    "userSentiment": "positive/neutral/negative",
    "keyDrivers": ["driver1", "driver2"],
    "sentimentAnalysis": "detailed analysis of how the audience feels about this token/protocol",
    "confidenceLevel": "high/medium/low",
    "disconnects": ["any disconnects between technical quality and sentiment"],
    "communityHealth": "healthy/moderate/weak"
  },
  "holisticRisk": {
    "overallRisk": "low/medium/high",
    "technicalRisks": ["risk1", "risk2"],
    "economicRisks": ["risk1", "risk2"],
    "sentimentRisks": ["risk1", "risk2"],
    "combinedRiskAssessment": "assessment combining all risk factors"
  },
  "adoptionReadiness": {
    "ready": true/false,
    "readinessScore": 0-100,
    "barriers": ["barrier1", "barrier2"],
    "recommendations": ["recommendation1", "recommendation2"],
    "assessment": "is this ready for serious adoption?"
  },
  "overallAssessment": "comprehensive summary combining protocol substance, economics, market, and audience sentiment"
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert cryptocurrency analyst, blockchain protocol evaluator, and market sentiment specialist. You excel at analyzing the relationship between technical quality, economic models, market performance, and most importantly - understanding how audiences and communities FEEL about tokens and protocols. Provide detailed, nuanced assessments that consider both technical fundamentals and human sentiment.',
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

    // Check if repo parameter is provided (for GitHub analysis)
    const { searchParams } = new URL(request.url)
    const repoParam = searchParams.get('repo')

    const redis = await getRedisClient()
    const cacheKey = `tokens:combined-analysis:${tokenId}${repoParam ? `:${repoParam}` : ''}`
    const analysisCacheKey = `${cacheKey}:analysis`

    // Try to get analysis from cache
    try {
      const cachedAnalysis = await redis.get(analysisCacheKey)
      if (cachedAnalysis) {
        console.log('Cache hit: combined analysis')
        await redis.quit()
        return NextResponse.json(JSON.parse(cachedAnalysis))
      }
    } catch (error) {
      console.error('Redis get error:', error)
    }

    // Fetch both GitHub and tokenomics analyses
    console.log('Fetching GitHub and tokenomics analyses for combined analysis:', tokenId)
    
    // Construct base URL from request
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`
    
    // Fetch tokenomics analysis (required) and token data
    const [tokenomicsResponse, tokenResponse] = await Promise.all([
      fetch(`${baseUrl}/api/tokens/${tokenId}/tokenomics-analysis`).catch(() => null),
      fetch(`${baseUrl}/api/tokens/${tokenId}`).catch(() => null),
    ])

    if (!tokenomicsResponse || !tokenomicsResponse.ok) {
      await redis.quit()
      return NextResponse.json(
        { error: 'Tokenomics analysis not available. Please run tokenomics analysis first.' },
        { status: 400 }
      )
    }

    const tokenomicsAnalysis = await tokenomicsResponse.json()
    const tokenData = tokenResponse && tokenResponse.ok ? await tokenResponse.json() : { token: { name: tokenId, symbol: tokenId } }

    // Try to fetch GitHub analysis (optional - will proceed without it if unavailable)
    let githubAnalysis: any | null = null
    try {
      console.log('Attempting to fetch GitHub analysis...')
      const githubResponse = await fetch(
        `${baseUrl}/api/tokens/${tokenId}/github-analysis${repoParam ? `?repo=${encodeURIComponent(repoParam)}` : ''}`
      )
      
      if (githubResponse && githubResponse.ok) {
        githubAnalysis = await githubResponse.json()
        console.log('GitHub analysis fetched successfully')
      } else {
        const errorData = await githubResponse.json().catch(() => ({}))
        console.log('GitHub analysis not available:', errorData.error || 'Unknown error')
        // Continue without GitHub analysis - it's optional
      }
    } catch (error) {
      console.log('Error fetching GitHub analysis, proceeding without it:', error instanceof Error ? error.message : 'Unknown error')
      // Continue without GitHub analysis - it's optional
    }

    // Run combined AI analysis
    console.log('Running combined analysis with OpenAI')
    const combinedAnalysis = await analyzeCombinedWithOpenAI(
      githubAnalysis,
      tokenomicsAnalysis,
      { token: tokenomicsAnalysis.token || { name: tokenData.name, symbol: tokenData.symbol }, ...tokenData }
    )

    // Prepare response
    const response = {
      token: {
        id: tokenId,
        name: tokenomicsAnalysis.token?.name || tokenData.name,
        symbol: tokenomicsAnalysis.token?.symbol || tokenData.symbol,
      },
      githubAnalysis: githubAnalysis ? {
        codeQuality: githubAnalysis.analysis?.codeQuality?.score || null,
        projectHealth: githubAnalysis.analysis?.projectHealth?.score || null,
        blockchainInfo: githubAnalysis.analysis?.blockchainInfo || null,
      } : null,
      tokenomicsAnalysis: {
        priceScore: tokenomicsAnalysis.analysis?.priceAnalysis?.score || null,
        tokenomicsScore: tokenomicsAnalysis.analysis?.tokenomics?.score || null,
        marketDynamicsScore: tokenomicsAnalysis.analysis?.marketDynamics?.score || null,
      },
      analysis: combinedAnalysis,
      analyzedAt: new Date().toISOString(),
    }

    // Cache analysis
    try {
      await redis.setEx(analysisCacheKey, CACHE_TTL_ANALYSIS, JSON.stringify(response))
      console.log(`Cached combined analysis (TTL: ${CACHE_TTL_ANALYSIS}s / 15 minutes)`)
    } catch (error) {
      console.error('Redis set error:', error)
    } finally {
      await redis.quit()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching combined analysis:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch combined analysis',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

