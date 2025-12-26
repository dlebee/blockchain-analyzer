import { NextResponse } from 'next/server'
import { getAllExchangesWithCache, Exchange } from './utils'

export async function GET(request: Request) {
  try {
    // Use shared function to get all exchanges (with caching)
    const exchanges = await getAllExchangesWithCache()
    
    const result = {
      total: exchanges.length,
      cex: exchanges.filter(e => e.centralized).length,
      dex: exchanges.filter(e => !e.centralized).length,
      exchanges,
      fetchedAt: new Date().toISOString(),
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching exchanges:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch exchanges',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

