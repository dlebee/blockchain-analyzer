'use client'

import { useState } from 'react'
import { FaExchangeAlt, FaBuilding, FaCoins, FaChartBar, FaShieldAlt, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaInfoCircle, FaGlobe } from 'react-icons/fa'

interface ListingAnalysisProps {
  tokenId: string
}

interface ListingAnalysisData {
  token: {
    id: string
    name: string
    symbol: string
  }
  listingData: {
    totalListings: number
    cexCount: number
    dexCount: number
    totalVolume: number
    cexVolume?: number
    dexVolume?: number
    cexVolumePercentage?: number
    dexVolumePercentage?: number
    cexListingPercentage?: number
    dexListingPercentage?: number
    concentration?: {
      type: 'dex' | 'cex' | 'balanced'
      score: number
      description: string
    }
  }
  analysis: {
    listingQuality: {
      score: number
      totalListings: number
      cexCount: number
      dexCount: number
      majorCexListings: number
      assessment: string
      strengths: string[]
      weaknesses: string[]
    }
    marketAccessibility: {
      score: number
      accessibilityLevel: string
      geographicAccess: string
      barriers: string[]
      assessment: string
    }
    liquidityAnalysis: {
      score: number
      totalVolume: number
      cexVolumePercentage: number
      dexVolumePercentage: number
      liquidityConcentration: string
      concerns: string[]
      assessment: string
    }
    exchangeReputation: {
      score: number
      highTrustPercentage: number
      trustScoreDistribution: {
        green: number
        yellow: number
        red: number
      }
      reliabilityConcerns: string[]
      assessment: string
    }
    marketPresence: {
      score: number
      marketMaturity: string
      targetAudience: string
      adoptionIndicators: string[]
      assessment: string
    }
    riskAssessment: {
      overallRisk: string
      liquidityRisks: string[]
      exchangeRisks: string[]
      manipulationRisks: string[]
      combinedRiskAssessment: string
    }
    recommendations: {
      priorityExchanges: string[]
      improvements: string[]
      strategicAdvice: string
    }
    overallAssessment: string
  }
  analyzedAt: string
}

