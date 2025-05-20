"use client"

import { useState } from "react"
import { Play, Pause, Plus, Minus, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DEFAULT_EXAM_CONFIGS } from "@/lib/types"
import type { Subject, Task, QuestionGoal, UserSettings } from "@/lib/types"

interface StudyTimerProps {
  activeSubject: Subject
  isRunning: boolean
  time: number
  questionCount: number
  tasks: Task[]
  questionGoal: QuestionGoal
  settings: UserSettings
  onChangeSubject: (subject: Subject) => void
  onStart: (goalId?: string, goalTitle?: string) => void
  onPause: () => void
  onQuestionCountChange: (count: number) => void
  onUpdateQuestionGoal: (newGoal: number) => void
}

export default function StudyTimer({
  activeSubject,
  isRunning,
  time,
  questionCount,
  tasks,
  questionGoal,
  settings,
  onChangeSubject,
  onStart,
  onPause,
  onQuestionCountChange,
  onUpdateQuestionGoal,
}: StudyTimerProps) {
  const [showGoalSettings, setShowGoalSettings] = useState(false)
  const [newDailyGoal, setNewDailyGoal] = useState(questionGoal.daily)

  // Get exam config based on settings
  const examConfig = DEFAULT_EXAM_CONFIGS[settings.examType]

  // Get available subjects for the current exam type (excluding classes)
  const subjects = Object.keys(examConfig.subjectMarks).concat("classes") as Subject[]

  // Format time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0"),
    ].join(":")
  }

  const incrementQuestionCount = () => {
    onQuestionCountChange(questionCount + 1)
  }

  const decrementQuestionCount = () => {
    if (questionCount > 0) {
      onQuestionCountChange(questionCount - 1)
    }
  }

  const handleSaveGoal = () => {
    if (newDailyGoal > 0) {
      onUpdateQuestionGoal(newDailyGoal)
      setShowGoalSettings(false)
    }
  }

  // Get display name for a subject
  const getSubjectDisplayName = (subject: string) => {
    return settings.customSubjectNames[subject] || subject
  }

  // Filter tasks by active subject
  const subjectTasks = tasks.filter((task) => task.subject === activeSubject && !task.completed)

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Study Timer</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowGoalSettings(true)}>
            <Settings size={16} className="mr-2" />
            Goal Settings
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue={subjects[0]}
          value={activeSubject}
          onValueChange={(value) => onChangeSubject(value as Subject)}
          className="mb-6"
        >
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${subjects.length}, 1fr)` }}>
            {subjects.map(subject => (
              <TabsTrigger key={subject} value={subject} className="capitalize">
                {getSubjectDisplayName(subject)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-col items-center">
          <div className="text-6xl font-mono font-bold mb-8">{formatTime(time)}</div>

          <div className="flex flex-col gap-6 items-center">
            <div className="flex gap-4">
              {!isRunning ? (
                subjectTasks.length > 0 ? (
                  <div className="flex flex-col gap-2 items-center">
                    <Button onClick={() => onStart()} className="flex items-center gap-2">
                      <Play size={16} />
                      Start Without Goal
                    </Button>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Or select a goal to work on:</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {subjectTasks.map((task) => (
                          <Button
                            key={task.id}
                            variant="outline"
                            className="w-full justify-start text-left"
                            onClick={() => onStart(task.id, task.title)}
                          >
                            {task.title}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button onClick={() => onStart()} className="flex items-center gap-2">
                    <Play size={16} />
                    Start
                  </Button>
                )
              ) : (
                <Button onClick={onPause} className="flex items-center gap-2">
                  <Pause size={16} />
                  Pause
                </Button>
              )}
            </div>

            {/* Only show question counter for non-classes subjects */}
            {activeSubject !== "classes" && (
              <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={decrementQuestionCount}
                  disabled={!isRunning || questionCount === 0}
                  className="h-10 w-10 rounded-full"
                >
                  <Minus size={18} />
                </Button>
                <div className="flex items-center justify-center min-w-[80px]">
                  <span className="text-xl font-medium">{questionCount}</span>
                  <span className="text-xs text-muted-foreground ml-1">questions</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={incrementQuestionCount} 
                  disabled={!isRunning}
                  className="h-10 w-10 rounded-full"
                >
                  <Plus size={18} />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Goal Settings Dialog */}
      <Dialog open={showGoalSettings} onOpenChange={setShowGoalSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Question Goal Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dailyGoal">Daily Question Goal</Label>
              <Input
                id="dailyGoal"
                type="number"
                min="1"
                value={newDailyGoal}
                onChange={(e) => setNewDailyGoal(Number.parseInt(e.target.value) || questionGoal.daily)}
              />
              <p className="text-sm text-muted-foreground">
                Set your daily target for questions to solve across all subjects.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGoalSettings(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveGoal}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
