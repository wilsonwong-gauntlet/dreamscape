"use client"

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid'
import { cn } from '@/lib/utils'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
  ReferenceLine
} from 'recharts'

interface TrendMetrics {
  total: number
  resolved: number
  resolutionRate: number
  avgResolutionTime: number
  p50ResolutionTime: number
  p90ResolutionTime: number
  customerSatisfaction: number
  satisfactionResponses: number
}

interface TrendData {
  period: string
  metrics: TrendMetrics
}

interface TrendsCardProps {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  teamId?: string
}

export default function TrendsCard({ period, teamId }: TrendsCardProps) {
  const [trends, setTrends] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTrends() {
      try {
        setLoading(true)
        setError(null)
        const url = new URL('/api/analytics/trends', window.location.origin)
        url.searchParams.set('period', period)
        if (teamId) url.searchParams.set('teamId', teamId)
        
        const response = await fetch(url.toString())
        if (!response.ok) throw new Error('Failed to fetch trends')
        
        const data = await response.json()
        setTrends(data)
      } catch (err) {
        console.error('Error loading trends:', err)
        setError('Failed to load trends data')
      } finally {
        setLoading(false)
      }
    }

    loadTrends()
  }, [period, teamId])

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64 text-red-500">
          {error}
        </div>
      </Card>
    )
  }

  if (!trends.length) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64 text-gray-500">
          No trend data available for the selected period
        </div>
      </Card>
    )
  }

  // Calculate changes from previous period
  const current = trends[trends.length - 1].metrics
  const previous = trends[trends.length - 2]?.metrics || current

  const calculateChange = (current: number, previous: number) => {
    if (!previous) return 0
    return ((current - previous) / previous) * 100
  }

  const formatChange = (change: number) => {
    const prefix = change > 0 ? '+' : ''
    return `${prefix}${change.toFixed(1)}%`
  }

  // Format data for charts
  const chartData = trends.map(trend => ({
    name: trend.period,
    total: trend.metrics.total,
    resolved: trend.metrics.resolved,
    resolutionRate: trend.metrics.resolutionRate,
    avgResolutionTime: trend.metrics.avgResolutionTime,
    p50ResolutionTime: trend.metrics.p50ResolutionTime,
    p90ResolutionTime: trend.metrics.p90ResolutionTime,
    customerSatisfaction: trend.metrics.customerSatisfaction,
    satisfactionResponses: trend.metrics.satisfactionResponses
  }))

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="text-sm font-semibold mb-2">{label}</p>
          {payload.map((entry: any) => (
            <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)}
              {entry.name === 'resolutionRate' ? '%' : 
                entry.name === 'avgResolutionTime' ? 'm' : ''}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card className="p-6">
      <Tabs defaultValue="volume" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="volume">Volume</TabsTrigger>
          <TabsTrigger value="resolution">Resolution</TabsTrigger>
          <TabsTrigger value="time">Response Time</TabsTrigger>
          <TabsTrigger value="satisfaction">CSAT</TabsTrigger>
        </TabsList>

        <TabsContent value="volume" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">Ticket Volume</h3>
              <p className="text-sm text-gray-500">Total vs Resolved tickets</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{current.total}</div>
              <div className={cn(
                "flex items-center text-sm",
                calculateChange(current.total, previous.total) > 0 ? "text-green-500" : "text-red-500"
              )}>
                {calculateChange(current.total, previous.total) > 0 ? (
                  <ArrowUpIcon className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4 mr-1" />
                )}
                {formatChange(calculateChange(current.total, previous.total))}
              </div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                />
                <YAxis />
                <Tooltip content={CustomTooltip} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#totalGradient)" 
                  name="Total Tickets"
                />
                <Area 
                  type="monotone" 
                  dataKey="resolved" 
                  stroke="#22c55e" 
                  fillOpacity={1} 
                  fill="url(#resolvedGradient)"
                  name="Resolved Tickets"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="resolution" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">Resolution Rate</h3>
              <p className="text-sm text-gray-500">Percentage of tickets resolved</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{current.resolutionRate.toFixed(1)}%</div>
              <div className={cn(
                "flex items-center text-sm",
                calculateChange(current.resolutionRate, previous.resolutionRate) > 0 ? "text-green-500" : "text-red-500"
              )}>
                {calculateChange(current.resolutionRate, previous.resolutionRate) > 0 ? (
                  <ArrowUpIcon className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4 mr-1" />
                )}
                {formatChange(calculateChange(current.resolutionRate, previous.resolutionRate))}
              </div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip content={CustomTooltip} />
                <Legend />
                <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Target (90%)', position: 'right' }} />
                <ReferenceLine y={75} stroke="#eab308" strokeDasharray="3 3" label={{ value: 'Warning (75%)', position: 'right' }} />
                <Line
                  type="monotone"
                  dataKey="resolutionRate"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Resolution Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="time" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">Response Time</h3>
              <p className="text-sm text-gray-500">Resolution time distribution (minutes)</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{current.avgResolutionTime.toFixed(0)}m</div>
              <div className={cn(
                "flex items-center text-sm",
                calculateChange(current.avgResolutionTime, previous.avgResolutionTime) > 0 ? "text-red-500" : "text-green-500"
              )}>
                {calculateChange(current.avgResolutionTime, previous.avgResolutionTime) > 0 ? (
                  <ArrowUpIcon className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4 mr-1" />
                )}
                {formatChange(calculateChange(current.avgResolutionTime, previous.avgResolutionTime))}
              </div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                />
                <YAxis />
                <Tooltip content={CustomTooltip} />
                <Legend />
                <ReferenceLine y={120} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'SLA (120m)', position: 'right' }} />
                <Line
                  type="monotone"
                  dataKey="avgResolutionTime"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Avg Resolution Time"
                />
                <Line
                  type="monotone"
                  dataKey="p50ResolutionTime"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Median (P50)"
                />
                <Line
                  type="monotone"
                  dataKey="p90ResolutionTime"
                  stroke="#eab308"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="90th Percentile"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="satisfaction" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">Customer Satisfaction</h3>
              <p className="text-sm text-gray-500">Average rating (1-5)</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{current.customerSatisfaction.toFixed(1)}</div>
              <div className={cn(
                "flex items-center text-sm",
                calculateChange(current.customerSatisfaction, previous.customerSatisfaction) > 0 ? "text-green-500" : "text-red-500"
              )}>
                {calculateChange(current.customerSatisfaction, previous.customerSatisfaction) > 0 ? (
                  <ArrowUpIcon className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4 mr-1" />
                )}
                {formatChange(calculateChange(current.customerSatisfaction, previous.customerSatisfaction))}
              </div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                />
                <YAxis domain={[0, 5]} />
                <Tooltip content={CustomTooltip} />
                <Legend />
                <ReferenceLine y={4.5} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Excellent (4.5+)', position: 'right' }} />
                <ReferenceLine y={4.0} stroke="#eab308" strokeDasharray="3 3" label={{ value: 'Target (4.0+)', position: 'right' }} />
                <Line
                  type="monotone"
                  dataKey="customerSatisfaction"
                  stroke="#eab308"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="CSAT Score"
                />
                <Line
                  type="monotone"
                  dataKey="satisfactionResponses"
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                  name="Response Count"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  )
} 