export default function ListingAnalysis({ tokenId }: ListingAnalysisProps) {
  const [analysis, setAnalysis] = useState<ListingAnalysisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchAnalysis() {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/tokens/${tokenId}/listing-analysis`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch listing analysis')
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

  const getAccessibilityColor = (level: string) => {
    const l = level.toLowerCase()
    if (l === 'high') return 'text-green-600'
    if (l === 'medium') return 'text-yellow-600'
    return 'text-red-600'
  }

  // Show button if no analysis yet
  if (!analysis && !loading && !error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FaExchangeAlt className="w-5 h-5" />
            Listing Analysis
          </h2>
        </div>
        <p className="text-gray-600 mb-4">
          Analyze exchange listings to evaluate market accessibility, liquidity distribution, and listing quality across CEX and DEX platforms.
        </p>
        <button
          onClick={fetchAnalysis}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
        >
          <FaExchangeAlt className="w-4 h-4" />
          Run Listing Analysis
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FaExchangeAlt className="w-5 h-5" />
          Listing Analysis
        </h2>
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Analyzing exchange listings... This may take a moment.</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FaExchangeAlt className="w-5 h-5" />
            Listing Analysis
          </h2>
        </div>
        <div className="text-red-500 py-4 mb-4">{error}</div>
        <button
          onClick={fetchAnalysis}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
        >
          <FaExchangeAlt className="w-4 h-4" />
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
          <FaExchangeAlt className="w-5 h-5" />
          Listing Analysis
        </h2>
      </div>

      {/* Listing Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <FaExchangeAlt className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-gray-600">Total Listings</p>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {analysis.listingData.totalListings}
          </p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <FaBuilding className="w-4 h-4 text-purple-600" />
            <p className="text-xs text-gray-600">CEX</p>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {analysis.listingData.cexCount}
            {analysis.listingData.cexListingPercentage !== undefined && (
              <span className="text-xs text-gray-500 ml-1">({analysis.listingData.cexListingPercentage.toFixed(1)}%)</span>
            )}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <FaCoins className="w-4 h-4 text-green-600" />
            <p className="text-xs text-gray-600">DEX</p>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {analysis.listingData.dexCount}
            {analysis.listingData.dexListingPercentage !== undefined && (
              <span className="text-xs text-gray-500 ml-1">({analysis.listingData.dexListingPercentage.toFixed(1)}%)</span>
            )}
          </p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <FaChartBar className="w-4 h-4 text-orange-600" />
            <p className="text-xs text-gray-600">24h Volume</p>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            ${(analysis.listingData.totalVolume / 1e6).toFixed(2)}M
          </p>
        </div>
      </div>

      {/* Concentration Badge */}
      {analysis.listingData.concentration && (
        <div className={`mb-6 rounded-lg p-4 ${
          analysis.listingData.concentration.type === 'dex' 
            ? 'bg-green-50 border-2 border-green-200' 
            : analysis.listingData.concentration.type === 'cex'
            ? 'bg-purple-50 border-2 border-purple-200'
            : 'bg-gray-50 border-2 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <FaInfoCircle className={`w-5 h-5 ${
                  analysis.listingData.concentration.type === 'dex' 
                    ? 'text-green-600' 
                    : analysis.listingData.concentration.type === 'cex'
                    ? 'text-purple-600'
                    : 'text-gray-600'
                }`} />
                Exchange Concentration: <span className="uppercase">{analysis.listingData.concentration.type}</span>
              </h3>
              <p className="text-sm text-gray-700">{analysis.listingData.concentration.description}</p>
            </div>
            <div className={`text-2xl font-bold ${
              analysis.listingData.concentration.type === 'dex' 
                ? 'text-green-600' 
                : analysis.listingData.concentration.type === 'cex'
                ? 'text-purple-600'
                : 'text-gray-600'
            }`}>
              {analysis.listingData.concentration.score.toFixed(1)}%
            </div>
          </div>
          {analysis.listingData.cexVolumePercentage !== undefined && analysis.listingData.dexVolumePercentage !== undefined && (
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">CEX Volume</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: `${analysis.listingData.cexVolumePercentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-700 mt-1">{analysis.listingData.cexVolumePercentage.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">DEX Volume</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${analysis.listingData.dexVolumePercentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-700 mt-1">{analysis.listingData.dexVolumePercentage.toFixed(1)}%</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className={`${getScoreBgColor(analysis.analysis.listingQuality.score)} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FaExchangeAlt className="w-4 h-4" />
              Listing Quality
            </h3>
            <span className={`text-2xl font-bold ${getScoreColor(analysis.analysis.listingQuality.score)}`}>
              {analysis.analysis.listingQuality.score}/100
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-2">
            Major CEX: {analysis.analysis.listingQuality.majorCexListings}
          </p>
          <p className="text-sm text-gray-700">{analysis.analysis.listingQuality.assessment}</p>
        </div>

        <div className={`${getScoreBgColor(analysis.analysis.marketAccessibility.score)} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FaGlobe className="w-4 h-4" />
              Accessibility
            </h3>
            <span className={`text-2xl font-bold ${getScoreColor(analysis.analysis.marketAccessibility.score)}`}>
              {analysis.analysis.marketAccessibility.score}/100
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-2 capitalize">
            {analysis.analysis.marketAccessibility.accessibilityLevel}
          </p>
          <p className="text-sm text-gray-700">{analysis.analysis.marketAccessibility.assessment}</p>
        </div>

        <div className={`${getScoreBgColor(analysis.analysis.liquidityAnalysis.score)} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FaChartBar className="w-4 h-4" />
              Liquidity
            </h3>
            <span className={`text-2xl font-bold ${getScoreColor(analysis.analysis.liquidityAnalysis.score)}`}>
              {analysis.analysis.liquidityAnalysis.score}/100
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-2 capitalize">
            {analysis.analysis.liquidityAnalysis.liquidityConcentration}
          </p>
          <p className="text-sm text-gray-700">{analysis.analysis.liquidityAnalysis.assessment}</p>
        </div>

        <div className={`${getScoreBgColor(analysis.analysis.exchangeReputation.score)} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FaShieldAlt className="w-4 h-4" />
              Exchange Reputation
            </h3>
            <span className={`text-2xl font-bold ${getScoreColor(analysis.analysis.exchangeReputation.score)}`}>
              {analysis.analysis.exchangeReputation.score}/100
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-2">
            High Trust: {analysis.analysis.exchangeReputation.highTrustPercentage.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-700">{analysis.analysis.exchangeReputation.assessment}</p>
        </div>

        <div className={`${getScoreBgColor(analysis.analysis.marketPresence.score)} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FaCoins className="w-4 h-4" />
              Market Presence
            </h3>
            <span className={`text-2xl font-bold ${getScoreColor(analysis.analysis.marketPresence.score)}`}>
              {analysis.analysis.marketPresence.score}/100
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-2 capitalize">
            {analysis.analysis.marketPresence.marketMaturity} • {analysis.analysis.marketPresence.targetAudience}
          </p>
          <p className="text-sm text-gray-700">{analysis.analysis.marketPresence.assessment}</p>
        </div>

        <div className={`${getRiskBgColor(analysis.analysis.riskAssessment.overallRisk)} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FaExclamationTriangle className="w-4 h-4" />
              Risk Level
            </h3>
            <span className={`text-lg font-bold capitalize ${getRiskColor(analysis.analysis.riskAssessment.overallRisk)}`}>
              {analysis.analysis.riskAssessment.overallRisk}
            </span>
          </div>
          <p className="text-sm text-gray-700">{analysis.analysis.riskAssessment.combinedRiskAssessment}</p>
        </div>
      </div>

      {/* Listing Quality Details */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Listing Quality Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
              <FaCheckCircle className="w-4 h-4" />
              Strengths
            </h4>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {analysis.analysis.listingQuality.strengths.map((strength, idx) => (
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
              {analysis.analysis.listingQuality.weaknesses.map((weakness, idx) => (
                <li key={idx}>{weakness}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Liquidity Analysis Details */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Liquidity Distribution</h3>
        <div className="bg-gray-50 rounded-lg p-4 mb-3">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-xs text-gray-600 mb-1">CEX Volume</p>
              <p className="text-lg font-semibold text-gray-900">
                {analysis.analysis.liquidityAnalysis.cexVolumePercentage.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">DEX Volume</p>
              <p className="text-lg font-semibold text-gray-900">
                {analysis.analysis.liquidityAnalysis.dexVolumePercentage.toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-700">{analysis.analysis.liquidityAnalysis.assessment}</p>
        </div>
        {analysis.analysis.liquidityAnalysis.concerns.length > 0 && (
          <div className="bg-yellow-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-yellow-900 mb-2">Liquidity Concerns</h4>
            <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
              {analysis.analysis.liquidityAnalysis.concerns.map((concern, idx) => (
                <li key={idx}>{concern}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Exchange Reputation Details */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Exchange Trust Score Distribution</h3>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600 mb-1">High Trust</p>
            <p className="text-2xl font-bold text-green-600">{analysis.analysis.exchangeReputation.trustScoreDistribution.green}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600 mb-1">Medium Trust</p>
            <p className="text-2xl font-bold text-yellow-600">{analysis.analysis.exchangeReputation.trustScoreDistribution.yellow}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600 mb-1">Low Trust</p>
            <p className="text-2xl font-bold text-red-600">{analysis.analysis.exchangeReputation.trustScoreDistribution.red}</p>
          </div>
        </div>
        {analysis.analysis.exchangeReputation.reliabilityConcerns.length > 0 && (
          <div className="bg-red-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-red-900 mb-2">Reliability Concerns</h4>
            <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
              {analysis.analysis.exchangeReputation.reliabilityConcerns.map((concern, idx) => (
                <li key={idx}>{concern}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Market Presence Details */}
      {analysis.analysis.marketPresence.adoptionIndicators.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Adoption Indicators</h3>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            {analysis.analysis.marketPresence.adoptionIndicators.map((indicator, idx) => (
              <li key={idx}>{indicator}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk Assessment */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Risk Assessment</h3>
        <div className={`${getRiskBgColor(analysis.analysis.riskAssessment.overallRisk)} rounded-lg p-4 mb-4`}>
          <p className="text-sm text-gray-700 mb-3">{analysis.analysis.riskAssessment.combinedRiskAssessment}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {analysis.analysis.riskAssessment.liquidityRisks.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-gray-700 mb-1">Liquidity Risks</h5>
                <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                  {analysis.analysis.riskAssessment.liquidityRisks.map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.analysis.riskAssessment.exchangeRisks.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-gray-700 mb-1">Exchange Risks</h5>
                <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                  {analysis.analysis.riskAssessment.exchangeRisks.map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.analysis.riskAssessment.manipulationRisks.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-gray-700 mb-1">Manipulation Risks</h5>
                <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                  {analysis.analysis.riskAssessment.manipulationRisks.map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Recommendations</h3>
        {analysis.analysis.recommendations.priorityExchanges.length > 0 && (
          <div className="mb-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Priority Exchanges</h4>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {analysis.analysis.recommendations.priorityExchanges.map((exchange, idx) => (
                <li key={idx}>{exchange}</li>
              ))}
            </ul>
          </div>
        )}
        {analysis.analysis.recommendations.improvements.length > 0 && (
          <div className="mb-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Improvements</h4>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {analysis.analysis.recommendations.improvements.map((improvement, idx) => (
                <li key={idx}>{improvement}</li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Strategic Advice</h4>
          <p className="text-sm text-gray-700">{analysis.analysis.recommendations.strategicAdvice}</p>
        </div>
      </div>

      {/* Overall Assessment */}
      <div className="bg-gray-50 rounded-lg p-4">
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

