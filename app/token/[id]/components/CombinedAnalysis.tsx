'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { FaLayerGroup, FaCode, FaCoins, FaChartLine, FaUsers, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaInfoCircle, FaQuestionCircle, FaPaperPlane } from 'react-icons/fa'

interface CombinedAnalysisProps {
  tokenId: string
  githubUrl?: string
}

interface CombinedAnalysisData {
  token: {
    id: string
    name: string
    symbol: string
  }
  githubAnalysis: {
    codeQuality: number | null
    projectHealth: number | null
    blockchainInfo: any
  } | null
  tokenomicsAnalysis: {
    priceScore: number | null
    tokenomicsScore: number | null
    marketDynamicsScore: number | null
  }
  analysis: {
    protocolSubstance: {
      score: number
      technicalQuality: string
      developmentHealth: string
      strengths: string[]
      weaknesses: string[]
      assessment: string
    }
    economicModel: {
      score: number
      alignment: string
      sustainability: string
      strengths: string[]
      concerns: string[]
      assessment: string
    }
    marketContext: {
      score: number
      priceJustification: string
      marketEfficiency: string
      assessment: string
    }
    audienceSentiment: {
      overallSentiment: string
      sentimentScore: number
      communityEngagement: string
      developerSentiment: string
      userSentiment: string
      keyDrivers: string[]
      sentimentAnalysis: string
      confidenceLevel: string
      disconnects: string[]
      communityHealth: string
    }
    holisticRisk: {
      overallRisk: string
      technicalRisks: string[]
      economicRisks: string[]
      sentimentRisks: string[]
      combinedRiskAssessment: string
    }
    adoptionReadiness: {
      ready: boolean
      readinessScore: number
      barriers: string[]
      recommendations: string[]
      assessment: string
    }
    overallAssessment: string
  }
  analyzedAt: string
}

