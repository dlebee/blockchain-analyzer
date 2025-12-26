'use client'

import { useState } from 'react'
import { FaCoins, FaChartLine, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaInfoCircle } from 'react-icons/fa'

interface TokenomicsAnalysisProps {
  tokenId: string
}

interface TokenomicsAnalysisData {
  token: {
    id: string
    name: string
    symbol: string
  }
  marketData: {
    currentPrice: number
    priceChanges: {
      '24h': number
      '7d': number
      '30d': number
      '1y': number
    }
    supply: {
      circulating: number | null
      total: number | null
      max: number | null
    }
    volume: {
      '24h': number
      '24hChange': number
    }
    marketCap: number
    marketCapChange24h: number
    fullyDilutedValuation: number | null
  }
  analysis: {
    priceAnalysis: {
      score: number
      trend: string
      volatility: string
      analysis: string
      strengths: string[]
      concerns: string[]
    }
    tokenomics: {
      score: number
      hasMaxSupply: boolean
      maxSupply: number | null
      circulatingPercentage: number | null
      inflationRate: string | null
      analysis: string
      strengths: string[]
      concerns: string[]
      redFlags: string[]
    }
    marketDynamics: {
      score: number
      volumeAnalysis: string
      liquidity: string
      marketCapHealth: string
      analysis: string
    }
    riskAssessment: {
      overallRisk: string
      risks: string[]
      recommendations: string[]
    }
    overallAssessment: string
  }
  analyzedAt: string
}

