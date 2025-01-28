'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  ChartBarIcon,
  DocumentIcon,
  BookOpenIcon,
  LifebuoyIcon,
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon },
  { name: 'Portfolio', href: '/portfolio', icon: DocumentIcon },
  { name: 'Research', href: '/research', icon: BookOpenIcon },
  { name: 'Support', href: '/support', icon: LifebuoyIcon }
]

export default function ClientNav() {
  const pathname = usePathname()

  return (
    <div className="hidden lg:flex lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-background px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center">
          <Link href="/portfolio" className="flex items-center space-x-2">
            <span className="font-bold text-xl">Dreamscape Capital</span>
          </Link>
        </div>
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
            <li className="mt-auto">
              <Button
                variant="outline"
                className="w-full justify-start gap-x-3"
                asChild
              >
                <Link href="/support">
                  <LifebuoyIcon className="h-6 w-6 shrink-0" />
                  Get Support
                </Link>
              </Button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
} 