export default function CombinedAnalysis({ tokenId, githubUrl }: CombinedAnalysisProps) {
  const [analysis, setAnalysis] = useState<CombinedAnalysisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRepo, setSelectedRepo] = useState<string>('')
  const [chatQuestion, setChatQuestion] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini')

  async function fetchAnalysis() {
    try {
      setLoading(true)
      setError(null)
      const url = `/api/tokens/${tokenId}/combined-analysis${selectedRepo ? `?repo=${encodeURIComponent(selectedRepo)}` : ''}`
      const response = await fetch(url)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch combined analysis')
      }
      const data = await response.json()
      setAnalysis(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const getSentimentColor = (sentiment: string) => {
    const s = sentiment.toLowerCase()
    if (s.includes('bullish') || s.includes('positive')) return 'text-green-600'
    if (s.includes('bearish') || s.includes('negative')) return 'text-red-600'
    return 'text-gray-600'
  }

  const getSentimentBgColor = (sentiment: string) => {
    const s = sentiment.toLowerCase()
    if (s.includes('bullish') || s.includes('positive')) return 'bg-green-100'
    if (s.includes('bearish') || s.includes('negative')) return 'bg-red-100'
    return 'bg-gray-100'
  }

  const getRiskColor = (risk: string) => {
    if (risk.toLowerCase() === 'low') return 'text-green-600'
    if (risk.toLowerCase() === 'medium') return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRiskBgColor = (risk: string) => {
    if (risk.toLowerCase() === 'low') return 'bg-green-100'
    if (risk.toLowerCase() === 'medium') return 'bg-yellow-100'
    return 'bg-red-100'
  }

  // Show button if no analysis yet
  if (!analysis && !loading && !error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FaLayerGroup className="w-5 h-5" />
            Combined Analysis
          </h2>
        </div>
        <p className="text-gray-600 mb-4">
          Get a comprehensive analysis combining code quality (protocol substance), tokenomics, market data, and most importantly - <strong>audience sentiment</strong> and community feeling about this token.
        </p>
        {githubUrl && (
          <div className="mb-4 text-sm text-gray-500">
            Note: GitHub analysis will be automatically included if available. If no GitHub repository is linked, the analysis will proceed with tokenomics and market data only.
          </div>
        )}
        <button
          onClick={fetchAnalysis}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
        >
          <FaLayerGroup className="w-4 h-4" />
          Run Combined Analysis
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FaLayerGroup className="w-5 h-5" />
          Combined Analysis
        </h2>
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Analyzing protocol substance, tokenomics, market data, and audience sentiment... This may take a moment.</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FaLayerGroup className="w-5 h-5" />
            Combined Analysis
          </h2>
        </div>
        <div className="text-red-500 py-4 mb-4">{error}</div>
        <button
          onClick={fetchAnalysis}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
        >
          <FaLayerGroup className="w-4 h-4" />
          Retry Analysis
        </button>
      </div>
    )
  }

  if (!analysis) return null

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <FaLayerGroup className="w-5 h-5" />
          Combined Analysis
        </h2>
      </div>

      {/* Component Scores Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <FaCode className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-gray-600">Code Quality</p>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {analysis.githubAnalysis?.codeQuality !== null && analysis.githubAnalysis?.codeQuality !== undefined ? `${analysis.githubAnalysis.codeQuality}/100` : 'N/A'}
          </p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <FaCoins className="w-4 h-4 text-purple-600" />
            <p className="text-xs text-gray-600">Tokenomics</p>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {analysis.tokenomicsAnalysis.tokenomicsScore !== null ? `${analysis.tokenomicsAnalysis.tokenomicsScore}/100` : 'N/A'}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <FaChartLine className="w-4 h-4 text-green-600" />
            <p className="text-xs text-gray-600">Price</p>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {analysis.tokenomicsAnalysis.priceScore !== null ? `${analysis.tokenomicsAnalysis.priceScore}/100` : 'N/A'}
          </p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <FaUsers className="w-4 h-4 text-orange-600" />
            <p className="text-xs text-gray-600">Sentiment</p>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {analysis.analysis.audienceSentiment.sentimentScore}/100
          </p>
        </div>
        <div className="bg-indigo-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <FaLayerGroup className="w-4 h-4 text-indigo-600" />
            <p className="text-xs text-gray-600">Readiness</p>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {analysis.analysis.adoptionReadiness.readinessScore}/100
          </p>
        </div>
      </div>

      {/* Main Scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`${getScoreBgColor(analysis.analysis.protocolSubstance.score)} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FaCode className="w-4 h-4" />
              Protocol Substance
            </h3>
            <span className={`text-2xl font-bold ${getScoreColor(analysis.analysis.protocolSubstance.score)}`}>
              {analysis.analysis.protocolSubstance.score}/100
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-2 capitalize">
            {analysis.analysis.protocolSubstance.developmentHealth}
          </p>
          <p className="text-sm text-gray-700">{analysis.analysis.protocolSubstance.assessment}</p>
        </div>

        <div className={`${getScoreBgColor(analysis.analysis.economicModel.score)} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FaCoins className="w-4 h-4" />
              Economic Model
            </h3>
            <span className={`text-2xl font-bold ${getScoreColor(analysis.analysis.economicModel.score)}`}>
              {analysis.analysis.economicModel.score}/100
            </span>
          </div>
          <p className="text-sm text-gray-700">{analysis.analysis.economicModel.assessment}</p>
        </div>

        <div className={`${getScoreBgColor(analysis.analysis.marketContext.score)} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FaChartLine className="w-4 h-4" />
              Market Context
            </h3>
            <span className={`text-2xl font-bold ${getScoreColor(analysis.analysis.marketContext.score)}`}>
              {analysis.analysis.marketContext.score}/100
            </span>
          </div>
          <p className="text-sm text-gray-700">{analysis.analysis.marketContext.assessment}</p>
        </div>
      </div>

      {/* Audience Sentiment - Featured Section */}
      <div className={`${getSentimentBgColor(analysis.analysis.audienceSentiment.overallSentiment)} rounded-lg p-6 mb-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FaUsers className="w-5 h-5" />
            Audience Sentiment & Community Feeling
          </h3>
          <div className="text-right">
            <span className={`text-2xl font-bold ${getSentimentColor(analysis.analysis.audienceSentiment.overallSentiment)} capitalize`}>
              {analysis.analysis.audienceSentiment.overallSentiment}
            </span>
            <p className="text-xs text-gray-600">
              Score: {analysis.analysis.audienceSentiment.sentimentScore}/100
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white bg-opacity-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Community Engagement</p>
            <p className="text-sm font-semibold text-gray-900 capitalize">
              {analysis.analysis.audienceSentiment.communityEngagement}
            </p>
          </div>
          <div className="bg-white bg-opacity-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Developer Sentiment</p>
            <p className="text-sm font-semibold text-gray-900 capitalize">
              {analysis.analysis.audienceSentiment.developerSentiment}
            </p>
          </div>
          <div className="bg-white bg-opacity-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">User Sentiment</p>
            <p className="text-sm font-semibold text-gray-900 capitalize">
              {analysis.analysis.audienceSentiment.userSentiment}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Sentiment Analysis</h4>
          <p className="text-sm text-gray-700 mb-3">{analysis.analysis.audienceSentiment.sentimentAnalysis}</p>
        </div>

        {analysis.analysis.audienceSentiment.keyDrivers.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Key Sentiment Drivers</h4>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {analysis.analysis.audienceSentiment.keyDrivers.map((driver, idx) => (
                <li key={idx}>{driver}</li>
              ))}
            </ul>
          </div>
        )}

        {analysis.analysis.audienceSentiment.disconnects.length > 0 && (
          <div className="bg-yellow-50 rounded-lg p-3 mb-3">
            <h4 className="text-sm font-medium text-yellow-900 mb-2">Sentiment Disconnects</h4>
            <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
              {analysis.analysis.audienceSentiment.disconnects.map((disconnect, idx) => (
                <li key={idx}>{disconnect}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span>Confidence: <span className="capitalize font-medium">{analysis.analysis.audienceSentiment.confidenceLevel}</span></span>
          <span>Community Health: <span className="capitalize font-medium">{analysis.analysis.audienceSentiment.communityHealth}</span></span>
        </div>
      </div>

      {/* Protocol Substance Details */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Protocol Substance Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
              <FaCheckCircle className="w-4 h-4" />
              Strengths
            </h4>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {analysis.analysis.protocolSubstance.strengths.map((strength, idx) => (
                <li key={idx}>{strength}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
              <FaTimesCircle className="w-4 h-4" />
              Weaknesses
            </h4>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {analysis.analysis.protocolSubstance.weaknesses.map((weakness, idx) => (
                <li key={idx}>{weakness}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Economic Model Details */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Economic Model Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
              <FaCheckCircle className="w-4 h-4" />
              Strengths
            </h4>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {analysis.analysis.economicModel.strengths.map((strength, idx) => (
                <li key={idx}>{strength}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
              <FaTimesCircle className="w-4 h-4" />
              Concerns
            </h4>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {analysis.analysis.economicModel.concerns.map((concern, idx) => (
                <li key={idx}>{concern}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Holistic Risk Assessment */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Holistic Risk Assessment</h3>
        <div className={`${getRiskBgColor(analysis.analysis.holisticRisk.overallRisk)} rounded-lg p-4 mb-4`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">Overall Risk Level</h4>
            <span className={`text-lg font-bold capitalize ${getRiskColor(analysis.analysis.holisticRisk.overallRisk)}`}>
              {analysis.analysis.holisticRisk.overallRisk}
            </span>
          </div>
          <p className="text-sm text-gray-700 mb-3">{analysis.analysis.holisticRisk.combinedRiskAssessment}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {analysis.analysis.holisticRisk.technicalRisks.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-gray-700 mb-1">Technical Risks</h5>
                <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                  {analysis.analysis.holisticRisk.technicalRisks.map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.analysis.holisticRisk.economicRisks.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-gray-700 mb-1">Economic Risks</h5>
                <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                  {analysis.analysis.holisticRisk.economicRisks.map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.analysis.holisticRisk.sentimentRisks.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-gray-700 mb-1">Sentiment Risks</h5>
                <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                  {analysis.analysis.holisticRisk.sentimentRisks.map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Adoption Readiness */}
      <div className={`${analysis.analysis.adoptionReadiness.ready ? 'bg-green-50' : 'bg-yellow-50'} rounded-lg p-4 mb-6`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <FaLayerGroup className="w-5 h-5" />
            Adoption Readiness
          </h3>
          <div className="text-right">
            <span className={`text-2xl font-bold ${analysis.analysis.adoptionReadiness.ready ? 'text-green-600' : 'text-yellow-600'}`}>
              {analysis.analysis.adoptionReadiness.ready ? 'Ready' : 'Not Ready'}
            </span>
            <p className="text-xs text-gray-600">
              Score: {analysis.analysis.adoptionReadiness.readinessScore}/100
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-700 mb-3">{analysis.analysis.adoptionReadiness.assessment}</p>
        {analysis.analysis.adoptionReadiness.barriers.length > 0 && (
          <div className="mb-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Barriers to Adoption</h4>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {analysis.analysis.adoptionReadiness.barriers.map((barrier, idx) => (
                <li key={idx}>{barrier}</li>
              ))}
            </ul>
          </div>
        )}
        {analysis.analysis.adoptionReadiness.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Recommendations</h4>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {analysis.analysis.adoptionReadiness.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Overall Assessment */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Overall Assessment</h3>
        <p className="text-sm text-gray-700">{analysis.analysis.overallAssessment}</p>
      </div>

      {/* Analysis Metadata */}
      <div className="mt-4 text-xs text-gray-500">
        Analyzed at {new Date(analysis.analyzedAt).toLocaleString()}
      </div>

      {/* Q&A Chat Interface */}
      <div className="mt-8 border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FaQuestionCircle className="w-5 h-5" />
          Ask Questions About This Analysis
        </h3>
        
        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <div className="mb-4 space-y-4 max-h-96 overflow-y-auto">
            {conversationHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-50 ml-8'
                    : 'bg-gray-50 mr-8'
                }`}
              >
                <div className="text-xs font-medium text-gray-600 mb-1 capitalize">
                  {msg.role === 'user' ? 'You' : 'Analyst'}
                </div>
                {msg.role === 'user' ? (
                  <div className="text-sm text-gray-900 whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <div className="text-sm text-gray-900 prose prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="ml-2">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        code: ({ children }) => <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                        h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-2 first:mt-0">{children}</h3>,
                        blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-3 italic my-2">{children}</blockquote>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Options */}
        <div className="mb-4 flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <label htmlFor="modelSelect" className="text-sm text-gray-700">
              Model:
            </label>
            <select
              id="modelSelect"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
            >
              <option value="gpt-4o-mini">GPT-4o Mini (Fast, Cost-effective)</option>
              <option value="gpt-4o">GPT-4o (Balanced)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo (High Quality)</option>
              <option value="gpt-4">GPT-4 (Highest Quality)</option>
            </select>
          </div>
        </div>

        {/* Question Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={chatQuestion}
            onChange={(e) => setChatQuestion(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && chatQuestion.trim() && !chatLoading) {
                handleAskQuestion()
              }
            }}
            placeholder="Ask a question about this analysis..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            disabled={chatLoading}
          />
          <button
            onClick={handleAskQuestion}
            disabled={!chatQuestion.trim() || chatLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {chatLoading ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <>
                <FaPaperPlane className="w-4 h-4" />
                Ask
              </>
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Ask questions about the protocol substance, tokenomics, market context, audience sentiment, risks, or adoption readiness.
        </p>
      </div>
    </div>
  )

  async function handleAskQuestion() {
    if (!chatQuestion.trim() || !analysis || chatLoading) return

    const question = chatQuestion.trim()
    setChatQuestion('')
    setChatLoading(true)

    // Add user question to conversation
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user' as const, content: question },
    ]
    setConversationHistory(updatedHistory)

    try {
      const response = await fetch(`/api/tokens/${tokenId}/combined-analysis/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          combinedAnalysisData: analysis,
          conversationHistory: conversationHistory, // Pass history without the new question
          model: selectedModel,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to get answer')
      }

      const data = await response.json()
      
      // Add assistant answer to conversation
      setConversationHistory([
        ...updatedHistory,
        { role: 'assistant' as const, content: data.answer },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get answer')
      // Remove the question from history if it failed
      setConversationHistory(conversationHistory)
    } finally {
      setChatLoading(false)
    }
  }
}

