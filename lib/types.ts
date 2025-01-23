export interface ChatSession {
  id: string
  user_id: string
  status: 'active' | 'ended'
  created_at: string
  ended_at: string | null
  metadata: Record<string, any>
  user?: {
    id: string
    email: string
  }
  chat_messages?: ChatMessage[]
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

export interface SavedView {
  id: string
  name: string
  filters: {
    status?: string[]
    priority?: string[]
    assignedTo?: string | null
    lastResponseBy?: string
  }
}

export interface ExtendedTicket {
  id: string
  title: string
  description: string
  status: 'new' | 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  updated_at: string
  customer: { 
    id: string
    user: {
      email: string
    }
  } | null
  assigned_agent: { 
    id: string
    user: {
      email: string
    }
  } | null
  team: { 
    id: string
    name: string 
  } | null
  last_response?: {
    author_id: string
    created_at: string
    is_internal: boolean
    type: 'human' | 'ai'
  } | null
} 