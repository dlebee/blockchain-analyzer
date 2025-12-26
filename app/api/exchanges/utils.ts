import Coingecko from '@coingecko/coingecko-typescript'
import { createClient } from 'redis'

// Comprehensive DEX keywords - if exchange name/ID contains any of these, it's a DEX
export const DEX_KEYWORDS = [
  // Core DEX terms
  'dex',
  'swap',
  'uniswap',
  'pancakeswap',
  'sushiswap',
  'curve',
  'balancer',
  '1inch',
  'dodo',
  'kyberswap',
  'raydium',
  'orca',
  'serum',
  'jupiter',
  'cowswap',
  'matcha',
  'paraswap',
  'airswap',
  'bancor',
  'idex',
  'oasis',
  'augur',
  'gnosis',
  'radar',
  'etherdelta',
  'forkdelta',
  'traderjoe',
  'trader joe',
  'pangolin',
  'spookyswap',
  'spiritswap',
  'quickswap',
  'solarbeam',
  'beamswap',
  'stellaswap',
  'honeyswap',
  'levinswap',
  'ubeswap',
  'mobius',
  'elk',
  'shibaswap',
  'apeswap',
  'biswap',
  'babyswap',
  'mdex',
  'mooniswap',
  'swopfi',
  'defiswap',
  'fluid',
  'dexalot',
  'venus',
  'compound',
  'aave',
  'synthetix',
  // Protocol names
  '0x',
  'protocol',
  // Network-specific DEX patterns
  'v2',
  'v3',
  'v4',
  'abstract',
]

// Known CEX exchanges to exclude (even if they contain DEX keywords)
export const knownCEX = [
  'binance', 'coinbase', 'kraken', 'bitfinex', 'bitstamp', 'gemini',
  'okx', 'okex', 'huobi', 'kucoin', 'bybit', 'gate', 'mexc', 'bitget',
  'crypto.com', 'cryptocom', 'ftx', 'ftx.us', 'coinbase pro', 'coinbasepro',
  'bitmex', 'deribit', 'bitflyer', 'upbit', 'bithumb',
  'poloniex', 'bittrex', 'bitmart', 'lbank', 'hotbit', 'bibox', 'probit',
  'bitrue', 'coinex', 'whitebit', 'bitforex', 'zb.com', 'zb', 'digifinex',
]

export interface Exchange {
  id: string
  name: string
  centralized: boolean
  country?: string
  trust_score?: number
  trade_volume_24h_btc?: number
  year_established?: number
  image?: string
  url?: string
}

/**
 * Classify exchange as CEX or DEX using keyword matching
 * @param id Exchange identifier
 * @param name Exchange name
 * @param apiCentralized Centralized value from API (optional, used as fallback)
 * @returns true if CEX, false if DEX
 */
export function classifyExchange(id: string, name: string, apiCentralized?: boolean): boolean {
  const normalizedId = id.toLowerCase()
  const normalizedName = name.toLowerCase()
  
  // First check if it's a known CEX (exclude these)
  const isKnownCEX = knownCEX.some(cex => {
    const normalizedCex = cex.toLowerCase()
    return normalizedId === normalizedCex || 
           normalizedName === normalizedCex ||
           normalizedId.includes(normalizedCex) ||
           normalizedName.includes(normalizedCex)
  })
  
  if (isKnownCEX) {
    return true // CEX
  }
  
  // Check if exchange ID or name contains any DEX keyword
  const containsDEXKeyword = DEX_KEYWORDS.some((keyword: string) => {
    const normalizedKeyword = keyword.toLowerCase()
    return normalizedId.includes(normalizedKeyword) || 
           normalizedName.includes(normalizedKeyword)
  })
  
  if (containsDEXKeyword) {
    return false // DEX
  }
  
  // Use API's centralized field as fallback, default to CEX
  return apiCentralized ?? true
}

/**
 * Get Redis client
 */