export default function TokenomicsAnalysis({ tokenId }: TokenomicsAnalysisProps) {
  const [analysis, setAnalysis] = useState<TokenomicsAnalysisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchAnalysis() {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/tokens/${tokenId}/tokenomics-analysis`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch tokenomics analysis')
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

  const getTrendColor = (trend: string) => {
    if (trend.toLowerCase().includes('bullish')) return 'text-green-600'
    if (trend.toLowerCase().includes('bearish')) return 'text-red-600'
    return 'text-gray-600'
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
            <FaCoins className="w-5 h-5" />
            Tokenomics Analysis
          </h2>
        </div>
        <p className="text-gray-600 mb-4">
          Analyze tokenomics, price trends, supply structure, and market dynamics using AI-powered analysis.
        </p>
        <button
          onClick={fetchAnalysis}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
        >
          <FaCoins className="w-4 h-4" />
          Analyze Tokenomics
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FaCoins className="w-5 h-5" />
          Tokenomics Analysis
        </h2>
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Analyzing tokenomics... This may take a moment.</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FaCoins className="w-5 h-5" />
            Tokenomics Analysis
          </h2>
        </div>
        <div className="text-red-500 py-4 mb-4">{error}</div>
        <button
          onClick={fetchAnalysis}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
        >
          <FaCoins className="w-4 h-4" />
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
          <FaCoins className="w-5 h-5" />
          Tokenomics Analysis
        </h2>
      </div>

      {/* Market Data Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Current Price</p>
          <p className="text-lg font-semibold text-gray-900">
            ${analysis.marketData.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 6 })}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">24h Change</p>
          <p className={`text-lg font-semibold ${analysis.marketData.priceChanges['24h'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {analysis.marketData.priceChanges['24h'] >= 0 ? '+' : ''}
            {analysis.marketData.priceChanges['24h'].toFixed(2)}%
          </p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Market Cap</p>
          <p className="text-lg font-semibold text-gray-900">
            ${(analysis.marketData.marketCap / 1e9).toFixed(2)}B
          </p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">24h Volume</p>
          <p className="text-lg font-semibold text-gray-900">
            ${(analysis.marketData.volume['24h'] / 1e6).toFixed(2)}M
          </p>
        </div>
      </div>

      {/* Supply Information */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Supply Structure</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Circulating Supply</p>
            <p className="text-lg font-semibold text-gray-900">
              {analysis.marketData.supply.circulating
                ? analysis.marketData.supply.circulating.toLocaleString()
                : 'Unknown'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Total Supply</p>
            <p className="text-lg font-semibold text-gray-900">
              {analysis.marketData.supply.total
                ? analysis.marketData.supply.total.toLocaleString()
                : 'Unknown'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Max Supply</p>
            <p className="text-lg font-semibold text-gray-900">
              {analysis.marketData.supply.max
                ? analysis.marketData.supply.max.toLocaleString()
                : 'Unlimited'}
            </p>
            {analysis.analysis.tokenomics.circulatingPercentage !== null && (
              <p className="text-xs text-gray-600 mt-1">
                {analysis.analysis.tokenomics.circulatingPercentage.toFixed(2)}% circulating
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`${getScoreBgColor(analysis.analysis.priceAnalysis.score)} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Price Analysis</h3>
            <span className={`text-2xl font-bold ${getScoreColor(analysis.analysis.priceAnalysis.score)}`}>
              {analysis.analysis.priceAnalysis.score}/100
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-sm font-medium capitalize ${getTrendColor(analysis.analysis.priceAnalysis.trend)}`}>
              {analysis.analysis.priceAnalysis.trend}
            </span>
            <span className="text-xs text-gray-600 capitalize">
              ({analysis.analysis.priceAnalysis.volatility} volatility)
            </span>
          </div>
          <p className="text-sm text-gray-700">{analysis.analysis.priceAnalysis.analysis}</p>
        </div>

        <div className={`${getScoreBgColor(analysis.analysis.tokenomics.score)} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Tokenomics</h3>
            <span className={`text-2xl font-bold ${getScoreColor(analysis.analysis.tokenomics.score)}`}>
              {analysis.analysis.tokenomics.score}/100
            </span>
          </div>
          <div className="mb-2">
            <p className="text-xs text-gray-600">
              Max Supply: {analysis.analysis.tokenomics.hasMaxSupply ? 'Yes' : 'No'}
              {analysis.analysis.tokenomics.inflationRate && ` • Inflation: ${analysis.analysis.tokenomics.inflationRate}`}
            </p>
          </div>
          <p className="text-sm text-gray-700">{analysis.analysis.tokenomics.analysis}</p>
        </div>

        <div className={`${getScoreBgColor(analysis.analysis.marketDynamics.score)} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Market Dynamics</h3>
            <span className={`text-2xl font-bold ${getScoreColor(analysis.analysis.marketDynamics.score)}`}>
              {analysis.analysis.marketDynamics.score}/100
            </span>
          </div>
          <div className="mb-2">
            <p className="text-xs text-gray-600 capitalize">
              Liquidity: {analysis.analysis.marketDynamics.liquidity} • Health: {analysis.analysis.marketDynamics.marketCapHealth}
            </p>
          </div>
          <p className="text-sm text-gray-700">{analysis.analysis.marketDynamics.analysis}</p>
        </div>
      </div>

      {/* Price Analysis Details */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Price Analysis Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
              <FaCheckCircle className="w-4 h-4" />
              Strengths
            </h4>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {analysis.analysis.priceAnalysis.strengths.map((strength, idx) => (
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
              {analysis.analysis.priceAnalysis.concerns.map((concern, idx) => (
                <li key={idx}>{concern}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Tokenomics Details */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Tokenomics Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
              <FaCheckCircle className="w-4 h-4" />
              Strengths
            </h4>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {analysis.analysis.tokenomics.strengths.map((strength, idx) => (
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
              {analysis.analysis.tokenomics.concerns.map((concern, idx) => (
                <li key={idx}>{concern}</li>
              ))}
            </ul>
          </div>
        </div>
        {analysis.analysis.tokenomics.redFlags.length > 0 && (
          <div className="mt-4 bg-red-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-red-900 mb-2 flex items-center gap-1">
              <FaExclamationTriangle className="w-4 h-4" />
              Red Flags
            </h4>
            <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
              {analysis.analysis.tokenomics.redFlags.map((flag, idx) => (
                <li key={idx}>{flag}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Risk Assessment */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Risk Assessment</h3>
        <div className={`${getRiskBgColor(analysis.analysis.riskAssessment.overallRisk)} rounded-lg p-4 mb-4`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">Overall Risk Level</h4>
            <span className={`text-lg font-bold capitalize ${getRiskColor(analysis.analysis.riskAssessment.overallRisk)}`}>
              {analysis.analysis.riskAssessment.overallRisk}
            </span>
          </div>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            {analysis.analysis.riskAssessment.risks.map((risk, idx) => (
              <li key={idx}>{risk}</li>
            ))}
          </ul>
        </div>
        {analysis.analysis.riskAssessment.recommendations.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-1">
              <FaInfoCircle className="w-4 h-4" />
              Recommendations
            </h4>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {analysis.analysis.riskAssessment.recommendations.map((rec, idx) => (
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
    </div>
  )
}

