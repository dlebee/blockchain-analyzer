import { NextResponse } from 'next/server'
import OpenAI from 'openai'

async function chatWithAnalysis(
  combinedAnalysisData: any,
  question: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  model: string = 'gpt-4o-mini'
) {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  const openai = new OpenAI({
    apiKey: openaiApiKey,
  })

  // Build context from combined analysis
  const analysisContext = `
=== COMBINED ANALYSIS DATA ===

Token: ${combinedAnalysisData.token?.name || 'Unknown'} (${combinedAnalysisData.token?.symbol || 'Unknown'})

PROTOCOL SUBSTANCE:
- Score: ${combinedAnalysisData.analysis?.protocolSubstance?.score || 'N/A'}/100
- Technical Quality: ${combinedAnalysisData.analysis?.protocolSubstance?.technicalQuality || 'N/A'}
- Development Health: ${combinedAnalysisData.analysis?.protocolSubstance?.developmentHealth || 'N/A'}
- Assessment: ${combinedAnalysisData.analysis?.protocolSubstance?.assessment || 'N/A'}
- Strengths: ${combinedAnalysisData.analysis?.protocolSubstance?.strengths?.join(', ') || 'None'}
- Weaknesses: ${combinedAnalysisData.analysis?.protocolSubstance?.weaknesses?.join(', ') || 'None'}

ECONOMIC MODEL:
- Score: ${combinedAnalysisData.analysis?.economicModel?.score || 'N/A'}/100
- Alignment: ${combinedAnalysisData.analysis?.economicModel?.alignment || 'N/A'}
- Sustainability: ${combinedAnalysisData.analysis?.economicModel?.sustainability || 'N/A'}
- Assessment: ${combinedAnalysisData.analysis?.economicModel?.assessment || 'N/A'}
- Strengths: ${combinedAnalysisData.analysis?.economicModel?.strengths?.join(', ') || 'None'}
- Concerns: ${combinedAnalysisData.analysis?.economicModel?.concerns?.join(', ') || 'None'}

MARKET CONTEXT:
- Score: ${combinedAnalysisData.analysis?.marketContext?.score || 'N/A'}/100
- Price Justification: ${combinedAnalysisData.analysis?.marketContext?.priceJustification || 'N/A'}
- Market Efficiency: ${combinedAnalysisData.analysis?.marketContext?.marketEfficiency || 'N/A'}
- Assessment: ${combinedAnalysisData.analysis?.marketContext?.assessment || 'N/A'}

AUDIENCE SENTIMENT:
- Overall Sentiment: ${combinedAnalysisData.analysis?.audienceSentiment?.overallSentiment || 'N/A'}
- Sentiment Score: ${combinedAnalysisData.analysis?.audienceSentiment?.sentimentScore || 'N/A'}/100
- Community Engagement: ${combinedAnalysisData.analysis?.audienceSentiment?.communityEngagement || 'N/A'}
- Developer Sentiment: ${combinedAnalysisData.analysis?.audienceSentiment?.developerSentiment || 'N/A'}
- User Sentiment: ${combinedAnalysisData.analysis?.audienceSentiment?.userSentiment || 'N/A'}
- Key Drivers: ${combinedAnalysisData.analysis?.audienceSentiment?.keyDrivers?.join(', ') || 'None'}
- Sentiment Analysis: ${combinedAnalysisData.analysis?.audienceSentiment?.sentimentAnalysis || 'N/A'}
- Disconnects: ${combinedAnalysisData.analysis?.audienceSentiment?.disconnects?.join(', ') || 'None'}
- Community Health: ${combinedAnalysisData.analysis?.audienceSentiment?.communityHealth || 'N/A'}

HOLISTIC RISK:
- Overall Risk: ${combinedAnalysisData.analysis?.holisticRisk?.overallRisk || 'N/A'}
- Technical Risks: ${combinedAnalysisData.analysis?.holisticRisk?.technicalRisks?.join(', ') || 'None'}
- Economic Risks: ${combinedAnalysisData.analysis?.holisticRisk?.economicRisks?.join(', ') || 'None'}
- Sentiment Risks: ${combinedAnalysisData.analysis?.holisticRisk?.sentimentRisks?.join(', ') || 'None'}
- Combined Risk Assessment: ${combinedAnalysisData.analysis?.holisticRisk?.combinedRiskAssessment || 'N/A'}

ADOPTION READINESS:
- Ready: ${combinedAnalysisData.analysis?.adoptionReadiness?.ready ? 'Yes' : 'No'}
- Readiness Score: ${combinedAnalysisData.analysis?.adoptionReadiness?.readinessScore || 'N/A'}/100
- Barriers: ${combinedAnalysisData.analysis?.adoptionReadiness?.barriers?.join(', ') || 'None'}
- Recommendations: ${combinedAnalysisData.analysis?.adoptionReadiness?.recommendations?.join(', ') || 'None'}
- Assessment: ${combinedAnalysisData.analysis?.adoptionReadiness?.assessment || 'N/A'}

OVERALL ASSESSMENT:
${combinedAnalysisData.analysis?.overallAssessment || 'N/A'}

COMPONENT SCORES:
- Code Quality: ${combinedAnalysisData.githubAnalysis?.codeQuality || 'N/A'}/100
- Project Health: ${combinedAnalysisData.githubAnalysis?.projectHealth || 'N/A'}/100
- Price Score: ${combinedAnalysisData.tokenomicsAnalysis?.priceScore || 'N/A'}/100
- Tokenomics Score: ${combinedAnalysisData.tokenomicsAnalysis?.tokenomicsScore || 'N/A'}/100
- Market Dynamics Score: ${combinedAnalysisData.tokenomicsAnalysis?.marketDynamicsScore || 'N/A'}/100
`

  // Build conversation messages
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: `You are an expert cryptocurrency analyst helping users understand a comprehensive combined analysis of a blockchain protocol/token. 

You have access to:
1. Protocol substance analysis (code quality, development health)
2. Economic model analysis (tokenomics, sustainability)
3. Market context analysis (price justification, market efficiency)
4. Audience sentiment analysis (community feeling, developer/user sentiment)
5. Holistic risk assessment
6. Adoption readiness evaluation

Use this information to answer questions accurately. Reference specific scores, assessments, and findings from the analysis. If asked about something not in the analysis, say so clearly.

Be conversational but precise. Help users understand the implications of the analysis.`,
    },
    {
      role: 'user',
      content: `Here is the combined analysis data:\n\n${analysisContext}\n\nPlease use this data to answer questions about this token/protocol.`,
    },
    ...conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    {
      role: 'user',
      content: question,
    },
  ]

  try {
    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
      temperature: 0.7,
    })

    const answer = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.'
    return answer
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw error
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const tokenId = resolvedParams.id

    if (!tokenId) {
      return NextResponse.json({ error: 'Token ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const { question, combinedAnalysisData, conversationHistory, model = 'gpt-4o-mini' } = body

    if (!question || !combinedAnalysisData) {
      return NextResponse.json(
        { error: 'Question and combinedAnalysisData are required' },
        { status: 400 }
      )
    }

    const answer = await chatWithAnalysis(
      combinedAnalysisData,
      question,
      conversationHistory || [],
      model
    )

    return NextResponse.json({ answer })
  } catch (error) {
    console.error('Error in chat endpoint:', error)
    return NextResponse.json(
      {
        error: 'Failed to process question',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

