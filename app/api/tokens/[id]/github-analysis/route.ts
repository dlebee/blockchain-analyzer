import { NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'
import OpenAI from 'openai'
import Coingecko from '@coingecko/coingecko-typescript'
import { createClient } from 'redis'
import { gzipSync, gunzipSync } from 'zlib'

const CACHE_TTL_LONG = 15 * 60 // 15 minutes in seconds (for commits, contributors, repo info)
const CACHE_TTL_ANALYSIS = 15 // 15 seconds (for AI analysis - very short to allow re-querying)

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
    community_data: true,
    developer_data: true,
    market_data: true,
    tickers: true,
    localization: false,
    sparkline: false,
  })
  return response
}

function parseGitHubUrl(githubUrl: string): { owner: string; repo: string } | null {
  try {
    // Handle various GitHub URL formats:
    // https://github.com/owner/repo
    // https://github.com/owner/repo.git
    // git@github.com:owner/repo.git
    const url = new URL(githubUrl.replace('.git', '').replace('git@github.com:', 'https://github.com/'))
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length >= 2) {
      return {
        owner: parts[0],
        repo: parts[1],
      }
    }
    return null
  } catch (error) {
    console.error('Error parsing GitHub URL:', error)
    return null
  }
}

async function getTopContributors(octokit: Octokit, owner: string, repo: string) {
  try {
    // Get contributors (GitHub API returns top contributors by default)
    const { data: contributors } = await octokit.repos.listContributors({
      owner,
      repo,
      per_page: 10, // Top 10 contributors
    })
    return contributors.map((contributor) => ({
      login: contributor.login,
      contributions: contributor.contributions,
      avatar_url: contributor.avatar_url,
      html_url: contributor.html_url,
    }))
  } catch (error) {
    console.error('Error fetching contributors:', error)
    return []
  }
}

async function getCommitDetails(octokit: Octokit, owner: string, repo: string, sha: string) {
  try {
    const { data: commitDetail } = await octokit.repos.getCommit({
      owner,
      repo,
      ref: sha,
    })

    // Extract file changes summary
    const filesChanged = commitDetail.files?.map((file: any) => ({
      filename: file.filename,
      status: file.status, // added, removed, modified, renamed
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch ? file.patch.substring(0, 2000) : null, // Limit patch size to 2000 chars per file
    })) || []

    return {
      stats: {
        total: commitDetail.stats?.total || 0,
        additions: commitDetail.stats?.additions || 0,
        deletions: commitDetail.stats?.deletions || 0,
      },
      filesChanged,
    }
  } catch (error) {
    console.error(`Error fetching commit details for ${sha}:`, error)
    return null
  }
}

async function getLastCommits(octokit: Octokit, owner: string, repo: string, limit: number = 500) {
  try {
    const commits = []
    let page = 1
    const perPage = 100 // GitHub API max per page

    while (commits.length < limit) {
      const { data: pageCommits } = await octokit.repos.listCommits({
        owner,
        repo,
        per_page: perPage,
        page,
      })

      if (pageCommits.length === 0) break

      commits.push(...pageCommits)

      if (pageCommits.length < perPage) break // Last page
      if (commits.length >= limit) break

      page++
      // Rate limiting: small delay between pages
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    // Sample exactly 500 commits (or all if less than 500)
    const sampledCommits = commits.slice(0, limit).map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author?.name,
        email: commit.commit.author?.email,
        date: commit.commit.author?.date,
      },
      committer: {
        name: commit.commit.committer?.name,
        email: commit.commit.committer?.email,
        date: commit.commit.committer?.date,
      },
      url: commit.html_url,
    }))

    // Fetch commit details (content/changes) for a sample of commits
    // Limit to first 50 commits to avoid rate limits and token limits
    const commitsWithDetails = []
    const sampleSize = Math.min(50, sampledCommits.length)
    
    for (let i = 0; i < sampleSize; i++) {
      const commit = sampledCommits[i]
      const details = await getCommitDetails(octokit, owner, repo, commit.sha)
      
      commitsWithDetails.push({
        ...commit,
        details,
      })

      // Rate limiting: delay between detail fetches
      if (i < sampleSize - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
    }

    // Return commits with details for sampled ones, and just messages for the rest
    return {
      detailed: commitsWithDetails,
      summary: sampledCommits.slice(sampleSize), // Rest of commits without details
    }
  } catch (error) {
    console.error('Error fetching commits:', error)
    return { detailed: [], summary: [] }
  }
}

