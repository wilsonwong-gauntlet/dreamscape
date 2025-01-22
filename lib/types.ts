export interface ChatSession {
  id: string
  user_id: string
  status: 'active' | 'ended'
  created_at: string
  ended_at: string | null
  metadata: Record<string, any>
}

export interface ChatMessage {
  id: string
  session_id: string
  sender_type: 'customer' | 'agent' | 'system'
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
  metadata: Record<string, any>
}

export interface RealtimePayload<T> {
  commit_timestamp: string
  errors: null | any[]
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: T | null
  schema: string
  table: string
} 