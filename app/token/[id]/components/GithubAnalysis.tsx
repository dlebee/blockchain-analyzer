'use client'

import { useState, useEffect } from 'react'
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
  contributorRetention?: {
    score: number
    analysis: string
    topContributorsStatus: Array<{
      login: string
      status: string
      currentRepoCommits: number
      otherReposCommits: number
      assessment: string
    }>
    concerns: string[]
    strengths: string[]
  }
  blockchainInfo?: {
    framework: string
    frameworkConfidence: string
    frameworkEvidence: string
    isEVMCompatible: boolean
    evmCompatibilityConfidence: string
    evmCompatibilityEvidence: string
    isL2: boolean
    l2Confidence: string
    l2Type: string
    l2Evidence: string
  }
  projectHealth: {
    score: number
    analysis: string
    indicators: {
      activity: string
      maintenance: string
      community: string
      contributorRetention?: string
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
      activity?: {
        totalCommitsLast3Months: number
        repoActivity: Array<{ repo: string; commits: number; org: string }>
        orgCommits: { [org: string]: number }
        sameOrgCommits: number
        gluwaCommits: number
        isActive: boolean
      }
    }>
  }
  commits: {
    totalAnalyzed: number
  }
  analysis: Analysis
  analyzedAt: string
}

function parseGitHubUrl(url: string): { type: 'org' | 'repo'; org?: string; owner?: string; repo?: string } | null {
  try {
    const urlObj = new URL(url.replace('.git', ''))
    const parts = urlObj.pathname.split('/').filter(Boolean)
    
    if (parts.length >= 2) {
      return {
        type: 'repo',
        owner: parts[0],
        repo: parts[1],
      }
    } else if (parts.length === 1) {
      return {
        type: 'org',
        org: parts[0],
      }
    }
    return null
  } catch (error) {
    return null
  }
}