export async function getRedisClient() {
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

/**
 * Fetch all exchanges from CoinGecko API
 */
export async function fetchAllExchanges(): Promise<Exchange[]> {
  const client = new Coingecko({
    environment: 'demo',
    defaultHeaders: {
      'x-cg-pro-api-key': null,
    },
  })

  console.log('Fetching all exchanges from CoinGecko /exchanges endpoint...')
  
  const exchanges: Exchange[] = []
  let page = 1
  const perPage = 250 // Max per page
  
  while (true) {
    try {
      const response = await client.exchanges.get({
        page,
        per_page: perPage,
      })
      
      // Handle both array and single object responses
      const pageExchanges = Array.isArray(response) ? response : [response]
      
      if (pageExchanges.length === 0) break
      
      pageExchanges.forEach((exchange: any) => {
        if (exchange.id) {
          const exchangeName = exchange.name || exchange.id
          // Classify using keyword matching (takes precedence over API field)
          const isCentralized = classifyExchange(exchange.id, exchangeName, exchange.centralized)
          
          exchanges.push({
            id: exchange.id,
            name: exchangeName,
            centralized: isCentralized,
            country: exchange.country,
            trust_score: exchange.trust_score,
            trade_volume_24h_btc: exchange.trade_volume_24h_btc,
            year_established: exchange.year_established,
            image: exchange.image,
            url: exchange.url,
          })
        }
      })
      
      console.log(`Fetched page ${page}: ${pageExchanges.length} exchanges (total: ${exchanges.length})`)
      
      if (pageExchanges.length < perPage) break // Last page
      page++
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (error) {
      console.error(`Error fetching exchanges page ${page}:`, error)
      break
    }
  }
  
  console.log(`Fetched ${exchanges.length} total exchanges`)
  
  // Deduplicate by ID (in case API returns duplicates)
  const uniqueExchanges = new Map<string, Exchange>()
  exchanges.forEach(exchange => {
    if (!uniqueExchanges.has(exchange.id)) {
      uniqueExchanges.set(exchange.id, exchange)
    } else {
      console.log(`Warning: Duplicate exchange ID found: ${exchange.id}`)
    }
  })
  
  const deduplicatedExchanges = Array.from(uniqueExchanges.values())
  if (deduplicatedExchanges.length !== exchanges.length) {
    console.log(`Deduplicated: ${exchanges.length} -> ${deduplicatedExchanges.length} exchanges`)
  }
  
  return deduplicatedExchanges
}

/**
 * Get all exchanges with caching
 */
export async function getAllExchangesWithCache(): Promise<Exchange[]> {
  const redis = await getRedisClient()
  const cacheKey = 'exchanges:all'
  const CACHE_TTL = 24 * 60 * 60 // 24 hours in seconds
  
  try {
    // Try to get from cache
    const cached = await redis.get(cacheKey)
    if (cached) {
      console.log('Cache hit: all exchanges')
      const cachedData = JSON.parse(cached)
      
      // Deduplicate cached data (in case cache has duplicates)
      const uniqueExchanges = new Map<string, Exchange>()
      cachedData.forEach((exchange: Exchange) => {
        if (!uniqueExchanges.has(exchange.id)) {
          uniqueExchanges.set(exchange.id, exchange)
        }
      })
      
      // Re-classify exchanges using keywords (in case classification logic changed)
      const reclassifiedExchanges = Array.from(uniqueExchanges.values()).map((exchange: Exchange) => ({
        ...exchange,
        centralized: classifyExchange(exchange.id, exchange.name, exchange.centralized)
      }))
      
      await redis.quit()
      return reclassifiedExchanges
    }
  } catch (error) {
    console.error('Redis get error:', error)
  }

  // Fetch fresh data
  const exchanges = await fetchAllExchanges()
  
  // Deduplicate by ID (in case there are duplicates)
  const uniqueExchanges = new Map<string, Exchange>()
  exchanges.forEach(exchange => {
    if (!uniqueExchanges.has(exchange.id)) {
      uniqueExchanges.set(exchange.id, exchange)
    }
  })
  const deduplicatedExchanges = Array.from(uniqueExchanges.values())
  
  // Sort by name
  deduplicatedExchanges.sort((a, b) => a.name.localeCompare(b.name))
  
  // Cache the result
  try {
    await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(deduplicatedExchanges))
    console.log(`Cached ${deduplicatedExchanges.length} exchanges`)
  } catch (error) {
    console.error('Redis set error:', error)
  } finally {
    await redis.quit()
  }
  
  return deduplicatedExchanges
}

/**
 * Build exchange type map (identifier -> centralized boolean)
 * Uses cached exchanges and re-classifies exchange identifiers from tickers
 */
export async function getExchangeTypeMap(
  exchangeIdentifiers: string[]
): Promise<Map<string, boolean>> {
  const redis = await getRedisClient()
  const exchangeMapCacheKey = 'exchanges:type-map'
  const CACHE_TTL = 24 * 60 * 60 // 24 hours in seconds
  
  // Try to get cached exchange map
  let exchangeMap = new Map<string, boolean>()
  try {
    const cachedMap = await redis.get(exchangeMapCacheKey)
    if (cachedMap) {
      const parsed = JSON.parse(cachedMap)
      exchangeMap = new Map<string, boolean>(parsed)
      console.log(`Loaded ${exchangeMap.size} exchanges from cache`)
      
      // Check if we have all needed exchanges in cache
      const missingExchanges = exchangeIdentifiers.filter(id => !exchangeMap.has(id))
      if (missingExchanges.length === 0) {
        await redis.quit()
        return exchangeMap
      }
      
      console.log(`Missing ${missingExchanges.length} exchanges from cache, will fetch...`)
    }
  } catch (error) {
    console.log('No cached exchange map, fetching all exchanges...')
  }
  
  // Get all exchanges (from cache or fresh fetch)
  const allExchanges = await getAllExchangesWithCache()
  
  // Build exchange names map for better matching
  const exchangeNamesMap = new Map<string, string>()
  allExchanges.forEach(exchange => {
    if (exchange.id && exchange.name) {
      exchangeNamesMap.set(exchange.id, exchange.name)
      // Add to map
      exchangeMap.set(exchange.id, exchange.centralized)
    }
  })
  
  // Re-classify exchange identifiers from tickers using keyword matching
  console.log('Re-classifying exchange identifiers from tickers using keywords...')
  exchangeIdentifiers.forEach(exchangeId => {
    const exchangeName = exchangeNamesMap.get(exchangeId) || exchangeId
    const normalizedId = exchangeId.toLowerCase()
    const normalizedName = exchangeName.toLowerCase()
    
    // First check if it's a known CEX (exclude these)
    const isKnownCEX = knownCEX.some(cex => {
      const normalizedCex = cex.toLowerCase()
      return normalizedId === normalizedCex || 
             normalizedName === normalizedCex ||
             normalizedId.includes(normalizedCex) ||
             normalizedName.includes(normalizedCex)
    })
    
    if (isKnownCEX) {
      exchangeMap.set(exchangeId, true)
      return
    }
    
    // Check if exchange ID or name contains any DEX keyword
    const containsDEXKeyword = DEX_KEYWORDS.some((keyword: string) => {
      const normalizedKeyword = keyword.toLowerCase()
      return normalizedId.includes(normalizedKeyword) || 
             normalizedName.includes(normalizedKeyword)
    })
    
    if (containsDEXKeyword) {
      // Override any previous classification - keyword matching takes precedence
      exchangeMap.set(exchangeId, false)
      console.log(`Classified ${exchangeId} (${exchangeName}) as DEX via keyword matching`)
    } else {
      // Only set to CEX if not already classified
      if (!exchangeMap.has(exchangeId)) {
        exchangeMap.set(exchangeId, true)
      }
    }
  })
  
  console.log(`Built complete exchange map: ${exchangeMap.size} exchanges (${Array.from(exchangeMap.values()).filter(v => !v).length} DEX, ${Array.from(exchangeMap.values()).filter(v => v).length} CEX)`)
  
  // Cache the complete map
  try {
    const mapArray = Array.from(exchangeMap.entries())
    await redis.setEx(exchangeMapCacheKey, CACHE_TTL, JSON.stringify(mapArray))
    console.log(`Cached complete exchange map (${exchangeMap.size} exchanges)`)
  } catch (error) {
    console.error('Failed to cache exchange map:', error)
  } finally {
    await redis.quit()
  }
  
  return exchangeMap
}

