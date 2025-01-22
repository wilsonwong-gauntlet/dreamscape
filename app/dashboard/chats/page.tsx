'use client'

import { ChatList } from '@/components/chat/ChatList'

export default function ChatsPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Chat Dashboard</h1>
      <ChatList />
    </div>
  )
} 