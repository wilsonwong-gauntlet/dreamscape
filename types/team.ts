export type DaySchedule = {
  start: string
  end: string
} | null

export type OperatingHours = {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

export type TeamMetrics = {
  avgResponseTime?: number
  resolutionRate?: number
  customerSatisfaction?: number
  ticketVolume?: number
  activeAgents?: number
  utilizationRate?: number
}

export type Team = {
  id: string
  name: string
  description: string
  timeZone: string
  focusAreas: string[]
  maxCapacity: number | null
  operatingHours: OperatingHours
  isBackup: boolean
  
  // Fields for AI/ML insights
  metrics?: TeamMetrics
  aiSuggestions?: {
    staffingSuggestion?: string
    skillGaps?: string[]
    workloadPrediction?: {
      expectedTickets: number
      confidenceScore: number
    }
    performanceInsights?: string[]
    lastAnalyzed?: string
  }
  
  createdAt: string
  updatedAt: string
}

export type CreateTeamInput = Omit<Team, 'id' | 'createdAt' | 'updatedAt' | 'metrics' | 'aiSuggestions'>

export type UpdateTeamInput = Partial<CreateTeamInput>

export type TeamWithMembers = Team & {
  members: Array<{
    id: string
    name: string
    email: string
    role: string
    skills: string[]
    status: string
  }>
} 