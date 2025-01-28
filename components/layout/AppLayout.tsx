'use client'

import { ReactNode } from 'react'
import ClientNav from './nav/CustomerNav'
import RelationshipManagerNav from './nav/AgentNav'
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
        {role === 'customer' && <ClientNav />}
        {role === 'agent' && <RelationshipManagerNav />}
        {role === 'admin' && <AdminNav />}
      </nav>
      <main className="flex-1 flex flex-col min-h-0">
        <Header />
        <div className="flex-1 px-8">
          {children}
        </div>
        {role === 'customer' && <Chat />}
      </main>
    </div>
  )
} 