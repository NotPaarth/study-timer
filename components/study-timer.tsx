"use client"

import { useState } from "react"
import { Play, Pause, Plus, Minus, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import type { Subject, Task, QuestionGoal } from "@/lib/types"

interface StudyTimerProps {
  activeSubject: Subject
  isRunning: boolean
  time: number
  questionCount: number
  tasks: Task[] // Add tasks prop
  questionGoal: QuestionGoal
  onChangeSubject: (subject: Subject) => void
  onStart: (goalId?: string, goalTitle?: string) => void // Update to include goal
  onPause: () => void
  onQuestionCountChange: (count: number) => void
  onUpdateQuestionGoal: (newGoal: number) => void
}

export default function StudyTimer({
  activeSubject,
  isRunning,
  time,
  questionCount,
  tasks, // Add tasks
  questionGoal,
  onChangeSubject,
  onStart,
  onPause,
  onQuestionCountChange,
  onUpdateQuestionGoal,
}: StudyTimerProps) {
  const [showGoalSettings, setShowGoalSettings] = useState(false)
  const [newDailyGoal, setNewDailyGoal] = useState(questionGoal.daily)

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
          defaultValue="physics"
          value={activeSubject}
          onValueChange={(value) => onChangeSubject(value as Subject)}
          className="mb-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="physics">Physics</TabsTrigger>
            <TabsTrigger value="chemistry">Chemistry</TabsTrigger>
            <TabsTrigger value="mathematics">Mathematics</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
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
                  disabled={questionCount === 0}
                  className="h-10 w-10 rounded-full"
                >
                  <Minus size={18} />
                </Button>
                <div className="flex items-center justify-center min-w-[80px]">
                  <span className="text-xl font-medium">{questionCount}</span>
                  <span className="text-xs text-muted-foreground ml-1">questions</span>
                </div>
                <Button variant="ghost" size="icon" onClick={incrementQuestionCount} className="h-10 w-10 rounded-full">
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
                Set your daily target for questions to solve across Physics, Chemistry, and Mathematics.
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
