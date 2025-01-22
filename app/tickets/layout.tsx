import DashboardLayout from '@/components/layout/DashboardLayout'

export default function TicketsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
} 