"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Edit, Plus, Clock, BookOpen, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import type { Subject, TimeLog, Task } from "@/lib/types"
import { format } from "date-fns"

interface StudyLogsProps {
  logs: TimeLog[]
  onDeleteLog: (logId: string) => void
  onEditLogEndTime: (logId: string, newEndTime: string) => void
  onEditLogQuestionCount: (logId: string, newQuestionCount: number) => void
  onEditLogNotes: (logId: string, newNotes: string) => void
  onAddManualLog: (
    subject: Subject,
    startTime: string,
    endTime: string,
    questionCount?: number,
    goalId?: string,
    goalTitle?: string,
    notes?: string,
  ) => void
  tasks: Task[]
}

// Subject color mapping
const SUBJECT_COLORS: Record<Subject, string> = {
  physics: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  chemistry: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  mathematics: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  classes: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
}

export default function StudyLogs({
  logs,
  onDeleteLog,
  onEditLogEndTime,
  onEditLogQuestionCount,
  onEditLogNotes,
  onAddManualLog,
  tasks,
}: StudyLogsProps) {
  const [editingLog, setEditingLog] = useState<TimeLog | null>(null)
  const [newEndTime, setNewEndTime] = useState<string>("")
  const [newQuestionCount, setNewQuestionCount] = useState<number>(0)
  const [newNotes, setNewNotes] = useState<string>("")

  // For adding manual log
  const [newSubject, setNewSubject] = useState<Subject>("physics")
  const [newStartTime, setNewStartTime] = useState<string>("")
  const [newEndTime2, setNewEndTime2] = useState<string>("")
  const [newQuestionCount2, setNewQuestionCount2] = useState<number>(0)
  const [newGoalId, setNewGoalId] = useState<string>("")
  const [newNotes2, setNewNotes2] = useState<string>("")
  const [error, setError] = useState<string>("")

  // Format date for display
  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy h:mm a")
    } catch (e) {
      return "Invalid date"
    }
  }

  // Format duration for display
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  // Handle editing end time
  const handleEditEndTime = () => {
    if (!editingLog || !newEndTime) return

    try {
      // Validate that new end time is after start time
      const startDate = new Date(editingLog.startTime)
      const endDate = new Date(newEndTime)

      if (endDate <= startDate) {
        setError("End time must be after start time")
        return
      }

      onEditLogEndTime(editingLog.id, newEndTime)
      setEditingLog(null)
      setNewEndTime("")
      setError("")
    } catch (e) {
      setError("Invalid date format")
    }
  }

  // Handle editing question count
  const handleEditQuestionCount = () => {
    if (!editingLog) return

    try {
      if (newQuestionCount < 0) {
        setError("Question count cannot be negative")
        return
      }

      onEditLogQuestionCount(editingLog.id, newQuestionCount)
      setEditingLog(null)
      setNewQuestionCount(0)
      setError("")
    } catch (e) {
      setError("Invalid question count")
    }
  }

  // Handle editing notes
  const handleEditNotes = () => {
    if (!editingLog) return

    try {
      onEditLogNotes(editingLog.id, newNotes)
      setEditingLog(null)
      setNewNotes("")
      setError("")
    } catch (e) {
      setError("Error updating notes")
    }
  }

  // Handle adding manual log
  const handleAddManualLog = () => {
    if (!newSubject || !newStartTime || !newEndTime2) {
      setError("All fields are required")
      return
    }

    try {
      // Validate that end time is after start time
      const startDate = new Date(newStartTime)
      const endDate = new Date(newEndTime2)

      if (endDate <= startDate) {
        setError("End time must be after start time")
        return
      }

      if (newQuestionCount2 < 0) {
        setError("Question count cannot be negative")
        return
      }

      // Find the selected goal title if a goal ID is selected
      let goalTitle
      if (newGoalId && newGoalId !== "none") {
        const selectedTask = tasks.find((task) => task.id === newGoalId)
        goalTitle = selectedTask?.title
      }

      onAddManualLog(
        newSubject,
        newStartTime,
        newEndTime2,
        newQuestionCount2,
        newGoalId !== "none" ? newGoalId : undefined,
        goalTitle,
        newNotes2 || undefined,
      )

      setNewSubject("physics")
      setNewStartTime("")
      setNewEndTime2("")
      setNewQuestionCount2(0)
      setNewGoalId("")
      setNewNotes2("")
      setError("")
    } catch (e) {
      setError("Invalid data format")
    }
  }

  // Get available tasks for the selected subject
  const availableTasks = useMemo(() => {
    return tasks.filter((task) => task.subject === newSubject)
  }, [tasks, newSubject])

  // Sort logs by start time (newest first)
  const sortedLogs = [...logs].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Study Session Logs</CardTitle>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-1">
              <Plus size={16} />
              Add Manual Log
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Manual Study Log</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select
                  value={newSubject}
                  onValueChange={(value) => {
                    setNewSubject(value as Subject)
                    setNewGoalId("") // Reset goal when subject changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physics">Physics</SelectItem>
                    <SelectItem value="chemistry">Chemistry</SelectItem>
                    <SelectItem value="mathematics">Mathematics</SelectItem>
                    <SelectItem value="classes">Classes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={newEndTime2}
                  onChange={(e) => setNewEndTime2(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="questionCount">Questions Practiced</Label>
                <Input
                  id="questionCount"
                  type="number"
                  min="0"
                  value={newQuestionCount2}
                  onChange={(e) => setNewQuestionCount2(Number.parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal">Study Goal (Optional)</Label>
                <Select value={newGoalId} onValueChange={setNewGoalId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a goal (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific goal</SelectItem>
                    {availableTasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Session Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes about your progress"
                  value={newNotes2}
                  onChange={(e) => setNewNotes2(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAddManualLog}>Add Log</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {sortedLogs.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No study logs yet. Start the timer to begin tracking your study sessions!
          </p>
        ) : (
          <div className="space-y-4">
            {sortedLogs.map((log) => (
              <div key={log.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={SUBJECT_COLORS[log.subject]}>
                      {log.subject.charAt(0).toUpperCase() + log.subject.slice(1)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{formatDateTime(log.startTime)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingLog(log)
                            setNewEndTime(new Date(log.endTime).toISOString().slice(0, 16))
                          }}
                        >
                          <Edit size={16} />
                          <span className="sr-only">Edit End Time</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Study Log End Time</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input value={editingLog?.subject} disabled />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="startTime">Start Time (non-editable)</Label>
                            <Input
                              id="startTime"
                              type="datetime-local"
                              value={editingLog?.startTime.slice(0, 16)}
                              disabled
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="endTime">End Time</Label>
                            <Input
                              id="endTime"
                              type="datetime-local"
                              value={newEndTime}
                              onChange={(e) => setNewEndTime(e.target.value)}
                            />
                          </div>

                          {error && <p className="text-sm text-red-500">{error}</p>}
                        </div>
                        <div className="flex justify-end gap-2">
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button onClick={handleEditEndTime}>Save Changes</Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingLog(log)
                            setNewQuestionCount(log.questionCount)
                          }}
                        >
                          <BookOpen size={16} />
                          <span className="sr-only">Edit Question Count</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Questions Practiced</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input value={editingLog?.subject} disabled />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="questionCount">Questions Practiced</Label>
                            <Input
                              id="questionCount"
                              type="number"
                              min="0"
                              value={newQuestionCount}
                              onChange={(e) => setNewQuestionCount(Number.parseInt(e.target.value) || 0)}
                            />
                          </div>

                          {error && <p className="text-sm text-red-500">{error}</p>}
                        </div>
                        <div className="flex justify-end gap-2">
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button onClick={handleEditQuestionCount}>Save Changes</Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Add Notes Edit Button */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingLog(log)
                            setNewNotes(log.notes || "")
                          }}
                        >
                          <FileText size={16} />
                          <span className="sr-only">Edit Notes</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Session Notes</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input value={editingLog?.subject} disabled />
                          </div>

                          {editingLog?.goalTitle && (
                            <div className="space-y-2">
                              <Label htmlFor="goal">Goal</Label>
                              <Input value={editingLog?.goalTitle} disabled />
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor="notes">Session Notes</Label>
                            <Textarea
                              id="notes"
                              placeholder="Add notes about your progress"
                              value={newNotes}
                              onChange={(e) => setNewNotes(e.target.value)}
                              className="min-h-[150px]"
                            />
                          </div>

                          {error && <p className="text-sm text-red-500">{error}</p>}
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button onClick={handleEditNotes}>Save Notes</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button variant="ghost" size="icon" onClick={() => onDeleteLog(log.id)}>
                      <Trash2 size={16} className="text-red-500" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Started: </span>
                    <span>{formatDateTime(log.startTime)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ended: </span>
                    <span>{formatDateTime(log.endTime)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock size={14} className="mr-1 text-muted-foreground" />
                    <span className="font-medium">{formatDuration(log.duration)}</span>
                  </div>
                  <div className="flex items-center">
                    <BookOpen size={14} className="mr-1 text-muted-foreground" />
                    <span className="font-medium">{log.questionCount} questions</span>
                  </div>
                  {log.goalTitle && (
                    <div className="md:col-span-4 mt-2 text-sm">
                      <span className="text-muted-foreground">Goal: </span>
                      <span className="font-medium">{log.goalTitle}</span>
                    </div>
                  )}
                  {log.notes && (
                    <div className="md:col-span-4 mt-2 text-sm bg-muted/30 p-3 rounded-md">
                      <span className="text-muted-foreground font-medium">Notes: </span>
                      <p className="mt-1 whitespace-pre-line">{log.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
