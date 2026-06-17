'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Upload } from 'lucide-react'

interface CSVUploadDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface UploadResult {
  success: number
  failed: number
  errors: string[]
}

export function CSVUploadDialog({ isOpen, onClose, onSuccess }: CSVUploadDialogProps) {
  const [csvText, setCsvText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [showResult, setShowResult] = useState(false)

  const downloadTemplate = () => {
    const template = `action,email,name,password,role,license_days,status,max_daily_hours
# Actions: add, approve, reject, delete
# max_daily_hours: 1-24 (optional, defaults to 24)
add,user@example.com,John Doe,password123,user,30,pending,8
approve,pending@example.com,Jane Smith,,user,30,,12
delete,old@example.com,,,,,`

    try {
      const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', 'users_template.csv')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('[v0] Download template error:', error)
      alert('Failed to download template. Please copy the format manually.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvText.trim()) {
      alert('Please enter CSV data')
      return
    }

    setIsLoading(true)
    setShowResult(false)
    setResult(null)

    try {
      const response = await fetch('/api/admin/csv-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvText }),
      })

      const data = await response.json()
      setResult(data)
      setShowResult(true)

      if (response.ok) {
        setCsvText('')
        setTimeout(() => {
          onClose()
          onSuccess?.()
        }, 2000)
      }
    } catch (error) {
      console.error('[v0] CSV upload error:', error)
      alert('Failed to upload CSV')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading && !showResult) {
      setCsvText('')
      setResult(null)
      setShowResult(false)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CSV Bulk Operations</DialogTitle>
          <DialogDescription>Upload a CSV file to add, update, approve, or delete multiple users at once</DialogDescription>
        </DialogHeader>

        {!showResult ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv">CSV Data</Label>
              <textarea
                id="csv"
                placeholder="Paste CSV data here..."
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full min-h-40 p-3 border border-input rounded-md bg-background text-foreground"
                disabled={isLoading}
              />
            </div>

            <div className="bg-muted p-3 rounded text-sm space-y-2">
              <p className="font-medium">CSV Format:</p>
              <code className="text-xs block whitespace-pre-wrap">
{`action,email,name,password,role,license_days,status,max_daily_hours
add,user@example.com,John,pass,user,30,pending,8
approve,user@example.com,,,,30,,12
delete,user@example.com,,,,,`}
              </code>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Processing...' : 'Upload CSV'}
              </Button>
              <Button type="button" variant="outline" onClick={downloadTemplate}>
                Download Template
              </Button>
              <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded space-y-2">
              <p className="font-medium">Upload Results</p>
              <p className="text-sm">Successful: {result?.success ?? 0}</p>
              <p className="text-sm">Failed: {result?.failed ?? 0}</p>
              {result?.errors && result.errors.length > 0 && (
                <div className="text-sm text-destructive space-y-1">
                  <p className="font-medium">Errors:</p>
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs">• {err}</p>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
