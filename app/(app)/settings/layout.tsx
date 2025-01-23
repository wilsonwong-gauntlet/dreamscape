'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Settings,
  Users,
  MessageSquare,
  Palette,
  Bell,
  Lock,
} from 'lucide-react'

const navigation = [
  { name: 'General', href: '/settings', icon: Settings },
  { name: 'Team', href: '/settings/team', icon: Users },
  { name: 'Macros', href: '/settings/macros', icon: MessageSquare },
  { name: 'Appearance', href: '/settings/appearance', icon: Palette },
  { name: 'Notifications', href: '/settings/notifications', icon: Bell },
  { name: 'Security', href: '/settings/security', icon: Lock },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex h-full">
      <div className="w-64 border-r bg-muted/40">
        <div className="flex flex-col gap-y-5 p-6">
          <h2 className="text-lg font-semibold">Settings</h2>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href
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
            </ul>
          </nav>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="container py-6">
          {children}
        </div>
      </div>
    </div>
  )
} 