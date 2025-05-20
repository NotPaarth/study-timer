"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings } from "lucide-react"
import { DEFAULT_EXAM_CONFIGS, DEFAULT_STREAK_CONFIG } from "@/lib/types"
import type { ExamType, UserSettings } from "@/lib/types"

interface SettingsDialogProps {
  settings: UserSettings
  onUpdateSettings: (settings: UserSettings) => void
}

export default function SettingsDialog({ settings, onUpdateSettings }: SettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [tempSettings, setTempSettings] = useState<UserSettings>({
    ...settings,
    streakConfig: settings.streakConfig || DEFAULT_STREAK_CONFIG
  })

  const handleExamTypeChange = (type: ExamType) => {
    setTempSettings(prev => ({
      ...prev,
      examType: type,
      // Reset custom names when changing exam type
      customSubjectNames: {},
    }))
  }

  const handleCustomNameChange = (subject: string, newName: string) => {
    setTempSettings(prev => ({
      ...prev,
      customSubjectNames: {
        ...prev.customSubjectNames,
        [subject]: newName,
      }
    }))
  }

  const handleSave = () => {
    onUpdateSettings(tempSettings)
    setOpen(false)
  }

  const getSubjects = () => {
    const config = DEFAULT_EXAM_CONFIGS[tempSettings.examType]
    return Object.keys(config.subjectMarks).filter(subject => subject !== "classes")
  }

  return (
    <div>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-8 w-8"
      >
        <Settings className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Exam Type</Label>
              <Select
                value={tempSettings.examType}
                onValueChange={(value) => handleExamTypeChange(value as ExamType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select exam type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JEE">JEE</SelectItem>
                  <SelectItem value="NEET">NEET</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label>Streak Settings</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minStudyHours">Min. Study Hours</Label>
                  <Input
                    id="minStudyHours"
                    type="number"
                    min="1"
                    step="0.5"
                    value={tempSettings.streakConfig.minStudyHours}
                    onChange={(e) => setTempSettings(prev => ({
                      ...prev,
                      streakConfig: {
                        ...prev.streakConfig,
                        minStudyHours: Number(e.target.value)
                      }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minQuestions">Min. Questions</Label>
                  <Input
                    id="minQuestions"
                    type="number"
                    min="1"
                    value={tempSettings.streakConfig.minQuestions}
                    onChange={(e) => setTempSettings(prev => ({
                      ...prev,
                      streakConfig: {
                        ...prev.streakConfig,
                        minQuestions: Number(e.target.value)
                      }
                    }))}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Set minimum requirements for maintaining your daily streak.
              </p>
            </div>

            <div className="space-y-4">
              <Label>Customize Subject Names</Label>
              {getSubjects().map(subject => (
                <div key={subject} className="flex items-center gap-2">
                  <Label className="w-24 capitalize">{subject}</Label>
                  <Input
                    value={tempSettings.customSubjectNames[subject] || ""}
                    onChange={(e) => handleCustomNameChange(subject, e.target.value)}
                    placeholder={`Custom name for ${subject}`}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 