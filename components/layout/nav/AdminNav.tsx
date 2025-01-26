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
  ChatBubbleLeftRightIcon,
  TicketIcon,
  BellIcon,
  LockClosedIcon,
  SwatchIcon,
  CommandLineIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'

// Operational items
const operationalItems = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Inbox', href: '/tickets', icon: TicketIcon },
]

// Knowledge Management
const knowledgeItems = [
  { name: 'Knowledge Base', href: '/knowledge', icon: BookOpenIcon },
  { name: 'Manage Categories', href: '/admin/knowledge/categories', icon: QueueListIcon },
]

// Admin & Settings
const adminItems = [
  { name: 'General Settings', href: '/admin/settings', icon: Cog6ToothIcon },
  { name: 'Routing Rules', href: '/admin/routing', icon: QueueListIcon },
  { name: 'Macros', href: '/admin/macros', icon: CommandLineIcon },
  { name: 'Teams', href: '/admin/team', icon: UserGroupIcon },
  { name: 'Team Invites', href: '/admin/invites', icon: EnvelopeIcon },
  { name: 'Analytics', href: '/admin/analytics', icon: ChartBarIcon },
]

export default function AdminNav() {
  const pathname = usePathname()

  const NavSection = ({ items, title }: { items: typeof operationalItems, title?: string }) => (
    <li>
      {title && (
        <div className="text-xs font-semibold leading-6 text-muted-foreground px-2 mb-2">
          {title}
        </div>
      )}
      <ul role="list" className="-mx-2 space-y-1">
        {items.map((item) => {
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
  )

  return (
    <div className="hidden lg:flex lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-background px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <span className="font-bold text-xl">AutoCRM</span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <NavSection items={operationalItems} />
            <NavSection items={knowledgeItems} title="Knowledge Management" />
            <NavSection items={adminItems} title="Administration" />
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