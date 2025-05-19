"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import StudyTimer from "@/components/study-timer"
import TaskManager from "@/components/task-manager"
import InsightsView from "@/components/insights-view"
import type { Subject, Task, TimeLog, QuestionGoal } from "@/lib/types"
import { ThemeToggle } from "@/components/theme-toggle"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, BookOpen } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>("timer")
  const [tasks, setTasks] = useState<Task[]>([])
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([])
  const [questionGoal, setQuestionGoal] = useState<QuestionGoal>({ daily: 80 })

  // Timer state moved to Dashboard component
  const [activeSubject, setActiveSubject] = useState<Subject>("physics")
  const [isRunning, setIsRunning] = useState(false)
  const [time, setTime] = useState(0)
  const [questionCount, setQuestionCount] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<string>("")

  // Add these refs to store the selected goal
  const goalIdRef = useRef<string | undefined>(undefined)
  const goalTitleRef = useRef<string | undefined>(undefined)

  // Add state for session notes
  const [sessionNotes, setSessionNotes] = useState<string>("")
  const [showNotesDialog, setShowNotesDialog] = useState<boolean>(false)
  const pendingLogRef = useRef<Omit<TimeLog, "notes"> | null>(null)

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedTasks = localStorage.getItem("study-tasks")
    const savedTimeLogs = localStorage.getItem("study-time-logs")
    const savedQuestionGoal = localStorage.getItem("study-question-goal")

    if (savedTasks) {
      setTasks(JSON.parse(savedTasks))
    }

    if (savedTimeLogs) {
      try {
        const parsedLogs = JSON.parse(savedTimeLogs)
        // Migrate old logs to new format if needed
        const migratedLogs = parsedLogs.map((log: any) => {
          if (!log.startTime || !log.endTime) {
            // For old logs, estimate start and end times based on timestamp and duration
            const endTime = new Date(log.timestamp).toISOString()
            const startDate = new Date(log.timestamp)
            startDate.setSeconds(startDate.getSeconds() - log.duration)
            const startTime = startDate.toISOString()

            return {
              ...log,
              startTime,
              endTime,
              questionCount: log.questionCount || 0,
            }
          }
          return {
            ...log,
            questionCount: log.questionCount || 0,
          }
        })
        setTimeLogs(migratedLogs)
      } catch (error) {
        console.error("Error parsing time logs:", error)
        setTimeLogs([])
      }
    }

    if (savedQuestionGoal) {
      try {
        setQuestionGoal(JSON.parse(savedQuestionGoal))
      } catch (error) {
        console.error("Error parsing question goal:", error)
      }
    }
  }, [])

  // Timer management
  useEffect(() => {
    // Clean up interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("study-tasks", JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    localStorage.setItem("study-time-logs", JSON.stringify(timeLogs))
  }, [timeLogs])

  useEffect(() => {
    localStorage.setItem("study-question-goal", JSON.stringify(questionGoal))
  }, [questionGoal])

  // Calculate today's stats
  const todayStats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayLogs = timeLogs.filter((log) => {
      const logDate = new Date(log.startTime)
      return logDate >= today
    })

    // Calculate total study time by subject
    const timeBySubject: Record<Subject, number> = {
      physics: 0,
      chemistry: 0,
      mathematics: 0,
      classes: 0,
    }

    // Calculate questions by subject
    const questionsBySubject: Record<Subject, number> = {
      physics: 0,
      chemistry: 0,
      mathematics: 0,
      classes: 0,
    }

    todayLogs.forEach((log) => {
      timeBySubject[log.subject] += log.duration
      questionsBySubject[log.subject] += log.questionCount
    })

    // Calculate total questions for goal tracking (excluding classes)
    const totalQuestionsForGoal =
      questionsBySubject.physics + questionsBySubject.chemistry + questionsBySubject.mathematics

    return {
      timeBySubject,
      questionsBySubject,
      totalQuestionsForGoal,
    }
  }, [timeLogs])

  const addTask = (task: Task) => {
    setTasks([...tasks, task])
  }

  const toggleTaskCompletion = (taskId: string) => {
    setTasks(tasks.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task)))
  }

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter((task) => task.id !== taskId))
  }

  // Update the startTimer function to include the goal
  const startTimer = (goalId?: string, goalTitle?: string) => {
    if (!isRunning) {
      const now = new Date().toISOString()
      startTimeRef.current = now
      // Store the selected goal
      goalIdRef.current = goalId
      goalTitleRef.current = goalTitle
      setIsRunning(true)
      intervalRef.current = setInterval(() => {
        setTime((prevTime) => prevTime + 1)
      }, 1000)
    }
  }

  // Update the pauseTimer function to prompt for notes if a goal was selected
  const pauseTimer = () => {
    if (isRunning && intervalRef.current) {
      clearInterval(intervalRef.current)
      setIsRunning(false)

      // Log the study time when pausing
      if (time > 0) {
        const endTime = new Date().toISOString()

        // If a goal was selected, prompt for notes
        if (goalIdRef.current) {
          // Store the log data temporarily
          pendingLogRef.current = {
            id: Date.now().toString(),
            subject: activeSubject,
            duration: time,
            timestamp: endTime,
            startTime: startTimeRef.current,
            endTime,
            questionCount,
            goalId: goalIdRef.current,
            goalTitle: goalTitleRef.current,
          }

          // Show the notes dialog
          setSessionNotes("")
          setShowNotesDialog(true)
        } else {
          // No goal selected, log directly
          logStudyTime(
            activeSubject,
            time,
            startTimeRef.current,
            endTime,
            questionCount,
            goalIdRef.current,
            goalTitleRef.current,
          )
        }

        setTime(0) // Reset the timer after logging
        setQuestionCount(0) // Reset question count after logging
        // Reset goal refs
        goalIdRef.current = undefined
        goalTitleRef.current = undefined
      }
    }
  }

  // Handle saving notes and completing the log
  const handleSaveNotes = () => {
    if (pendingLogRef.current) {
      const log = pendingLogRef.current

      // Add the log with notes
      logStudyTime(
        log.subject,
        log.duration,
        log.startTime,
        log.endTime,
        log.questionCount,
        log.goalId,
        log.goalTitle,
        sessionNotes,
      )

      // Reset
      pendingLogRef.current = null
      setShowNotesDialog(false)
    }
  }

  // Handle skipping notes
  const handleSkipNotes = () => {
    if (pendingLogRef.current) {
      const log = pendingLogRef.current

      // Add the log without notes
      logStudyTime(log.subject, log.duration, log.startTime, log.endTime, log.questionCount, log.goalId, log.goalTitle)

      // Reset
      pendingLogRef.current = null
      setShowNotesDialog(false)
    }
  }

  // Update the changeSubject function to include the goal in the log
  const changeSubject = (subject: Subject) => {
    if (time > 0 && isRunning) {
      // Log the current subject's time before switching
      const endTime = new Date().toISOString()

      // If a goal was selected, prompt for notes
      if (goalIdRef.current) {
        // Store the log data temporarily
        pendingLogRef.current = {
          id: Date.now().toString(),
          subject: activeSubject,
          duration: time,
          timestamp: endTime,
          startTime: startTimeRef.current,
          endTime,
          questionCount,
          goalId: goalIdRef.current,
          goalTitle: goalTitleRef.current,
        }

        // Show the notes dialog
        setSessionNotes("")
        setShowNotesDialog(true)

        // Reset timer when changing subjects
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
        setIsRunning(false)
        setTime(0)
        setQuestionCount(0) // Reset question count when changing subjects
        // Reset goal refs
        goalIdRef.current = undefined
        goalTitleRef.current = undefined

        // Set new subject
        setActiveSubject(subject)
      } else {
        // No goal selected, log directly
        logStudyTime(activeSubject, time, startTimeRef.current, endTime, questionCount)

        // Reset timer when changing subjects
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
        setIsRunning(false)
        setTime(0)
        setQuestionCount(0) // Reset question count when changing subjects

        // Set new subject
        setActiveSubject(subject)

        // Restart timer with new subject
        const now = new Date().toISOString()
        startTimeRef.current = now
        setIsRunning(true)
        intervalRef.current = setInterval(() => {
          setTime((prevTime) => prevTime + 1)
        }, 1000)
      }
    } else {
      setActiveSubject(subject)
    }
  }

  const handleQuestionCountChange = (count: number) => {
    setQuestionCount(count)
  }

  // Update the logStudyTime function to include notes
  const logStudyTime = (
    subject: Subject,
    duration: number,
    startTime: string,
    endTime: string,
    questionCount: number,
    goalId?: string,
    goalTitle?: string,
    notes?: string,
  ) => {
    const newLog: TimeLog = {
      id: Date.now().toString(),
      subject,
      duration,
      timestamp: endTime, // Keep timestamp for backward compatibility
      startTime,
      endTime,
      questionCount,
      goalId,
      goalTitle,
      notes,
    }
    setTimeLogs([...timeLogs, newLog])
  }

  // Update the addManualStudyLog function to include notes
  const addManualStudyLog = (
    subject: Subject,
    startTime: string,
    endTime: string,
    questionCount = 0,
    goalId?: string,
    goalTitle?: string,
    notes?: string,
  ) => {
    const startDate = new Date(startTime)
    const endDate = new Date(endTime)
    const duration = Math.floor((endDate.getTime() - startDate.getTime()) / 1000)

    if (duration <= 0) {
      throw new Error("End time must be after start time")
    }

    const newLog: TimeLog = {
      id: Date.now().toString(),
      subject,
      duration,
      timestamp: endTime,
      startTime,
      endTime,
      questionCount,
      goalId,
      goalTitle,
      notes,
    }

    setTimeLogs([...timeLogs, newLog])
  }

  // Calculate total study time
  const calculateTotalStudyTime = () => {
    return timeLogs.reduce((total, log) => total + log.duration, 0)
  }

  // Format time as hours and minutes
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const totalStudyTime = calculateTotalStudyTime()

  const deleteStudyLog = (logId: string) => {
    setTimeLogs(timeLogs.filter((log) => log.id !== logId))
  }

  const editStudyLogEndTime = (logId: string, newEndTime: string) => {
    setTimeLogs(
      timeLogs.map((log) => {
        if (log.id === logId) {
          const startDate = new Date(log.startTime)
          const endDate = new Date(newEndTime)
          const duration = Math.floor((endDate.getTime() - startDate.getTime()) / 1000)

          if (duration <= 0) {
            throw new Error("End time must be after start time")
          }

          return { ...log, endTime: newEndTime, duration: duration, timestamp: newEndTime }
        }
        return log
      }),
    )
  }

  const editStudyLogQuestionCount = (logId: string, newQuestionCount: number) => {
    setTimeLogs(
      timeLogs.map((log) => {
        if (log.id === logId) {
          return { ...log, questionCount: newQuestionCount }
        }
        return log
      }),
    )
  }

  // Add function to edit notes
  const editStudyLogNotes = (logId: string, newNotes: string) => {
    setTimeLogs(
      timeLogs.map((log) => {
        if (log.id === logId) {
          return { ...log, notes: newNotes }
        }
        return log
      }),
    )
  }

  // Update question goal
  const updateQuestionGoal = (newGoal: number) => {
    setQuestionGoal({ ...questionGoal, daily: newGoal })
  }

  // Subject color mapping
  const SUBJECT_COLORS: Record<Subject, string> = {
    physics: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    chemistry: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    mathematics: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    classes: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-background text-foreground min-h-screen">
      <div className="flex justify-between items-center mb-6 relative">
        <div className="absolute left-0">
          <ThemeToggle />
        </div>
        <h1 className="text-3xl font-bold mx-auto">Study Tracker</h1>
      </div>

      {/* Total Study Time and Questions Card */}
      <Card className="mb-8">
        <CardContent className="py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Total Study Time */}
            <div className="flex flex-col items-center justify-center">
              <span className="text-4xl font-bold mb-2">{formatTime(totalStudyTime)}</span>
              <div className="flex items-center text-muted-foreground">
                <Clock className="mr-2 h-4 w-4" />
                <span>Total Study Time</span>
              </div>

              {/* Subject-specific study times */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 w-full max-w-xs">
                {Object.entries(todayStats.timeBySubject).map(([subject, time]) => (
                  <div key={`time-${subject}`} className="flex items-center">
                    <div
                      className={`w-2 h-2 rounded-full mr-2 ${SUBJECT_COLORS[subject as Subject].split(" ")[0]}`}
                    ></div>
                    <span className="text-sm capitalize">{subject}:</span>
                    <span className="text-sm font-medium ml-1">{formatTime(time)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Question Goal */}
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-4xl font-bold">{todayStats.totalQuestionsForGoal}</span>
                <span className="text-xl text-muted-foreground">/ {questionGoal.daily}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <BookOpen className="mr-2 h-4 w-4" />
                <span>Daily Question Goal</span>
              </div>

              {/* Subject-specific question counts */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 w-full max-w-xs">
                {Object.entries(todayStats.questionsBySubject)
                  .filter(([subject]) => subject !== "classes") // Exclude classes from question counts
                  .map(([subject, count]) => (
                    <div key={`questions-${subject}`} className="flex items-center">
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${SUBJECT_COLORS[subject as Subject].split(" ")[0]}`}
                      ></div>
                      <span className="text-sm capitalize">{subject}:</span>
                      <span className="text-sm font-medium ml-1">{count} questions</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="timer" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="timer">Study Timer</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="timer">
          <StudyTimer
            activeSubject={activeSubject}
            isRunning={isRunning}
            time={time}
            questionCount={questionCount}
            tasks={tasks} // Pass tasks to StudyTimer
            onChangeSubject={changeSubject}
            onStart={startTimer}
            onPause={pauseTimer}
            onQuestionCountChange={handleQuestionCountChange}
            questionGoal={questionGoal}
            onUpdateQuestionGoal={updateQuestionGoal}
          />
        </TabsContent>

        <TabsContent value="tasks">
          <TaskManager
            tasks={tasks}
            onAddTask={addTask}
            onToggleComplete={toggleTaskCompletion}
            onDeleteTask={deleteTask}
          />
        </TabsContent>

        <TabsContent value="insights">
          <InsightsView
            timeLogs={timeLogs}
            tasks={tasks}
            onDeleteLog={deleteStudyLog}
            onEditLogEndTime={editStudyLogEndTime}
            onEditLogQuestionCount={editStudyLogQuestionCount}
            onEditLogNotes={editStudyLogNotes}
            onAddManualLog={addManualStudyLog}
            questionGoal={questionGoal}
            onUpdateQuestionGoal={updateQuestionGoal}
          />
        </TabsContent>
      </Tabs>

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Session Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Add notes about your progress on "{goalTitleRef.current}"</Label>
              <Textarea
                id="notes"
                placeholder="What did you accomplish? What challenges did you face? What's next?"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" onClick={handleSkipNotes}>
              Skip
            </Button>
            <Button onClick={handleSaveNotes}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
