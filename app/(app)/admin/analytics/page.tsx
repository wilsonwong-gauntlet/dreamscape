'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { AIMetricsCard } from "@/components/analytics/AIMetricsCard"
import { OverviewMetricsCard } from "@/components/analytics/OverviewMetricsCard"
import { TeamPerformanceCard } from "@/components/analytics/TeamPerformanceCard"

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('daily')

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <Select value={period} onValueChange={(value: 'daily' | 'weekly' | 'monthly' | 'quarterly') => setPeriod(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ai">AI Performance</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <OverviewMetricsCard period={period} />
            <AIMetricsCard period={period} />
          </div>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <AIMetricsCard period={period} />
            {/* Add detailed AI analytics components here */}
          </div>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <TeamPerformanceCard period={period} />
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              Coming soon: Trend analysis and historical comparisons
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 