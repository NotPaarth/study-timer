"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import StudyTimer from "@/components/study-timer"
import TaskManager from "@/components/task-manager"
import InsightsView from "@/components/insights-view"
import type { Subject, Task, TimeLog, QuestionGoal, TestRecord, UserSettings, StreakData } from "@/lib/types"
import { ThemeToggle } from "@/components/theme-toggle"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, BookOpen, Flame, LogOut } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import TestTracker from "@/components/test-tracker"
import WeeklyReport from "@/components/weekly-report"
import DailyReport from "@/components/daily-report"
import StudyLogs from "@/components/study-logs"
import SettingsDialog from "@/components/settings-dialog"
import { DEFAULT_EXAM_CONFIGS, DEFAULT_STREAK_CONFIG } from "@/lib/types"
import { signOut } from "next-auth/react"

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>("timer")
  const [tasks, setTasks] = useState<Task[]>([])
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([])
  const [questionGoal, setQuestionGoal] = useState<QuestionGoal>({ daily: 80 })
  const [tests, setTests] = useState<TestRecord[]>([])

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

  // Add settings state
  const [settings, setSettings] = useState<UserSettings>({
    examType: "JEE",
    customSubjectNames: {},
    streakConfig: DEFAULT_STREAK_CONFIG,
  })

  // Add state for today's total time
  const [todayTotalTime, setTodayTotalTime] = useState(0)

  // Add streak state
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastStreakDate: new Date().toISOString(),
    streakHistory: []
  })

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("study-settings")
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }

    // Calculate today's total time from today's logs
    const now = new Date()
    const today = new Date()
    
    // Reset today to start of current day at 4:30 AM
    today.setHours(4, 30, 0, 0)
    today.setSeconds(0)
    today.setMilliseconds(0)
    
    // If current time is before 4:30 AM, look at previous day
    if (now.getHours() < 4 || (now.getHours() === 4 && now.getMinutes() < 30)) {
      today.setDate(today.getDate() - 1)
    }

    // Calculate total time from today's logs
    const savedTimeLogs = localStorage.getItem("study-time-logs")
    if (savedTimeLogs) {
      try {
        const parsedLogs = JSON.parse(savedTimeLogs)
        const todayLogs = parsedLogs.filter((log: TimeLog) => {
          const logDate = new Date(log.startTime)
          const localLogDate = new Date(logDate.getTime() - (logDate.getTimezoneOffset() * 60000))
          const localToday = new Date(today.getTime() - (today.getTimezoneOffset() * 60000))
          return localLogDate.getTime() >= localToday.getTime()
        })
        const totalTime = todayLogs.reduce((total: number, log: TimeLog) => total + log.duration, 0)
        setTodayTotalTime(totalTime)
        localStorage.setItem("today-total-time", totalTime.toString())
      } catch (error) {
        console.error("Error calculating today's total time:", error)
        setTodayTotalTime(0)
        localStorage.setItem("today-total-time", "0")
      }
    }

    localStorage.setItem("last-reset-time", now.toISOString())
  }, [])

  // Update today's total time whenever time logs change
  useEffect(() => {
    const now = new Date()
    const today = new Date()
    
    // Reset today to start of current day at 4:30 AM
    today.setHours(4, 30, 0, 0)
    today.setSeconds(0)
    today.setMilliseconds(0)
    
    // If current time is before 4:30 AM, look at previous day
    if (now.getHours() < 4 || (now.getHours() === 4 && now.getMinutes() < 30)) {
      today.setDate(today.getDate() - 1)
    }

    // Calculate total time from today's logs
    const todayLogs = timeLogs.filter((log) => {
      const logDate = new Date(log.startTime)
      const localLogDate = new Date(logDate.getTime() - (logDate.getTimezoneOffset() * 60000))
      const localToday = new Date(today.getTime() - (today.getTimezoneOffset() * 60000))
      return localLogDate.getTime() >= localToday.getTime()
    })

    const totalTime = todayLogs.reduce((total, log) => total + log.duration, 0)
    setTodayTotalTime(totalTime)
    localStorage.setItem("today-total-time", totalTime.toString())
  }, [timeLogs])

  // Load timer state from localStorage on component mount
  useEffect(() => {
    const savedTimerState = localStorage.getItem("study-timer-state")
    if (savedTimerState) {
      const { isRunning: wasRunning, startTime, subject, questionCount: savedQuestionCount } = JSON.parse(savedTimerState)
      
      if (wasRunning && startTime) {
        // Calculate elapsed time
        const startTimeMs = new Date(startTime).getTime()
        const currentTime = new Date().getTime()
        const elapsedSeconds = Math.floor((currentTime - startTimeMs) / 1000)
        
        // Resume timer with full elapsed time
        setIsRunning(true)
        setTime(elapsedSeconds)
        setActiveSubject(subject)
        setQuestionCount(savedQuestionCount)
        startTimeRef.current = startTime
      }
    }
  }, [])

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    if (isRunning) {
      localStorage.setItem("study-timer-state", JSON.stringify({
        isRunning,
        startTime: startTimeRef.current,
        subject: activeSubject,
        questionCount
      }))
    } else {
      localStorage.removeItem("study-timer-state")
    }
  }, [isRunning, activeSubject, questionCount])

  // Load data from localStorage on component mount
  useEffect(() => {
    const now = new Date()
    const today = new Date()
    
    // Reset today to start of current day at 4:30 AM
    today.setHours(4, 30, 0, 0)
    today.setSeconds(0)
    today.setMilliseconds(0)
    
    // If current time is before 4:30 AM, look at previous day
    if (now.getHours() < 4 || (now.getHours() === 4 && now.getMinutes() < 30)) {
      today.setDate(today.getDate() - 1)
    }

    // Load data from localStorage
    const loadData = () => {
      const savedTimeLogs = localStorage.getItem("study-time-logs")
      const savedTasks = localStorage.getItem("study-tasks")
      const savedQuestionGoal = localStorage.getItem("study-question-goal")
      const savedTests = localStorage.getItem("study-tests")
      const savedSettings = localStorage.getItem("study-settings")

      if (savedTimeLogs) {
        try {
          const parsedLogs = JSON.parse(savedTimeLogs)
          setTimeLogs(parsedLogs)
        } catch (error) {
          console.error("Error parsing time logs:", error)
          setTimeLogs([])
        }
      }

      if (savedTasks) {
        try {
          const parsedTasks = JSON.parse(savedTasks)
          // Only keep tasks from today
          const todayTasks = parsedTasks.filter((task: Task) => {
            const taskDate = new Date(task.createdAt)
            const localTaskDate = new Date(taskDate.getTime() - (taskDate.getTimezoneOffset() * 60000))
            const localToday = new Date(today.getTime() - (today.getTimezoneOffset() * 60000))
            return localTaskDate.getTime() >= localToday.getTime()
          })
          localStorage.setItem("study-tasks", JSON.stringify(todayTasks))
          setTasks(todayTasks)
        } catch (error) {
          console.error("Error parsing tasks:", error)
          setTasks([])
        }
      }

      if (savedSettings) {
        setSettings(JSON.parse(savedSettings))
      }

      if (savedQuestionGoal) {
        try {
          setQuestionGoal(JSON.parse(savedQuestionGoal))
        } catch (error) {
          console.error("Error parsing question goal:", error)
        }
      }

      if (savedTests) {
        try {
          setTests(JSON.parse(savedTests))
        } catch (error) {
          console.error("Error parsing tests:", error)
          setTests([])
        }
      }
    }

    // Load data
    loadData()
  }, [])

  // Add effect to update time based on start time
  useEffect(() => {
    if (isRunning && startTimeRef.current) {
      const updateTimer = () => {
        const startTime = new Date(startTimeRef.current).getTime()
        const currentTime = new Date().getTime()
        const elapsedSeconds = Math.floor((currentTime - startTime) / 1000)
        setTime(elapsedSeconds)
      }

      // Update immediately
      updateTimer()

      // Then update every second
      intervalRef.current = setInterval(updateTimer, 1000)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [isRunning])

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

  useEffect(() => {
    localStorage.setItem("study-tests", JSON.stringify(tests))
  }, [tests])

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem("study-settings", JSON.stringify(settings))
  }, [settings])

  // Calculate today's stats
  const todayStats = useMemo(() => {
    const now = new Date()
    const today = new Date()
    
    // Reset today to start of current day at 4:30 AM in local timezone
    today.setHours(4, 30, 0, 0)
    today.setSeconds(0)
    today.setMilliseconds(0)
    
    // If current time is before 4:30 AM, we should look at logs since 4:30 AM of the previous day
    if (now.getHours() < 4 || (now.getHours() === 4 && now.getMinutes() < 30)) {
      today.setDate(today.getDate() - 1)
    }

    console.log('Today cutoff:', today.toISOString())
    
    const todayLogs = timeLogs.filter((log) => {
      // Convert log time to local timezone for comparison
      const logDate = new Date(log.startTime)
      const localLogDate = new Date(logDate.getTime() - (logDate.getTimezoneOffset() * 60000))
      const localToday = new Date(today.getTime() - (today.getTimezoneOffset() * 60000))
      
      console.log('Checking log:', {
        startTime: log.startTime,
        logDate: logDate.toISOString(),
        localLogDate: localLogDate.toISOString(),
        isToday: localLogDate.getTime() >= localToday.getTime(),
        duration: log.duration
      })
      
      return localLogDate.getTime() >= localToday.getTime()
    })

    console.log('Today logs:', todayLogs)

    // Get the current exam config
    const examConfig = DEFAULT_EXAM_CONFIGS[settings.examType]

    // Initialize time and questions only for relevant subjects
    const timeBySubject: Record<Subject, number> = {
      classes: 0,
      ...Object.keys(examConfig.subjectMarks).reduce((acc, subject) => ({
        ...acc,
        [subject]: 0
      }), {})
    } as Record<Subject, number>

    // Initialize questions only for relevant subjects
    const questionsBySubject: Record<Subject, number> = {
      classes: 0,
      ...Object.keys(examConfig.subjectMarks).reduce((acc, subject) => ({
        ...acc,
        [subject]: 0
      }), {})
    } as Record<Subject, number>

    todayLogs.forEach((log) => {
      // Only count stats for relevant subjects
      if (log.subject === "classes" || Object.keys(examConfig.subjectMarks).includes(log.subject)) {
        timeBySubject[log.subject] += log.duration
        questionsBySubject[log.subject] += log.questionCount
      }
    })

    // Calculate total questions for goal tracking (excluding classes)
    const totalQuestionsForGoal = Object.entries(questionsBySubject)
      .filter(([subject]) => subject !== "classes" && Object.keys(examConfig.subjectMarks).includes(subject))
      .reduce((sum, [_, count]) => sum + count, 0)

    return {
      timeBySubject,
      questionsBySubject,
      totalQuestionsForGoal,
      examConfig, // Return examConfig so we can use it in the render
    }
  }, [timeLogs, settings.examType])

  // Use examConfig from todayStats
  const examConfig = todayStats.examConfig

  const addTask = (task: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    }
    setTasks([...tasks, newTask])
  }

  const toggleTaskCompletion = (taskId: string) => {
    setTasks(tasks.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task)))
  }

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter((task) => task.id !== taskId))
  }

  // Update the startTimer function
  const startTimer = (goalId?: string, goalTitle?: string) => {
    if (!isRunning) {
      const now = new Date().toISOString()
      startTimeRef.current = now
      goalIdRef.current = goalId
      goalTitleRef.current = goalTitle
      setIsRunning(true)
    }
  }

  // Update the pauseTimer function
  const pauseTimer = () => {
    if (isRunning) {
      setIsRunning(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      // Remove timer state from localStorage
      localStorage.removeItem("study-timer-state")

      // Calculate final duration based on timestamps
      const startTime = new Date(startTimeRef.current).getTime()
      const endTime = new Date().getTime()
      const finalDuration = Math.floor((endTime - startTime) / 1000)

      if (finalDuration > 0) {
        const endTimeISO = new Date().toISOString()

        // Update today's total time
        const newTotalTime = todayTotalTime + finalDuration
        setTodayTotalTime(newTotalTime)
        localStorage.setItem("today-total-time", newTotalTime.toString())

        // If a goal was selected, prompt for notes
        if (goalIdRef.current) {
          // Store the log data temporarily
          pendingLogRef.current = {
            id: Date.now().toString(),
            subject: activeSubject,
            duration: finalDuration,
            timestamp: endTimeISO,
            startTime: startTimeRef.current,
            endTime: endTimeISO,
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
            finalDuration,
            startTimeRef.current,
            endTimeISO,
            questionCount,
            goalIdRef.current,
            goalTitleRef.current,
          )
        }

        setTime(0)
        setQuestionCount(0)
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

  // Update the changeSubject function
  const changeSubject = (subject: Subject) => {
    if (time > 0 && isRunning) {
      // Calculate final duration based on timestamps
      const startTime = new Date(startTimeRef.current).getTime()
      const endTime = new Date().getTime()
      const finalDuration = Math.floor((endTime - startTime) / 1000)

      const endTimeISO = new Date().toISOString()

      // If a goal was selected, prompt for notes
      if (goalIdRef.current) {
        // Store the log data temporarily
        pendingLogRef.current = {
          id: Date.now().toString(),
          subject: activeSubject,
          duration: finalDuration,
          timestamp: endTimeISO,
          startTime: startTimeRef.current,
          endTime: endTimeISO,
          questionCount,
          goalId: goalIdRef.current,
          goalTitle: goalTitleRef.current,
        }

        // Show the notes dialog
        setSessionNotes("")
        setShowNotesDialog(true)

        // Reset timer
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
        setIsRunning(false)
        setTime(0)
        setQuestionCount(0)
        goalIdRef.current = undefined
        goalTitleRef.current = undefined

        // Set new subject
        setActiveSubject(subject)
      } else {
        // No goal selected, log directly
        logStudyTime(
          activeSubject,
          finalDuration,
          startTimeRef.current,
          endTimeISO,
          questionCount
        )

        // Reset timer and start new session
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
        setIsRunning(false)
        setTime(0)
        setQuestionCount(0)

        // Set new subject and start new timer
        setActiveSubject(subject)
        const now = new Date().toISOString()
        startTimeRef.current = now
        setIsRunning(true)
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
    botany: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    zoology: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
    classes: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  }

  // Test management functions
  const addTest = (test: Omit<TestRecord, "id">) => {
    const newTest: TestRecord = {
      ...test,
      id: Date.now().toString(),
    }
    setTests([...tests, newTest])
  }

  const deleteTest = (id: string) => {
    setTests(tests.filter((test) => test.id !== id))
  }

  const editTest = (id: string, updatedTest: Omit<TestRecord, "id">) => {
    setTests(tests.map((test) => test.id === id ? { ...updatedTest, id } : test))
  }

  // Function to get display name for a subject
  const getSubjectDisplayName = (subject: string) => {
    return settings.customSubjectNames[subject] || subject
  }

  // Update settings
  const handleUpdateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings)
    
    // If exam type changed, we need to reset some data
    if (newSettings.examType !== settings.examType) {
      // Reset active subject to first valid subject for new exam type
      const validSubjects = Object.keys(DEFAULT_EXAM_CONFIGS[newSettings.examType].subjectMarks)
      setActiveSubject(validSubjects[0] as Subject)

      // Reset time logs for invalid subjects
      setTimeLogs(prevLogs => prevLogs.filter(log => 
        log.subject === "classes" || 
        Object.keys(DEFAULT_EXAM_CONFIGS[newSettings.examType].subjectMarks).includes(log.subject)
      ))

      // Reset tasks for invalid subjects
      setTasks(prevTasks => prevTasks.filter(task => 
        task.subject === "classes" || 
        Object.keys(DEFAULT_EXAM_CONFIGS[newSettings.examType].subjectMarks).includes(task.subject)
      ))

      // Clear tests as they have different marking schemes
      setTests([])
    }
  }

  // Filter tasks for today
  const todayTasks = useMemo(() => {
    const now = new Date()
    const today = new Date()
    
    // Reset today to start of current day at 4:30 AM in local timezone
    today.setHours(4, 30, 0, 0)
    today.setSeconds(0)
    today.setMilliseconds(0)
    
    // If current time is before 4:30 AM, we should look at tasks since 4:30 AM of the previous day
    if (now.getHours() < 4 || (now.getHours() === 4 && now.getMinutes() < 30)) {
      today.setDate(today.getDate() - 1)
    }

    return tasks.filter(task => {
      const taskDate = new Date(task.createdAt)
      const localTaskDate = new Date(taskDate.getTime() - (taskDate.getTimezoneOffset() * 60000))
      const localToday = new Date(today.getTime() - (today.getTimezoneOffset() * 60000))
      return localTaskDate.getTime() >= localToday.getTime()
    })
  }, [tasks])

  // Function to check if streak requirements are met for a given date
  const checkStreakRequirements = (date: Date) => {
    const startOfDay = new Date(date)
    startOfDay.setHours(4, 30, 0, 0) // Set to 4:30 AM
    
    const endOfDay = new Date(date)
    endOfDay.setDate(endOfDay.getDate() + 1)
    endOfDay.setHours(4, 29, 59, 999) // Set to 4:29:59.999 AM next day

    // Filter logs for the given day
    const dayLogs = timeLogs.filter(log => {
      const logDate = new Date(log.startTime)
      return logDate >= startOfDay && logDate <= endOfDay
    })

    // Calculate total study hours
    const totalHours = dayLogs.reduce((total, log) => total + log.duration / 3600, 0)

    // Calculate total questions
    const totalQuestions = dayLogs.reduce((total, log) => total + log.questionCount, 0)

    // Check if requirements are met
    return totalHours >= settings.streakConfig.minStudyHours &&
           totalQuestions >= settings.streakConfig.minQuestions
  }

  // Function to update streak data
  const updateStreak = () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const lastStreakDate = new Date(streakData.lastStreakDate)
    const todayMet = checkStreakRequirements(today)
    const yesterdayMet = checkStreakRequirements(yesterday)

    let newStreak = streakData.currentStreak
    let newHistory = [...streakData.streakHistory]

    // Update today's status
    const todayStr = today.toISOString()
    const existingTodayIndex = newHistory.findIndex(h => 
      new Date(h.date).toDateString() === today.toDateString()
    )

    if (existingTodayIndex >= 0) {
      newHistory[existingTodayIndex].maintained = todayMet
    } else {
      newHistory.push({ date: todayStr, maintained: todayMet })
    }

    // Check if streak is broken
    const isStreakBroken = !yesterdayMet && 
      lastStreakDate.toDateString() === yesterday.toDateString()

    if (isStreakBroken) {
      newStreak = 0
    }

    // Update current streak
    if (todayMet) {
      if (lastStreakDate.toDateString() === yesterday.toDateString() && yesterdayMet) {
        newStreak += 1
      } else if (lastStreakDate.toDateString() !== today.toDateString()) {
        newStreak = 1
      }
    }

    // Update streak data
    const newStreakData = {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, streakData.longestStreak),
      lastStreakDate: todayStr,
      streakHistory: newHistory
    }

    setStreakData(newStreakData)
    localStorage.setItem('study-streak-data', JSON.stringify(newStreakData))
  }

  // Load streak data from localStorage
  useEffect(() => {
    const savedStreakData = localStorage.getItem('study-streak-data')
    if (savedStreakData) {
      setStreakData(JSON.parse(savedStreakData))
    }
  }, [])

  // Update streak whenever time logs change
  useEffect(() => {
    updateStreak()
  }, [timeLogs])

  return (
    <div className="container mx-auto px-4 py-8 bg-background text-foreground min-h-screen">
      <div className="flex justify-between items-center mb-6 relative">
        <div className="absolute left-0">
          <ThemeToggle />
        </div>
        <h1 className="text-3xl font-bold mx-auto">Study Tracker</h1>
        <div className="absolute right-0 flex items-center gap-2">
          <SettingsDialog
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => signOut()}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Total Study Time, Questions, and Streak Card */}
      <Card className="mb-8">
        <CardContent className="py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Study Time */}
            <div className="flex flex-col items-center justify-center">
              <span className="text-4xl font-bold mb-2">{formatTime(todayTotalTime)}</span>
              <div className="flex items-center text-muted-foreground">
                <Clock className="mr-2 h-4 w-4" />
                <span>Total Study Time</span>
              </div>

              {/* Subject-specific study times */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 w-full max-w-xs">
                {Object.entries(todayStats.timeBySubject)
                  .filter(([subject]) => 
                    subject === "classes" || 
                    Object.keys(examConfig.subjectMarks).includes(subject)
                  )
                  .map(([subject, time]) => (
                    <div key={`time-${subject}`} className="flex items-center">
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${SUBJECT_COLORS[subject as Subject].split(" ")[0]}`}
                      ></div>
                      <span className="text-sm capitalize">{getSubjectDisplayName(subject)}:</span>
                      <span className="text-sm font-medium ml-1">{formatTime(time)}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Daily Question Goal */}
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-baseline">
                <span className="text-4xl font-bold">{todayStats.totalQuestionsForGoal}</span>
                <span className="text-xl text-muted-foreground ml-2">/ {questionGoal.daily}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <BookOpen className="mr-2 h-4 w-4" />
                <span>Questions Solved Today</span>
              </div>

              {/* Subject-specific question counts */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 w-full max-w-xs">
                {Object.entries(todayStats.questionsBySubject)
                  .filter(([subject]) => 
                    subject === "classes" || 
                    Object.keys(examConfig.subjectMarks).includes(subject)
                  )
                  .map(([subject, count]) => (
                    <div key={`questions-${subject}`} className="flex items-center">
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${SUBJECT_COLORS[subject as Subject].split(" ")[0]}`}
                      ></div>
                      <span className="text-sm capitalize">{getSubjectDisplayName(subject)}:</span>
                      <span className="text-sm font-medium ml-1">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Streak Information */}
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-baseline">
                <span className="text-4xl font-bold">{streakData.currentStreak}</span>
                <span className="text-xl text-muted-foreground ml-2">days</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <Flame className="mr-2 h-4 w-4" />
                <span>Current Streak</span>
              </div>
              <div className="mt-4 text-center">
                <div className="text-sm text-muted-foreground">
                  Longest Streak: {streakData.longestStreak} days
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Daily Goals:
                  <br />
                  {settings.streakConfig.minStudyHours}h study time
                  <br />
                  {settings.streakConfig.minQuestions} questions
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="timer" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="timer">Study Timer</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="timer">
          <StudyTimer
            activeSubject={activeSubject}
            isRunning={isRunning}
            time={time}
            questionCount={questionCount}
            tasks={tasks}
            questionGoal={questionGoal}
            settings={settings}
            onChangeSubject={changeSubject}
            onStart={startTimer}
            onPause={pauseTimer}
            onQuestionCountChange={handleQuestionCountChange}
            onUpdateQuestionGoal={updateQuestionGoal}
          />
        </TabsContent>

        <TabsContent value="tasks">
          <TaskManager
            tasks={todayTasks}
            onAddTask={addTask}
            onToggleComplete={toggleTaskCompletion}
            onDeleteTask={deleteTask}
          />
        </TabsContent>

        <TabsContent value="tests">
          <TestTracker
            tests={tests}
            settings={settings}
            onAddTest={addTest}
            onDeleteTest={deleteTest}
            onEditTest={editTest}
          />
        </TabsContent>

        <TabsContent value="insights">
          <Tabs defaultValue="overview">
            <TabsList className="w-full grid grid-cols-4 mb-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="weekly">Weekly Report</TabsTrigger>
              <TabsTrigger value="daily">Daily Report</TabsTrigger>
              <TabsTrigger value="logs">Study Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <InsightsView
                timeLogs={timeLogs}
                tasks={tasks}
                tests={tests}
                questionGoal={questionGoal}
                settings={settings}
                onDeleteLog={deleteStudyLog}
                onEditLogEndTime={editStudyLogEndTime}
                onEditLogQuestionCount={editStudyLogQuestionCount}
                onEditLogNotes={editStudyLogNotes}
                onAddManualLog={addManualStudyLog}
                onUpdateQuestionGoal={updateQuestionGoal}
              />
            </TabsContent>

            <TabsContent value="weekly">
              <WeeklyReport
                timeLogs={timeLogs}
                tasks={tasks}
                tests={tests}
                questionGoal={questionGoal}
              />
            </TabsContent>

            <TabsContent value="daily">
              <DailyReport
                timeLogs={timeLogs}
                tasks={tasks}
                tests={tests}
                questionGoal={questionGoal}
              />
            </TabsContent>

            <TabsContent value="logs">
              <StudyLogs
                logs={timeLogs}
                tasks={tasks}
                onDeleteLog={deleteStudyLog}
                onEditLogEndTime={editStudyLogEndTime}
                onEditLogQuestionCount={editStudyLogQuestionCount}
                onEditLogNotes={editStudyLogNotes}
                onAddManualLog={addManualStudyLog}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Add notes for this study session</Label>
              <Textarea
                id="notes"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="What did you work on? Any challenges or insights?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                // Log without notes
                if (pendingLogRef.current) {
                  logStudyTime(
                    pendingLogRef.current.subject,
                    pendingLogRef.current.duration,
                    pendingLogRef.current.startTime,
                    pendingLogRef.current.endTime,
                    pendingLogRef.current.questionCount,
                    pendingLogRef.current.goalId,
                    pendingLogRef.current.goalTitle,
                  )
                }
                setShowNotesDialog(false)
                pendingLogRef.current = null
                setSessionNotes("")
              }}
            >
              Skip Notes
            </Button>
            <Button
              onClick={() => {
                // Log with notes
                if (pendingLogRef.current) {
                  logStudyTime(
                    pendingLogRef.current.subject,
                    pendingLogRef.current.duration,
                    pendingLogRef.current.startTime,
                    pendingLogRef.current.endTime,
                    pendingLogRef.current.questionCount,
                    pendingLogRef.current.goalId,
                    pendingLogRef.current.goalTitle,
                    sessionNotes,
                  )
                }
                setShowNotesDialog(false)
                pendingLogRef.current = null
                setSessionNotes("")
              }}
            >
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
