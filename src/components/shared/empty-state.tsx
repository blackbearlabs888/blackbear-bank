'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileQuestion, Package, Users, Search, Inbox } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon = FileQuestion, title, description, action }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
        )}
        {action && (
          <Button onClick={action.onClick}>{action.label}</Button>
        )}
      </CardContent>
    </Card>
  )
}

export function EmptyTransactions(props: Omit<EmptyStateProps, 'icon'>) {
  return <EmptyState icon={Package} {...props} />
}

export function EmptyCustomers(props: Omit<EmptyStateProps, 'icon'>) {
  return <EmptyState icon={Users} {...props} />
}

export function EmptySearchResults(props: Omit<EmptyStateProps, 'icon'>) {
  return <EmptyState icon={Search} {...props} />
}

export function EmptyInbox(props: Omit<EmptyStateProps, 'icon'>) {
  return <EmptyState icon={Inbox} {...props} />
}
