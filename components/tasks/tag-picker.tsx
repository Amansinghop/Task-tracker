'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, Tag } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'

interface TaskTag {
  id: string
  name: string
  color: string
}

interface TagPickerProps {
  tags: TaskTag[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function TagPicker({ tags, selectedIds, onChange }: TagPickerProps) {
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
    if (selectedIds.length === 0) return 'Add tags...'
    if (selectedIds.length === 1) {
      const tag = tags.find((t) => t.id === selectedIds[0])
      return tag ? tag.name : '1 tag'
    }
    return `${selectedIds.length} tags`
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
            <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate capitalize">{getTriggerText()}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0 border-border" align="start">
        <Command className="bg-card">
          <CommandInput placeholder="Search tags..." className="h-9 border-none focus:ring-0" />
          <CommandEmpty>No tags found.</CommandEmpty>
          <CommandList className="max-h-[200px] overflow-y-auto">
            <CommandGroup>
              {tags.map((tag) => {
                const isSelected = selectedIds.includes(tag.id)
                return (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => handleToggle(tag.id)}
                    className="flex items-center justify-between py-2 px-3 cursor-pointer capitalize"
                  >
                    <div className="flex items-center gap-2">
                      <span 
                        className="h-2.5 w-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-xs text-foreground font-medium">
                        {tag.name}
                      </span>
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