export default function GithubAnalysis({ tokenId, githubUrl }: GithubAnalysisProps) {
  const [analysis, setAnalysis] = useState<GithubAnalysisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [repositories, setRepositories] = useState<Array<{ name: string; full_name: string; url: string; description?: string; stars: number }>>([])
  const [selectedRepo, setSelectedRepo] = useState<string>('')
  const [loadingRepos, setLoadingRepos] = useState(false)

  useEffect(() => {
    async function fetchRepositories() {
      if (!githubUrl) return

      const parsed = parseGitHubUrl(githubUrl)
      let orgName: string | undefined
      let initialRepo: string | undefined

      if (parsed?.type === 'org' && parsed.org) {
        // Organization URL
        orgName = parsed.org
      } else if (parsed?.type === 'repo' && parsed.owner && parsed.repo) {
        // Repository URL - extract org from owner
        orgName = parsed.owner
        initialRepo = `${parsed.owner}/${parsed.repo}`
      }

      if (orgName) {
        try {
          setLoadingRepos(true)
          const response = await fetch(`/api/github/org/${orgName}/repos`)
          if (response.ok) {
            const data = await response.json()
            setRepositories(data.repositories || [])
            // Pre-select the initial repo if it was a specific repository URL
            if (initialRepo) {
              setSelectedRepo(initialRepo)
            }
          } else {
            // Fallback: if org fetch fails, just use the single repo
            if (initialRepo && parsed?.type === 'repo' && parsed.repo) {
              setRepositories([{
                name: parsed.repo,
                full_name: initialRepo,
                url: githubUrl,
                stars: 0,
              }])
              setSelectedRepo(initialRepo)
            }
          }
        } catch (err) {
          console.error('Error fetching repositories:', err)
          // Fallback: if org fetch fails, just use the single repo
          if (initialRepo && parsed?.type === 'repo' && parsed.repo) {
            setRepositories([{
              name: parsed.repo,
              full_name: initialRepo,
              url: githubUrl,
              stars: 0,
            }])
            setSelectedRepo(initialRepo)
          }
        } finally {
          setLoadingRepos(false)
        }
      }
    }

    fetchRepositories()
  }, [githubUrl])

  async function fetchAnalysis() {
    if (!githubUrl || !selectedRepo) return

    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/tokens/${tokenId}/github-analysis?repo=${encodeURIComponent(selectedRepo)}`)
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
        
        {loadingRepos ? (
          <div className="text-gray-500 mb-4">Loading repositories...</div>
        ) : repositories.length > 0 ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Repository to Analyze:
            </label>
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            >
              <option value="">-- Select a repository --</option>
              {repositories.map((repo) => (
                <option key={repo.full_name} value={repo.full_name}>
                  {repo.full_name} {repo.stars > 0 && `⭐ ${repo.stars}`} {repo.description && `- ${repo.description.substring(0, 50)}`}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <button
          onClick={fetchAnalysis}
          disabled={!selectedRepo}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
        
        {repositories.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Repository to Analyze:
            </label>
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            >
              <option value="">-- Select a repository --</option>
              {repositories.map((repo) => (
                <option key={repo.full_name} value={repo.full_name}>
                  {repo.full_name} {repo.stars > 0 && `⭐ ${repo.stars}`} {repo.description && `- ${repo.description.substring(0, 50)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={fetchAnalysis}
          disabled={!selectedRepo}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

  // TypeScript guard: analysis is guaranteed to be non-null here
  if (!analysis) return null
  const analysisData = analysis

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <FaGithub className="w-5 h-5" />
          GitHub Analysis
        </h2>
        <a
          href={analysisData.repository.url}
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
            <p className="text-lg font-semibold">{analysisData.repository.info.stars.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FaCodeBranch className="w-4 h-4 text-blue-500" />
          <div>
            <p className="text-sm text-gray-500">Forks</p>
            <p className="text-lg font-semibold">{analysisData.repository.info.forks.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FaExclamationTriangle className="w-4 h-4 text-orange-500" />
          <div>
            <p className="text-sm text-gray-500">Issues</p>
            <p className="text-lg font-semibold">{analysisData.repository.info.open_issues.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FaUsers className="w-4 h-4 text-purple-500" />
          <div>
            <p className="text-sm text-gray-500">Contributors</p>
            <p className="text-lg font-semibold">{analysisData.contributors.count}</p>
          </div>
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`${getScoreBgColor(analysisData.analysis.commitQuality.score)} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Commit Quality</h3>
            <span className={`text-2xl font-bold ${getScoreColor(analysisData.analysis.commitQuality.score)}`}>
              {analysisData.analysis.commitQuality.score}/100
            </span>
          </div>
          <p className="text-sm text-gray-700">{analysisData.analysis.commitQuality.analysis}</p>
        </div>

        {analysisData.analysis.codeQuality && (
          <div className={`${getScoreBgColor(analysisData.analysis.codeQuality.score)} rounded-lg p-4`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Code Quality</h3>
              <span className={`text-2xl font-bold ${getScoreColor(analysisData.analysis.codeQuality.score)}`}>
                {analysisData.analysis.codeQuality.score}/100
              </span>
            </div>
            <p className="text-sm text-gray-700">{analysisData.analysis.codeQuality.analysis}</p>
          </div>
        )}

        <div className={`${getScoreBgColor(analysisData.analysis.projectHealth.score)} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Project Health</h3>
            <span className={`text-2xl font-bold ${getScoreColor(analysisData.analysis.projectHealth.score)}`}>
              {analysisData.analysis.projectHealth.score}/100
            </span>
          </div>
          <p className="text-sm text-gray-700">{analysisData.analysis.projectHealth.analysis}</p>
        </div>
      </div>

      {/* Blockchain Information */}
      {analysisData.analysis.blockchainInfo && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Blockchain Characteristics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Framework</h4>
              <p className="text-lg font-semibold text-gray-900">{analysisData.analysis.blockchainInfo.framework}</p>
              <p className="text-xs text-gray-600 mt-1">
                Confidence: <span className="capitalize">{analysisData.analysis.blockchainInfo.frameworkConfidence}</span>
              </p>
              {analysisData.analysis.blockchainInfo.frameworkEvidence && (
                <p className="text-xs text-gray-700 mt-2">{analysisData.analysis.blockchainInfo.frameworkEvidence}</p>
              )}
            </div>
            <div className={`rounded-lg p-4 ${analysisData.analysis.blockchainInfo.isEVMCompatible ? 'bg-green-50' : 'bg-gray-50'}`}>
              <h4 className="text-sm font-medium mb-2">
                <span className={analysisData.analysis.blockchainInfo.isEVMCompatible ? 'text-green-900' : 'text-gray-900'}>
                  EVM Compatible
                </span>
              </h4>
              <p className={`text-lg font-semibold ${analysisData.analysis.blockchainInfo.isEVMCompatible ? 'text-green-700' : 'text-gray-700'}`}>
                {analysisData.analysis.blockchainInfo.isEVMCompatible ? 'Yes' : 'No'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Confidence: <span className="capitalize">{analysisData.analysis.blockchainInfo.evmCompatibilityConfidence}</span>
              </p>
              {analysisData.analysis.blockchainInfo.evmCompatibilityEvidence && (
                <p className="text-xs text-gray-700 mt-2">{analysisData.analysis.blockchainInfo.evmCompatibilityEvidence}</p>
              )}
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-purple-900 mb-2">Layer 2 Status</h4>
            <div className="flex items-center gap-3 mb-2">
              <p className={`text-lg font-semibold ${analysisData.analysis.blockchainInfo.isL2 ? 'text-purple-700' : 'text-gray-700'}`}>
                {analysisData.analysis.blockchainInfo.isL2 ? 'Yes' : 'No'}
              </p>
              {analysisData.analysis.blockchainInfo.isL2 && analysisData.analysis.blockchainInfo.l2Type !== 'none' && analysisData.analysis.blockchainInfo.l2Type !== 'unknown' && (
                <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded text-xs font-medium capitalize">
                  {analysisData.analysis.blockchainInfo.l2Type.replace('-', ' ')}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mb-2">
              Confidence: <span className="capitalize">{analysisData.analysis.blockchainInfo.l2Confidence}</span>
            </p>
            {analysisData.analysis.blockchainInfo.l2Evidence && (
              <p className="text-xs text-gray-700">{analysisData.analysis.blockchainInfo.l2Evidence}</p>
            )}
          </div>
        </div>
      )}

      {/* Code Quality Details */}
      {analysisData.analysis.codeQuality && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Code Quality Analysis</h3>
          {analysisData.analysis.codeQuality.patterns && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Coding Patterns</h4>
              <p className="text-sm text-gray-700">{analysisData.analysis.codeQuality.patterns}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                <FaCheckCircle className="w-4 h-4" />
                Code Strengths
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {analysisData.analysis.codeQuality.strengths.map((strength, idx) => (
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
                {analysisData.analysis.codeQuality.concerns.map((concern, idx) => (
                  <li key={idx}>{concern}</li>
                ))}
              </ul>
            </div>
          </div>
          {analysisData.analysis.codeQuality.observations.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Observations</h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {analysisData.analysis.codeQuality.observations.map((obs, idx) => (
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
              {analysisData.analysis.commitQuality.strengths.map((strength, idx) => (
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
              {analysisData.analysis.commitQuality.weaknesses.map((weakness, idx) => (
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
            <p className="font-semibold capitalize text-gray-900">{analysisData.analysis.projectHealth.indicators.activity}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500 mb-1">Maintenance</p>
            <p className="font-semibold capitalize text-gray-900">{analysisData.analysis.projectHealth.indicators.maintenance}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500 mb-1">Community</p>
            <p className="font-semibold capitalize text-gray-900">{analysisData.analysis.projectHealth.indicators.community}</p>
          </div>
        </div>
      </div>

      {/* Contributor Retention Analysis */}
      {analysisData.analysis.contributorRetention && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FaUsers className="w-5 h-5" />
            Contributor Retention Analysis
          </h3>
          <div className={`${getScoreBgColor(analysisData.analysis.contributorRetention.score)} rounded-lg p-4 mb-4`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Retention Score</h4>
              <span className={`text-2xl font-bold ${getScoreColor(analysisData.analysis.contributorRetention.score)}`}>
                {analysisData.analysis.contributorRetention.score}/100
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-3">{analysisData.analysis.contributorRetention.analysis}</p>
            
            {analysisData.analysis.contributorRetention.topContributorsStatus.length > 0 && (
              <div className="mt-4 space-y-3">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Top Contributors Status (90 days)</h5>
                {analysisData.analysis.contributorRetention.topContributorsStatus.map((contributor, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg ${
                      contributor.status === 'moving_away'
                        ? 'bg-yellow-50 border border-yellow-200'
                        : contributor.status === 'active'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{contributor.login}</span>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          contributor.status === 'moving_away'
                            ? 'bg-yellow-200 text-yellow-800'
                            : contributor.status === 'active'
                            ? 'bg-green-200 text-green-800'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {contributor.status === 'moving_away' ? '⚠️ Moving Away' : contributor.status === 'active' ? '✅ Active' : '⏸️ Inactive'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Current repo: {contributor.currentRepoCommits} commits • Other repos: {contributor.otherReposCommits} commits
                    </div>
                    <p className="text-xs text-gray-700 mt-1">{contributor.assessment}</p>
                  </div>
                ))}
              </div>
            )}

            {analysisData.analysis.contributorRetention.strengths.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                  <FaCheckCircle className="w-4 h-4" />
                  Strengths
                </h5>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {analysisData.analysis.contributorRetention.strengths.map((strength, idx) => (
                    <li key={idx}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysisData.analysis.contributorRetention.concerns.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                  <FaExclamationTriangle className="w-4 h-4" />
                  Concerns
                </h5>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {analysisData.analysis.contributorRetention.concerns.map((concern, idx) => (
                    <li key={idx}>{concern}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Contributors */}
      {analysisData.contributors.topContributors.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Top Contributors</h3>
          <div className="flex flex-wrap gap-3">
            {analysisData.contributors.topContributors.slice(0, 5).map((contributor) => {
              const activity = (contributor as any).activity
              const isActive = activity?.isActive === true
              const threeMonthCommits = activity ? activity.totalCommitsLast3Months : 0
              
              return (
                <a
                  key={contributor.login}
                  href={contributor.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg p-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <img
                    src={contributor.avatar_url}
                    alt={contributor.login}
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{contributor.login}</p>
                      {activity ? (
                        isActive ? (
                          <FaCheckCircle className="w-4 h-4 text-green-600" title="Active: 10+ commits in last 3 months" />
                        ) : (
                          <FaTimesCircle className="w-4 h-4 text-red-600" title="Inactive: Less than 10 commits in last 3 months" />
                        )
                      ) : null}
                    </div>
                    <p className="text-xs text-gray-500">
                      {contributor.contributions} total contributions
                    </p>
                    {activity && (
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <p>{threeMonthCommits} commits (last 3 months)</p>
                        {activity.sameOrgCommits > 0 && (
                          <p className="text-gray-600">Same org: {activity.sameOrgCommits} commits</p>
                        )}
                        {activity.gluwaCommits > 0 && (
                          <p className="text-gray-600">Gluwa: {activity.gluwaCommits} commits</p>
                        )}
                      </div>
                    )}
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysisData.analysis.recommendations.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Recommendations</h3>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            {analysisData.analysis.recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Overall Assessment */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Overall Assessment</h3>
        <p className="text-sm text-gray-700">{analysisData.analysis.overallAssessment}</p>
      </div>

      {/* Analysis Metadata */}
      <div className="mt-4 text-xs text-gray-500">
        Analyzed {analysisData.commits.totalAnalyzed} commits • {new Date(analysisData.analyzedAt).toLocaleString()}
      </div>
    </div>
  )
}

