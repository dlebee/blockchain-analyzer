import { NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'
import { createClient } from 'redis'

const CACHE_TTL = 15 * 60 // 15 minutes in seconds

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ org: string }> }
) {
  try {
    const resolvedParams = await params
    const orgName = resolvedParams.org

    if (!orgName) {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 })
    }

    const githubToken = process.env.GITHUB_TOKEN
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GITHUB_TOKEN environment variable is not set' },
        { status: 500 }
      )
    }

    const redis = await getRedisClient()
    const cacheKey = `github:org:${orgName}:repos`

    // Try to get from cache
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return NextResponse.json(JSON.parse(cached))
      }
    } catch (error) {
      console.error('Redis get error:', error)
    }

    const octokit = new Octokit({
      auth: githubToken,
    })

    // Fetch all repositories for the organization
    const repos: any[] = []
    let page = 1
    const perPage = 100

    while (true) {
      try {
        const { data: pageRepos } = await octokit.repos.listForOrg({
          org: orgName,
          per_page: perPage,
          page,
          sort: 'updated',
          type: 'all',
        })

        if (pageRepos.length === 0) break

        repos.push(...pageRepos.map((repo) => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          url: repo.html_url,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          archived: repo.archived,
          disabled: repo.disabled,
          private: repo.private,
          updated_at: repo.updated_at,
        })))

        if (pageRepos.length < perPage) break
        page++

        // Rate limiting: small delay between pages
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error: any) {
        if (error.status === 404) {
          await redis.quit()
          return NextResponse.json(
            { error: 'Organization not found' },
            { status: 404 }
          )
        }
        throw error
      }
    }

    const result = {
      organization: orgName,
      repositories: repos,
      count: repos.length,
    }

    // Cache the result
    try {
      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(result))
    } catch (error) {
      console.error('Redis set error:', error)
    } finally {
      await redis.quit()
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching organization repositories:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch organization repositories',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

