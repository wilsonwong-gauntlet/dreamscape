'use client'

import { ReactNode } from 'react'
import CustomerNav from './nav/CustomerNav'
import AgentNav from './nav/AgentNav'
import AdminNav from './nav/AdminNav'
import Header from './Header'
import { Chat } from '@/components/chat/Chat'

interface AppLayoutProps {
  children: ReactNode
  role: 'customer' | 'agent' | 'admin'
}

export default function AppLayout({ children, role }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <nav className="w-64 border-r bg-muted/40">
        {role === 'customer' && <CustomerNav />}
        {role === 'agent' && <AgentNav />}
        {role === 'admin' && <AdminNav />}
      </nav>
      <main className="flex-1">
        <Header />
        <div className="container mx-auto py-6">
          {children}
        </div>
        {role === 'customer' && <Chat />}
      </main>
    </div>
  )
} 