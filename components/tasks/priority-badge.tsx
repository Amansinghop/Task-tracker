import { Badge } from '@/components/ui/badge'

interface PriorityBadgeProps {
  priority: 'High' | 'Medium' | 'Low'
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  if (priority === 'High') {
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 px-2 py-0.5 text-xs font-semibold gap-1.5 flex items-center w-fit shadow-[0_0_10px_rgba(239,68,68,0.1)]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        High
      </Badge>
    )
  }

  if (priority === 'Medium') {
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 px-2 py-0.5 text-xs font-semibold gap-1.5 flex items-center w-fit">
        <span className="h-2 w-2 rounded-full bg-amber-500"></span>
        Medium
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-2 py-0.5 text-xs font-semibold gap-1.5 flex items-center w-fit">
      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
      Low
    </Badge>
  )
}
