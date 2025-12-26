'use client'

import { useState } from 'react'
import { FaGithub, FaStar, FaCodeBranch, FaExclamationTriangle, FaUsers, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'

interface GithubAnalysisProps {
  tokenId: string
  githubUrl?: string
}

interface Analysis {
  commitQuality: {
    score: number
    analysis: string
    strengths: string[]
    weaknesses: string[]
  }
  codeQuality?: {
    score: number
    analysis: string
    observations: string[]
    strengths: string[]
    concerns: string[]
    patterns: string
  }
  projectHealth: {
    score: number
    analysis: string
    indicators: {
      activity: string
      maintenance: string
      community: string
    }
  }
  recommendations: string[]
  overallAssessment: string
}

interface GithubAnalysisData {
  repository: {
    url: string
    owner: string
    repo: string
    info: {
      stars: number
      forks: number
      open_issues: number
      language: string
      created_at: string
      updated_at: string
      pushed_at: string
      license: string
      archived: boolean
    }
  }
  contributors: {
    count: number
    topContributors: Array<{
      login: string
      contributions: number
      avatar_url: string
      html_url: string
    }>
  }
  commits: {
    totalAnalyzed: number
  }
  analysis: Analysis
  analyzedAt: string
}

export default function GithubAnalysis({ tokenId, githubUrl }: GithubAnalysisProps) {
  const [analysis, setAnalysis] = useState<GithubAnalysisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchAnalysis() {
    if (!githubUrl) return

    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/tokens/${tokenId}/github-analysis`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch GitHub analysis')
      }
      const data = await response.json()
      setAnalysis(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (!githubUrl) {
    return null
  }

  // Show button if no analysis yet
  if (!analysis && !loading && !error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FaGithub className="w-5 h-5" />
            GitHub Analysis
          </h2>
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
          >
            View on GitHub
          </a>
        </div>
        <p className="text-gray-600 mb-4">
          Analyze the GitHub repository to evaluate commit quality, project health, and community engagement.
        </p>
        <button
          onClick={fetchAnalysis}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
        >
          <FaGithub className="w-4 h-4" />
          Analyze Repository
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FaGithub className="w-5 h-5" />
          GitHub Analysis
        </h2>
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Analyzing repository... This may take a moment.</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FaGithub className="w-5 h-5" />
            GitHub Analysis
          </h2>
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
          >
            View on GitHub
          </a>
        </div>
        <div className="text-red-500 py-4 mb-4">{error}</div>
        <button
          onClick={fetchAnalysis}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
        >
          <FaGithub className="w-4 h-4" />
          Retry Analysis
        </button>
      </div>
    )
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <FaGithub className="w-5 h-5" />
          GitHub Analysis
        </h2>
        <a
          href={analysis.repository.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
        >
          View on GitHub
        </a>
      </div>

      {/* Repository Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="flex items-center gap-2">
          <FaStar className="w-4 h-4 text-yellow-500" />
          <div>
            <p className="text-sm text-gray-500">Stars</p>
            <p className="text-lg font-semibold">{analysis.repository.info.stars.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FaCodeBranch className="w-4 h-4 text-blue-500" />
          <div>
            <p className="text-sm text-gray-500">Forks</p>
            <p className="text-lg font-semibold">{analysis.repository.info.forks.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FaExclamationTriangle className="w-4 h-4 text-orange-500" />
          <div>
            <p className="text-sm text-gray-500">Issues</p>
            <p className="text-lg font-semibold">{analysis.repository.info.open_issues.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FaUsers className="w-4 h-4 text-purple-500" />
          <div>
            <p className="text-sm text-gray-500">Contributors</p>
            <p className="text-lg font-semibold">{analysis.contributors.count}</p>
          </div>
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`${getScoreBgColor(analysis.analysis.commitQuality.score)} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Commit Quality</h3>
            <span className={`text-2xl font-bold ${getScoreColor(analysis.analysis.commitQuality.score)}`}>
              {analysis.analysis.commitQuality.score}/100
            </span>
          </div>
          <p className="text-sm text-gray-700">{analysis.analysis.commitQuality.analysis}</p>
        </div>

        {analysis.analysis.codeQuality && (
          <div className={`${getScoreBgColor(analysis.analysis.codeQuality.score)} rounded-lg p-4`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Code Quality</h3>
              <span className={`text-2xl font-bold ${getScoreColor(analysis.analysis.codeQuality.score)}`}>
                {analysis.analysis.codeQuality.score}/100
              </span>
            </div>
            <p className="text-sm text-gray-700">{analysis.analysis.codeQuality.analysis}</p>
          </div>
        )}

        <div className={`${getScoreBgColor(analysis.analysis.projectHealth.score)} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Project Health</h3>
            <span className={`text-2xl font-bold ${getScoreColor(analysis.analysis.projectHealth.score)}`}>
              {analysis.analysis.projectHealth.score}/100
            </span>
          </div>
          <p className="text-sm text-gray-700">{analysis.analysis.projectHealth.analysis}</p>
        </div>
      </div>

      {/* Code Quality Details */}
      {analysis.analysis.codeQuality && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Code Quality Analysis</h3>
          {analysis.analysis.codeQuality.patterns && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Coding Patterns</h4>
              <p className="text-sm text-gray-700">{analysis.analysis.codeQuality.patterns}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                <FaCheckCircle className="w-4 h-4" />
                Code Strengths
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {analysis.analysis.codeQuality.strengths.map((strength, idx) => (
                  <li key={idx}>{strength}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                <FaTimesCircle className="w-4 h-4" />
                Code Concerns
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {analysis.analysis.codeQuality.concerns.map((concern, idx) => (
                  <li key={idx}>{concern}</li>
                ))}
              </ul>
            </div>
          </div>
          {analysis.analysis.codeQuality.observations.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Observations</h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {analysis.analysis.codeQuality.observations.map((obs, idx) => (
                  <li key={idx}>{obs}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Commit Quality Details */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Commit Quality Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
              <FaCheckCircle className="w-4 h-4" />
              Strengths
            </h4>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {analysis.analysis.commitQuality.strengths.map((strength, idx) => (
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
              {analysis.analysis.commitQuality.weaknesses.map((weakness, idx) => (
                <li key={idx}>{weakness}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Project Health Indicators */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Project Health Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500 mb-1">Activity</p>
            <p className="font-semibold capitalize text-gray-900">{analysis.analysis.projectHealth.indicators.activity}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500 mb-1">Maintenance</p>
            <p className="font-semibold capitalize text-gray-900">{analysis.analysis.projectHealth.indicators.maintenance}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500 mb-1">Community</p>
            <p className="font-semibold capitalize text-gray-900">{analysis.analysis.projectHealth.indicators.community}</p>
          </div>
        </div>
      </div>

      {/* Top Contributors */}
      {analysis.contributors.topContributors.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Top Contributors</h3>
          <div className="flex flex-wrap gap-3">
            {analysis.contributors.topContributors.slice(0, 5).map((contributor) => (
              <a
                key={contributor.login}
                href={contributor.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors"
              >
                <img
                  src={contributor.avatar_url}
                  alt={contributor.login}
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{contributor.login}</p>
                  <p className="text-xs text-gray-500">{contributor.contributions} contributions</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis.analysis.recommendations.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Recommendations</h3>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            {analysis.analysis.recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Overall Assessment */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Overall Assessment</h3>
        <p className="text-sm text-gray-700">{analysis.analysis.overallAssessment}</p>
      </div>

      {/* Analysis Metadata */}
      <div className="mt-4 text-xs text-gray-500">
        Analyzed {analysis.commits.totalAnalyzed} commits • {new Date(analysis.analyzedAt).toLocaleString()}
      </div>
    </div>
  )
}

