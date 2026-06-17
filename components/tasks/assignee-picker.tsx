'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface Member {
  id: string
  name: string
  email: string
}

interface AssigneePickerProps {
  members: Member[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function AssigneePicker({ members, selectedIds, onChange }: AssigneePickerProps) {
  const [open, setOpen] = useState(false)

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  // Get display text
  const getTriggerText = () => {
    if (selectedIds.length === 0) return 'Assign to...'
    if (selectedIds.length === 1) {
      const member = members.find((m) => m.id === selectedIds[0])
      return member ? (member.name || member.email) : '1 assignee'
    }
    return `${selectedIds.length} assignees`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-card/45 border-border text-sm font-normal h-10"
        >
          <div className="flex items-center gap-2 truncate">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{getTriggerText()}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 border-border" align="start">
        <Command className="bg-card">
          <CommandInput placeholder="Search team members..." className="h-9 border-none focus:ring-0" />
          <CommandEmpty>No members found.</CommandEmpty>
          <CommandList className="max-h-[200px] overflow-y-auto">
            <CommandGroup>
              {members.map((member) => {
                const isSelected = selectedIds.includes(member.id)
                return (
                  <CommandItem
                    key={member.id}
                    value={member.name || member.email}
                    onSelect={() => handleToggle(member.id)}
                    className="flex items-center justify-between py-2 px-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
                          {member.name ? member.name[0].toUpperCase() : member.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground leading-none">
                          {member.name || 'User'}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-tight">
                          {member.email}
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