async function getRepositoryInfo(octokit: Octokit, owner: string, repo: string) {
  try {
    const { data: repoData } = await octokit.repos.get({
      owner,
      repo,
    })

    return {
      name: repoData.name,
      full_name: repoData.full_name,
      description: repoData.description,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      open_issues: repoData.open_issues_count,
      watchers: repoData.watchers_count,
      language: repoData.language,
      created_at: repoData.created_at,
      updated_at: repoData.updated_at,
      pushed_at: repoData.pushed_at,
      default_branch: repoData.default_branch,
      archived: repoData.archived,
      disabled: repoData.disabled,
      license: repoData.license?.name,
    }
  } catch (error) {
    console.error('Error fetching repository info:', error)
    return null
  }
}

async function analyzeWithOpenAI(commits: { detailed?: any[]; summary?: any[] }, repoInfo: any, contributors: any[]) {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  const openai = new OpenAI({
    apiKey: openaiApiKey,
  })

  // Prepare commit data for analysis
  // Combine detailed commits (with content) and summary commits (messages only)
  const allCommits = [
    ...(commits.detailed || []),
    ...(commits.summary || []),
  ]

  // Build analysis data with commit messages and content samples
  const commitAnalysisData = commits.detailed?.slice(0, 50).map((commit: any, idx: number) => {
    const files = commit.details?.filesChanged || []
    const filesSummary = files.slice(0, 10).map((file: any) => 
      `${file.filename} (${file.status}: +${file.additions}/-${file.deletions})`
    ).join(', ') || 'No changes'

    // Include patches from up to 3 files per commit (to give AI more code context)
    const patches = files.slice(0, 3)
      .filter((file: any) => file.patch)
      .map((file: any) => `File: ${file.filename}\n${file.patch}`)
      .join('\n\n---\n\n')

    return `Commit ${idx + 1}:
Message: ${commit.message}
Stats: +${commit.details?.stats?.additions || 0}/-${commit.details?.stats?.deletions || 0} (${commit.details?.stats?.total || 0} total changes)
Files Changed: ${filesSummary}
${patches ? `\nCode Changes:\n${patches}` : ''}`
  }).join('\n\n' + '='.repeat(80) + '\n\n') || ''

  const commitMessages = allCommits.map((c: any) => c.message).join('\n---\n')

  const prompt = `You are an expert software engineer evaluating the health and quality of an open-source project based on GitHub data.

Repository Information:
- Name: ${repoInfo?.full_name || 'Unknown'}
- Stars: ${repoInfo?.stars || 0}
- Forks: ${repoInfo?.forks || 0}
- Open Issues: ${repoInfo?.open_issues || 0}
- Language: ${repoInfo?.language || 'Unknown'}
- Created: ${repoInfo?.created_at || 'Unknown'}
- Last Updated: ${repoInfo?.updated_at || 'Unknown'}
- Last Pushed: ${repoInfo?.pushed_at || 'Unknown'}
- License: ${repoInfo?.license || 'None'}
- Archived: ${repoInfo?.archived ? 'Yes' : 'No'}

Top Contributors (${contributors.length}):
${contributors.map((c, i) => `${i + 1}. ${c.login} (${c.contributions} contributions)`).join('\n')}

Last ${allCommits.length} Commits Analysis:

Commit Messages (all ${allCommits.length} commits):
${commitMessages}

Detailed Commit Content (sample of ${commits.detailed?.length || 0} commits with code changes):
${commitAnalysisData}

Note: The detailed analysis includes actual code changes (patches/diffs) from up to 3 files per commit, showing additions, deletions, and modifications. This allows you to evaluate code quality, coding patterns, and development practices.

Please analyze this project and provide:
1. **Commit Quality Assessment**: Evaluate the quality of commit messages (clarity, descriptiveness, adherence to best practices)
2. **Code Quality Analysis**: CRITICALLY IMPORTANT - Analyze the actual CODE CONTENT from the commit patches/diffs provided above. Evaluate:
   - Code quality and best practices
   - Code patterns and architecture
   - Bug fixes vs features
   - Test coverage (if tests are present)
   - Code complexity and maintainability
   - Security concerns or code smells
   - Consistency in coding style
   - Technical debt indicators
3. **Blockchain Framework Detection**: Analyze the codebase to determine:
   - What blockchain framework is being used (e.g., Substrate, Cosmos SDK/Tendermint, Ethereum/EVM, Solana, Polkadot, Avalanche, Polygon, etc.)
   - If no common framework is detected, indicate "Custom" or "Unknown"
   - Provide evidence from code patterns, dependencies, file structures, or commit messages
4. **EVM Compatibility**: Determine if this blockchain is EVM (Ethereum Virtual Machine) compatible:
   - Look for EVM-related code, Solidity contracts, EVM opcodes, or Ethereum compatibility layers
   - Check for references to EVM, Ethereum, or compatibility layers in code
   - Answer: true/false with confidence level and evidence
5. **Layer 2 Detection**: Determine if this is a Layer 2 (L2) solution:
   - Look for L2-specific patterns: rollups (optimistic or zk-rollups), state channels, plasma, sidechains
   - Check for references to L1 (Layer 1) chains, bridges, sequencers, validators, or settlement layers
   - Look for mentions of Optimism, Arbitrum, Polygon, Base, zkSync, Scroll, or other L2 technologies
   - Answer: true/false with confidence level and evidence
6. **Project Health Score** (0-100): Based on activity, maintenance, community engagement, AND code quality
7. **Maintenance Status**: Is the project actively maintained? Any red flags?
8. **Community Health**: How healthy is the contributor community?
9. **Overall Assessment**: Summary of project health and recommendations

Format your response as JSON with the following structure:
{
  "commitQuality": {
    "score": 0-100,
    "analysis": "detailed analysis of commit messages",
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"]
  },
  "codeQuality": {
    "score": 0-100,
    "analysis": "detailed analysis of the actual CODE CONTENT from commits - analyze the patches/diffs provided",
    "observations": ["observation1 about code patterns", "observation2 about code quality"],
    "strengths": ["code strength1", "code strength2"],
    "concerns": ["code concern1", "code concern2"],
    "patterns": "description of coding patterns observed"
  },
  "blockchainInfo": {
    "framework": "Substrate/Cosmos SDK/EVM/Custom/Unknown/etc",
    "frameworkConfidence": "high/medium/low",
    "frameworkEvidence": "evidence from code, dependencies, or structure that supports this determination",
    "isEVMCompatible": true/false,
    "evmCompatibilityConfidence": "high/medium/low",
    "evmCompatibilityEvidence": "evidence from code that indicates EVM compatibility or lack thereof",
    "isL2": true/false,
    "l2Confidence": "high/medium/low",
    "l2Type": "optimistic-rollup/zk-rollup/plasma/sidechain/state-channel/none/unknown",
    "l2Evidence": "evidence from code that indicates L2 characteristics or lack thereof"
  },
  "projectHealth": {
    "score": 0-100,
    "analysis": "detailed analysis",
    "indicators": {
      "activity": "high/medium/low",
      "maintenance": "active/stale/archived",
      "community": "healthy/moderate/weak"
    }
  },
  "recommendations": ["recommendation1", "recommendation2"],
  "overallAssessment": "comprehensive summary that includes code quality insights and blockchain characteristics"
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using mini for cost efficiency, can be changed to gpt-4 for better analysis
      messages: [
        {
          role: 'system',
          content:
            'You are an expert software engineer, open-source project analyst, and blockchain technology specialist. You MUST analyze the actual CODE CONTENT from the commit patches/diffs provided. Look at the code changes, patterns, quality, and practices. Additionally, you MUST analyze the codebase to detect blockchain frameworks (Substrate, Cosmos SDK, EVM, Solana, etc.), EVM compatibility, and Layer 2 characteristics. Examine code patterns, dependencies, file structures, and commit messages for evidence. Provide detailed, accurate assessments in JSON format.',
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

    // Check for GitHub token
    const githubToken = process.env.GITHUB_TOKEN
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GITHUB_TOKEN environment variable is not set' },
        { status: 500 }
      )
    }

    // Check if repo parameter is provided (for organization repo selection)
    const { searchParams } = new URL(request.url)
    const repoParam = searchParams.get('repo')

    let githubUrl: string
    let repoInfo: { owner: string; repo: string } | null

    if (repoParam) {
      // Use the provided repo parameter (format: owner/repo)
      const [owner, repo] = repoParam.split('/')
      if (!owner || !repo) {
        return NextResponse.json(
          { error: 'Invalid repo parameter format. Expected: owner/repo' },
          { status: 400 }
        )
      }
      githubUrl = `https://github.com/${repoParam}`
      repoInfo = { owner, repo }
    } else {
      // Get token details from CoinGecko to find GitHub URL
      const tokenDetails = await getTokenDetailsFromCoinGecko(tokenId)
      const githubUrls = tokenDetails.links?.repos_url?.github || []

      if (githubUrls.length === 0) {
        return NextResponse.json(
          { error: 'No GitHub repository found for this token' },
          { status: 404 }
        )
      }

      // Use the first GitHub URL
      githubUrl = githubUrls[0]
      repoInfo = parseGitHubUrl(githubUrl)
    }

    if (!repoInfo) {
      return NextResponse.json(
        { error: 'Invalid GitHub URL format' },
        { status: 400 }
      )
    }

    // Initialize cache keys
    const redis = await getRedisClient()
    const cachePrefix = `tokens:github:${tokenId}:${repoInfo.owner}/${repoInfo.repo}`
    const contributorsCacheKey = `${cachePrefix}:contributors`
    const repoInfoCacheKey = `${cachePrefix}:repo-info`
    const commitsCacheKey = `${cachePrefix}:commits`
    const analysisCacheKey = `${cachePrefix}:analysis`

    // Initialize GitHub client
    const octokit = new Octokit({
      auth: githubToken,
    })

    // Try to load from cache individually
    let cachedContributors = null
    let cachedRepoInfo = null
    let cachedCommits = null
    let cachedAnalysis = null

    try {
      // Load contributors
      const cachedContributorsData = await redis.get(contributorsCacheKey)
      if (cachedContributorsData) {
        cachedContributors = JSON.parse(cachedContributorsData)
        console.log(`Cache hit: contributors (${cachedContributors.length} contributors)`)
      }

      // Load repo info
      const cachedRepoInfoData = await redis.get(repoInfoCacheKey)
      if (cachedRepoInfoData) {
        cachedRepoInfo = JSON.parse(cachedRepoInfoData)
        console.log(`Cache hit: repository info`)
      }

      // Load commits (compressed)
      const cachedCommitsCompressed = await redis.get(commitsCacheKey)
      if (cachedCommitsCompressed) {
        try {
          const compressedBuffer = Buffer.from(cachedCommitsCompressed, 'base64')
          const decompressed = gunzipSync(compressedBuffer)
          cachedCommits = JSON.parse(decompressed.toString('utf-8'))
          const totalCommits = (cachedCommits.detailed?.length || 0) + (cachedCommits.summary?.length || 0)
          console.log(`Cache hit: commits (${totalCommits} commits, ${cachedCommits.detailed?.length || 0} with details)`)
        } catch (decompressError) {
          console.error('Error decompressing commits:', decompressError)
          cachedCommits = null
        }
      }

      // Load analysis
      const cachedAnalysisData = await redis.get(analysisCacheKey)
      if (cachedAnalysisData) {
        cachedAnalysis = JSON.parse(cachedAnalysisData)
        console.log(`Cache hit: analysis`)
      }
    } catch (error) {
      console.error('Redis get error:', error)
    }

    // Fetch only what's missing
    let contributors = cachedContributors
    let repoData = cachedRepoInfo
    let commits = cachedCommits

    const fetchPromises = []

    if (!contributors) {
      console.log('Cache miss: fetching contributors')
      fetchPromises.push(
        getTopContributors(octokit, repoInfo.owner, repoInfo.repo).then((data) => {
          contributors = data
          // Cache contributors
          redis.setEx(contributorsCacheKey, CACHE_TTL_LONG, JSON.stringify(data)).catch(console.error)
        })
      )
    }

    if (!repoData) {
      console.log('Cache miss: fetching repository info')
      fetchPromises.push(
        getRepositoryInfo(octokit, repoInfo.owner, repoInfo.repo).then((data) => {
          repoData = data
          // Cache repo info (long term)
          if (data) {
            redis.setEx(repoInfoCacheKey, CACHE_TTL_LONG, JSON.stringify(data)).catch(console.error)
          }
        })
      )
    }

    if (!commits) {
      console.log('Cache miss: fetching commits')
      fetchPromises.push(
        getLastCommits(octokit, repoInfo.owner, repoInfo.repo, 500).then((data) => {
          commits = data
          // Cache commits compressed
          try {
            const commitsJson = JSON.stringify(data)
            const compressed = gzipSync(Buffer.from(commitsJson, 'utf-8'))
            const compressedBase64 = compressed.toString('base64')
            redis.setEx(commitsCacheKey, CACHE_TTL_LONG, compressedBase64).then(() => {
              const originalSize = Buffer.byteLength(commitsJson, 'utf-8')
              const compressedSize = Buffer.byteLength(compressedBase64, 'utf-8')
              const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1)
              console.log(`Cached commits: ${originalSize} bytes -> ${compressedSize} bytes (${compressionRatio}% compression)`)
            }).catch(console.error)
          } catch (error) {
            console.error('Redis set error for commits:', error)
          }
        })
      )
    }

    // Wait for all fetches to complete
    await Promise.all(fetchPromises)

    // Validate we have commits
    if (!commits || ((commits.detailed?.length || 0) + (commits.summary?.length || 0) === 0)) {
      await redis.quit()
      return NextResponse.json(
        { error: 'No commits found or repository is private/inaccessible' },
        { status: 404 }
      )
    }

    // Check if we need to run analysis (only if we don't have cached analysis OR if commits/repo/contributors changed)
    let analysis = cachedAnalysis
    const needsAnalysis = !analysis || !contributors || !repoData

    if (needsAnalysis) {
      console.log('Cache miss: running OpenAI analysis')
      analysis = await analyzeWithOpenAI(commits, repoData, contributors)
      // Cache analysis (short term - 15 seconds)
      try {
        await redis.setEx(analysisCacheKey, CACHE_TTL_ANALYSIS, JSON.stringify(analysis))
        console.log(`Cached analysis result (TTL: ${CACHE_TTL_ANALYSIS}s / 15 seconds)`)
        console.log(`Cached GitHub data (commits, contributors, repo info) with TTL: ${CACHE_TTL_LONG}s / 15 minutes`)
      } catch (error) {
        console.error('Redis set error for analysis:', error)
      }
    } else {
      console.log('Using cached analysis')
    }

    const result = {
      repository: {
        url: githubUrl,
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        info: repoData,
      },
      contributors: {
        count: contributors.length,
        topContributors: contributors,
      },
      commits: {
        totalAnalyzed: (commits.detailed?.length || 0) + (commits.summary?.length || 0),
        detailedCount: commits.detailed?.length || 0,
        summaryCount: commits.summary?.length || 0,
        sample: commits.detailed?.slice(0, 10) || [], // Return first 10 detailed commits for reference
      },
      analysis,
      analyzedAt: new Date().toISOString(),
    }

    await redis.quit()

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in GitHub analysis:', error)
    return NextResponse.json(
      {
        error: 'Failed to analyze GitHub repository',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

