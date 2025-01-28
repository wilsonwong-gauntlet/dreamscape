'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  HomeIcon,
  ChartBarIcon,
  UsersIcon,
  BriefcaseIcon,
  BookOpenIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  CommandLineIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline'
import { Separator } from '@/components/ui/separator'

const mainNavigation = [
  { 
    name: 'Dashboard', 
    href: '/admin/dashboard', 
    icon: HomeIcon,
    description: 'Fund performance and business overview'
  },
  { 
    name: 'Analytics', 
    href: '/admin/analytics', 
    icon: ChartBarIcon,
    description: 'Performance metrics and insights'
  },
  { 
    name: 'Research', 
    href: '/admin/research', 
    icon: BookOpenIcon,
    description: 'Manage research content'
  },
]

const settingsNavigation = [
  { 
    name: 'Team', 
    href: '/admin/team', 
    icon: UserGroupIcon,
    description: 'Manage team members and roles'
  },
  { 
    name: 'Routing', 
    href: '/admin/routing', 
    icon: ArrowsPointingOutIcon,
    description: 'Configure support routing rules'
  },
  { 
    name: 'Macros', 
    href: '/admin/macros', 
    icon: CommandLineIcon,
    description: 'Manage response templates'
  },
  { 
    name: 'Settings', 
    href: '/admin/settings', 
    icon: Cog6ToothIcon,
    description: 'System configuration'
  }
]

export default function AdminNav() {
  const pathname = usePathname()

  const NavLink = ({ item }: { item: typeof mainNavigation[0] }) => (
    <Link
      href={item.href}
      className={cn(
        'group flex gap-x-3 rounded-md p-2 text-sm leading-6',
        pathname === item.href
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <item.icon
        className={cn(
          'h-6 w-6 shrink-0',
          pathname === item.href ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-accent-foreground'
        )}
        aria-hidden="true"
      />
      {item.name}
    </Link>
  )

  return (
    <div className="hidden lg:flex lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-background px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center">
          <Link href="/admin/dashboard" className="flex items-center space-x-2">
            <span className="font-bold text-xl">Dreamscape Capital</span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {mainNavigation.map((item) => (
                  <li key={item.name}>
                    <NavLink item={item} />
                  </li>
                ))}
              </ul>
            </li>
            <li>
              <Separator className="my-2" />
            </li>
            <li>
              <div className="text-xs font-semibold leading-6 text-muted-foreground">Support Settings</div>
              <ul role="list" className="-mx-2 mt-2 space-y-1">
                {settingsNavigation.map((item) => (
                  <li key={item.name}>
                    <NavLink item={item} />
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
} 