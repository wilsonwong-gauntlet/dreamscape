'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  HomeIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  QueueListIcon,
  BookOpenIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  TicketIcon,
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'All Tickets', href: '/tickets', icon: TicketIcon },
  { name: 'Active Chats', href: '/chats', icon: ChatBubbleLeftRightIcon },
  { name: 'Teams', href: '/teams', icon: UserGroupIcon },
  { name: 'Queue', href: '/queue', icon: QueueListIcon },
  { name: 'Knowledge Base', href: '/knowledge', icon: BookOpenIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Team Invites', href: '/admin/invites', icon: EnvelopeIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-background px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <span className="font-bold text-xl">AutoCRM</span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          'group flex gap-x-3 rounded-md p-2 text-sm leading-6',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <item.icon
                          className={cn(
                            'h-6 w-6 shrink-0',
                            isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-accent-foreground'
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </li>
            <li>
              <div className="text-xs font-semibold leading-6 text-muted-foreground">
                System Status
              </div>
              <ul role="list" className="-mx-2 mt-2 space-y-1">
                {/* System status indicators will be here */}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
} 