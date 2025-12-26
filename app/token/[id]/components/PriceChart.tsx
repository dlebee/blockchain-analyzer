'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ChartData {
  timestamp: number
  usd: number
}

interface PriceChartProps {
  tokenId: string
}

export default function PriceChart({ tokenId }: PriceChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState<string>('30')

  useEffect(() => {
    async function fetchChartData() {
      try {
        setLoading(true)
        const response = await fetch(`/api/tokens/${tokenId}/chart?days=${days}`)
        if (!response.ok) {
          throw new Error('Failed to fetch chart data')
        }
        const data = await response.json()

        // Transform the data for USD
        const usdPrices = data.usd?.prices || []

        // Combine data points
        const combined: ChartData[] = []
        for (let i = 0; i < usdPrices.length; i++) {
          combined.push({
            timestamp: usdPrices[i][0],
            usd: usdPrices[i][1],
          })
        }

        setChartData(combined)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    if (tokenId) {
      fetchChartData()
    }
  }, [tokenId, days])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Price Chart (30 Days)
        </h2>
        <div className="h-64 flex items-center justify-center text-gray-500">
          Loading chart data...
        </div>
      </div>
    )
  }

  if (error || chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Price Chart (30 Days)
        </h2>
        <div className="h-64 flex items-center justify-center text-red-500">
          {error || 'No chart data available'}
        </div>
      </div>
    )
  }

  // Format timestamp for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Format price values
  const formatPrice = (value: number, currency: string) => {
    if (currency === 'usd') {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`
    }
    return value.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 8 })
  }

  const getDaysLabel = (daysValue: string) => {
    if (daysValue === '1') return '24 Hours'
    if (daysValue === '7') return '7 Days'
    if (daysValue === '30') return '30 Days'
    if (daysValue === '90') return '90 Days'
    if (daysValue === '365') return '1 Year'
    return `${daysValue} Days`
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Price Chart ({getDaysLabel(days)})
        </h2>
        <select
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="1">24 Hours</option>
          <option value="7">7 Days</option>
          <option value="30">30 Days</option>
          <option value="90">90 Days</option>
          <option value="365">1 Year (Max)</option>
        </select>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatDate}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="fiat"
            orientation="left"
            tickFormatter={(value) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'usd') return formatPrice(value, 'usd')
              return value
            }}
            labelFormatter={(timestamp) => formatDate(timestamp)}
          />
          <Legend />
          <Line
            yAxisId="fiat"
            type="monotone"
            dataKey="usd"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={false}
            name="USD"
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

