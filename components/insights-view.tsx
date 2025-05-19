"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { Subject, Task, TimeLog, QuestionGoal } from "@/lib/types"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { useTheme } from "next-themes"
import StudyLogs from "./study-logs"
import WeeklyReport from "./weekly-report"
import DailyReport from "./daily-report"

interface InsightsViewProps {
  timeLogs: TimeLog[]
  tasks: Task[]
  questionGoal: QuestionGoal
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
  onUpdateQuestionGoal: (newGoal: number) => void
}

// Colors for the different subjects
const SUBJECT_COLORS = {
  physics: "#3b82f6", // blue
  chemistry: "#10b981", // green
  mathematics: "#f59e0b", // amber
  classes: "#8b5cf6", // purple
}

export default function InsightsView({
  timeLogs,
  tasks,
  questionGoal,
  onDeleteLog,
  onEditLogEndTime,
  onEditLogQuestionCount,
  onEditLogNotes,
  onAddManualLog,
  onUpdateQuestionGoal,
}: InsightsViewProps) {
  const [timeFrame, setTimeFrame] = useState<"today" | "week" | "month">("today")
  const [insightsTab, setInsightsTab] = useState<"charts" | "logs" | "weekly" | "daily">("charts")
  const { theme } = useTheme()
  const isDarkMode = theme === "dark"

  // Filter logs based on the selected time frame
  const getFilteredLogs = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    return timeLogs.filter((log) => {
      const logDate = new Date(log.timestamp)

      if (timeFrame === "today") {
        return logDate >= today
      } else if (timeFrame === "week") {
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        return logDate >= weekStart
      } else if (timeFrame === "month") {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        return logDate >= monthStart
      }

      return true
    })
  }

  const filteredLogs = getFilteredLogs()

  // Calculate total study time by subject
  const getTotalTimeBySubject = () => {
    const totals: Record<Subject, number> = {
      physics: 0,
      chemistry: 0,
      mathematics: 0,
      classes: 0,
    }

    filteredLogs.forEach((log) => {
      totals[log.subject] += log.duration
    })

    return totals
  }

  const totalTimeBySubject = getTotalTimeBySubject()

  // Calculate total questions by subject
  const getTotalQuestionsBySubject = () => {
    const totals: Record<Subject, number> = {
      physics: 0,
      chemistry: 0,
      mathematics: 0,
      classes: 0,
    }

    filteredLogs.forEach((log) => {
      totals[log.subject] += log.questionCount || 0
    })

    return totals
  }

  const totalQuestionsBySubject = getTotalQuestionsBySubject()

  // Calculate total questions for goal tracking (excluding classes)
  const totalQuestionsForGoal =
    totalQuestionsBySubject.physics + totalQuestionsBySubject.chemistry + totalQuestionsBySubject.mathematics

  // Prepare data for pie chart
  const pieChartData = Object.entries(totalTimeBySubject).map(([subject, duration]) => ({
    name: subject.charAt(0).toUpperCase() + subject.slice(1),
    value: Math.round(duration / 60), // Convert seconds to minutes
  }))

  // Prepare data for bar chart (daily distribution)
  const getBarChartData = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const dayData = days.map((day) => ({
      name: day,
      physics: 0,
      chemistry: 0,
      mathematics: 0,
      classes: 0,
    }))

    filteredLogs.forEach((log) => {
      const logDate = new Date(log.timestamp)
      const dayIndex = logDate.getDay()
      const minutes = Math.round(log.duration / 60)

      dayData[dayIndex][log.subject] += minutes
    })

    // If we're only looking at today, just return today's data
    if (timeFrame === "today") {
      const today = new Date().getDay()
      return [dayData[today]]
    }

    return dayData
  }

  const barChartData = getBarChartData()

  // Calculate task completion stats
  const getTaskStats = () => {
    const stats = {
      physics: { total: 0, completed: 0 },
      chemistry: { total: 0, completed: 0 },
      mathematics: { total: 0, completed: 0 },
      classes: { total: 0, completed: 0 },
    }

    tasks.forEach((task) => {
      stats[task.subject].total += 1
      if (task.completed) {
        stats[task.subject].completed += 1
      }
    })

    return stats
  }

  const taskStats = getTaskStats()

  // Format seconds as hours and minutes
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  // Calculate total study time
  const totalStudyTime = Object.values(totalTimeBySubject).reduce((sum, time) => sum + time, 0)

  // Calculate total questions
  const totalQuestions = Object.values(totalQuestionsBySubject).reduce((sum, count) => sum + count, 0)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center">Study Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="charts"
          value={insightsTab}
          onValueChange={(value) => setInsightsTab(value as "charts" | "logs" | "weekly" | "daily")}
          className="mb-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="charts">Charts & Stats</TabsTrigger>
            <TabsTrigger value="logs">Detailed Logs</TabsTrigger>
            <TabsTrigger value="weekly">Weekly Reports</TabsTrigger>
            <TabsTrigger value="daily">Daily Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="charts">
            <Tabs
              defaultValue="today"
              value={timeFrame}
              onValueChange={(value) => setTimeFrame(value as "today" | "week" | "month")}
              className="mb-6"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="week">This Week</TabsTrigger>
                <TabsTrigger value="month">This Month</TabsTrigger>
              </TabsList>
            </Tabs>

            {totalStudyTime === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No study data available for this time period.</p>
                <p className="text-sm mt-2">Start using the timer to track your study sessions!</p>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Total Study Time</p>
                        <p className="text-3xl font-bold">{formatTime(totalStudyTime)}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Questions Solved</p>
                        <div className="flex items-center justify-center gap-1">
                          <p className="text-3xl font-bold">{totalQuestionsForGoal}</p>
                          <p className="text-lg text-muted-foreground">/ {questionGoal.daily}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Most Studied</p>
                        <p className="text-3xl font-bold capitalize">
                          {Object.entries(totalTimeBySubject).reduce(
                            (max, [subject, time]) =>
                              time > totalTimeBySubject[max as Subject] ? (subject as Subject) : max,
                            "physics" as Subject,
                          )}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Tasks Completed</p>
                        <p className="text-3xl font-bold">
                          {Object.values(taskStats).reduce((sum, stat) => sum + stat.completed, 0)}/
                          {Object.values(taskStats).reduce((sum, stat) => sum + stat.total, 0)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Pie Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-center text-base">Time Distribution by Subject</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            {isDarkMode && <rect width="100%" height="100%" fill="#1f2937" />}
                            <Pie
                              data={pieChartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={SUBJECT_COLORS[entry.name.toLowerCase() as Subject]}
                                />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value} min`, "Study Time"]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="flex justify-center gap-4 mt-4">
                        {Object.entries(SUBJECT_COLORS).map(([subject, color]) => (
                          <div key={subject} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-sm capitalize">{subject}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bar Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-center text-base">
                        {timeFrame === "today" ? "Today's Study Time" : "Daily Study Distribution"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={barChartData}
                            margin={{
                              top: 20,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            {isDarkMode && <rect width="100%" height="100%" fill="#1f2937" />}
                            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} />
                            <XAxis dataKey="name" stroke={isDarkMode ? "#d1d5db" : "#374151"} />
                            <YAxis
                              label={{
                                value: "Minutes",
                                angle: -90,
                                position: "insideLeft",
                                fill: isDarkMode ? "#d1d5db" : "#374151",
                              }}
                              stroke={isDarkMode ? "#d1d5db" : "#374151"}
                            />
                            <Tooltip
                              contentStyle={
                                isDarkMode
                                  ? { backgroundColor: "#1f2937", borderColor: "#374151", color: "#f9fafb" }
                                  : undefined
                              }
                            />
                            <Legend wrapperStyle={isDarkMode ? { color: "#f9fafb" } : undefined} />
                            <Bar dataKey="physics" name="Physics" fill={SUBJECT_COLORS.physics} />
                            <Bar dataKey="chemistry" name="Chemistry" fill={SUBJECT_COLORS.chemistry} />
                            <Bar dataKey="mathematics" name="Mathematics" fill={SUBJECT_COLORS.mathematics} />
                            <Bar dataKey="classes" name="Classes" fill={SUBJECT_COLORS.classes} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="logs">
            <StudyLogs
              logs={timeLogs}
              tasks={tasks}
              onDeleteLog={onDeleteLog}
              onEditLogEndTime={onEditLogEndTime}
              onEditLogQuestionCount={onEditLogQuestionCount}
              onEditLogNotes={onEditLogNotes}
              onAddManualLog={onAddManualLog}
            />
          </TabsContent>

          <TabsContent value="weekly">
            <WeeklyReport timeLogs={timeLogs} tasks={tasks} questionGoal={questionGoal} />
          </TabsContent>

          <TabsContent value="daily">
            <DailyReport timeLogs={timeLogs} tasks={tasks} questionGoal={questionGoal} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
