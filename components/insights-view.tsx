"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { Subject, Task, TimeLog, QuestionGoal, TestRecord, UserSettings } from "@/lib/types"
import { DEFAULT_EXAM_CONFIGS } from "@/lib/types"
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
  LineChart,
  Line,
} from "recharts"
import { useTheme } from "next-themes"
import StudyLogs from "./study-logs"
import WeeklyReport from "./weekly-report"
import DailyReport from "./daily-report"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface InsightsViewProps {
  timeLogs: TimeLog[]
  tasks: Task[]
  tests: TestRecord[]
  questionGoal: QuestionGoal
  settings: UserSettings
  onDeleteLog: (id: string) => void
  onEditLogEndTime: (id: string, newEndTime: string) => void
  onEditLogQuestionCount: (id: string, newQuestionCount: number) => void
  onEditLogNotes: (id: string, newNotes: string) => void
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
  botany: "#22c55e", // emerald
  zoology: "#ef4444", // red
  classes: "#8b5cf6", // purple
}

export default function InsightsView({
  timeLogs,
  tasks,
  tests,
  questionGoal,
  settings,
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
    const today = new Date()
    
    // Set today to 4:30 AM of the current day
    today.setHours(4, 30, 0, 0)
    
    // If current time is before 4:30 AM, we should look at logs since 4:30 AM of the previous day
    if (now.getHours() < 4 || (now.getHours() === 4 && now.getMinutes() < 30)) {
      today.setDate(today.getDate() - 1)
    }

    return timeLogs.filter((log) => {
      const logDate = new Date(log.timestamp)

      if (timeFrame === "today") {
        return logDate >= today
      } else if (timeFrame === "week") {
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        weekStart.setHours(4, 30, 0, 0)
        return logDate >= weekStart
      } else if (timeFrame === "month") {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1, 4, 30, 0, 0)
        return logDate >= monthStart
      }

      return true
    })
  }

  const filteredLogs = getFilteredLogs()

  // Calculate total study time by subject
  const getTotalTimeBySubject = () => {
    // Initialize totals based on exam type
    const totals: Record<Subject, number> = {
      classes: 0,
      ...Object.keys(DEFAULT_EXAM_CONFIGS[settings.examType].subjectMarks).reduce((acc, subject) => ({
        ...acc,
        [subject]: 0
      }), {})
    } as Record<Subject, number>

    filteredLogs.forEach((log) => {
      if (totals[log.subject] !== undefined) {
        totals[log.subject] += log.duration
      }
    })

    return totals
  }

  const totalTimeBySubject = getTotalTimeBySubject()

  // Calculate total questions by subject
  const getTotalQuestionsBySubject = () => {
    // Initialize totals based on exam type
    const totals: Record<Subject, number> = {
      classes: 0,
      ...Object.keys(DEFAULT_EXAM_CONFIGS[settings.examType].subjectMarks).reduce((acc, subject) => ({
        ...acc,
        [subject]: 0
      }), {})
    } as Record<Subject, number>

    filteredLogs.forEach((log) => {
      if (totals[log.subject] !== undefined) {
        totals[log.subject] += log.questionCount || 0
      }
    })

    return totals
  }

  const totalQuestionsBySubject = getTotalQuestionsBySubject()

  // Calculate total questions for goal tracking (excluding classes)
  const totalQuestionsForGoal = Object.entries(totalQuestionsBySubject)
    .filter(([subject]) => subject !== "classes" && Object.keys(DEFAULT_EXAM_CONFIGS[settings.examType].subjectMarks).includes(subject))
    .reduce((sum, [_, count]) => sum + count, 0)

  // Prepare data for pie chart
  const pieChartData = Object.entries(totalTimeBySubject)
    .filter(([subject]) => totalTimeBySubject[subject as Subject] > 0)
    .map(([subject, duration]) => ({
      name: subject.charAt(0).toUpperCase() + subject.slice(1),
      value: Math.round(duration / 60), // Convert seconds to minutes
    }))

  // Prepare data for bar chart (daily distribution)
  const getBarChartData = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    
    type DayData = {
      name: string;
      classes: number;
    } & Record<Subject, number>

    const dayData = days.map((day) => {
      const baseData = {
        name: day,
        classes: 0,
      }
      
      // Add subject-specific data
      const subjectData = Object.keys(DEFAULT_EXAM_CONFIGS[settings.examType].subjectMarks)
        .reduce<Record<Subject, number>>((acc, subject) => {
          acc[subject as Subject] = 0
          return acc
        }, {} as Record<Subject, number>)

      return { ...baseData, ...subjectData } as DayData
    })

    filteredLogs.forEach((log) => {
      const logDate = new Date(log.timestamp)
      const dayIndex = logDate.getDay()
      const minutes = Math.round(log.duration / 60)

      const dayEntry = dayData[dayIndex]
      if (dayEntry) {
        dayEntry[log.subject] += minutes
      }
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
    type TaskStats = {
      [K in Subject]?: { total: number; completed: number }
    }

    const stats: TaskStats = {
      classes: { total: 0, completed: 0 },
      ...Object.keys(DEFAULT_EXAM_CONFIGS[settings.examType].subjectMarks).reduce((acc, subject) => ({
        ...acc,
        [subject]: { total: 0, completed: 0 }
      }), {})
    }

    tasks.forEach((task) => {
      if (stats[task.subject]) {
        stats[task.subject]!.total += 1
        if (task.completed) {
          stats[task.subject]!.completed += 1
        }
      }
    })

    return stats
  }

  const taskStats = getTaskStats()

  // Calculate test performance stats
  const getTestStats = () => {
    type TestStats = Record<string, {
      totalTests: number;
      avgScore: number;
      avgAccuracy: number;
      topicsTested?: string[];
    }>

    const stats = Object.keys(DEFAULT_EXAM_CONFIGS[settings.examType].subjectMarks)
      .reduce<TestStats>((acc, subject) => ({
        ...acc,
        [subject]: { totalTests: 0, avgScore: 0, avgAccuracy: 0, topicsTested: [] }
      }), {})

    // Filter tests based on timeframe
    const filteredTests = tests.filter(test => {
      const testDate = new Date(test.date)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      if (timeFrame === "today") {
        return testDate >= today
      } else if (timeFrame === "week") {
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        return testDate >= weekStart
      } else if (timeFrame === "month") {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        return testDate >= monthStart
      }
      return true
    })

    filteredTests.forEach((test) => {
      if (test.subjectData) {
        Object.entries(test.subjectData).forEach(([subject, data]) => {
          if (stats[subject] && data.questionsAttempted > 0) {
            stats[subject].totalTests++
            stats[subject].avgScore = (stats[subject].avgScore * (stats[subject].totalTests - 1) + data.score) / stats[subject].totalTests
            stats[subject].avgAccuracy = (stats[subject].avgAccuracy * (stats[subject].totalTests - 1) + (data.correctAnswers / data.questionsAttempted) * 100) / stats[subject].totalTests
            
            // Add topics if available
            if (data.topicsTested) {
              stats[subject].topicsTested = Array.from(new Set([
                ...(stats[subject].topicsTested || []),
                ...data.topicsTested
              ]))
            }
          }
        })
      }
    })

    return stats
  }

  const testStats = getTestStats()

  // Performance Trends
  const getTestTrends = () => {
    const trends: Record<string, Array<{ date: string; score: number; accuracy: number }>> = {}

    // Filter and sort tests by date
    const filteredTests = tests
      .filter(test => {
        const testDate = new Date(test.date)
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        if (timeFrame === "today") {
          return testDate >= today
        } else if (timeFrame === "week") {
          const weekStart = new Date(today)
          weekStart.setDate(today.getDate() - today.getDay())
          return testDate >= weekStart
        } else if (timeFrame === "month") {
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
          return testDate >= monthStart
        }
        return true
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Process each test
    filteredTests.forEach(test => {
      if (test.subjectData) {
        Object.entries(test.subjectData).forEach(([subject, data]) => {
          if (!trends[subject]) {
            trends[subject] = []
          }

          if (data.questionsAttempted > 0) {
            trends[subject].push({
              date: format(new Date(test.date), "MMM d"),
              score: data.score,
              accuracy: (data.correctAnswers / data.questionsAttempted) * 100
            })
          }
        })
      }
    })

    return trends
  }

  const testTrends = getTestTrends()

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

  // Group logs by day
  const dailyStats = useMemo(() => {
    const stats = new Map<string, { totalTime: number, questionsBySubject: Partial<Record<Subject, number>> }>()
    
    timeLogs.forEach(log => {
      const date = new Date(log.startTime)
      // Set time to 4:30 AM to match our day boundary
      date.setHours(4, 30, 0, 0)
      const dateKey = date.toISOString().split('T')[0]
      
      if (!stats.has(dateKey)) {
        // Initialize with only the subjects for current exam type
        const examConfig = DEFAULT_EXAM_CONFIGS[settings.examType]
        const initialQuestions = {
          classes: 0,
          ...Object.keys(examConfig.subjectMarks).reduce((acc, subject) => ({
            ...acc,
            [subject]: 0
          }), {})
        }
        
        stats.set(dateKey, {
          totalTime: 0,
          questionsBySubject: initialQuestions
        })
      }
      
      const dayStats = stats.get(dateKey)!
      dayStats.totalTime += log.duration
      if (dayStats.questionsBySubject[log.subject] !== undefined) {
        dayStats.questionsBySubject[log.subject]! += log.questionCount
      }
    })
    
    // Convert to array and sort by date (newest first)
    return Array.from(stats.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, stats]) => ({
        date,
        ...stats
      }))
  }, [timeLogs, settings.examType])

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
                            <Bar dataKey="botany" name="Botany" fill={SUBJECT_COLORS.botany} />
                            <Bar dataKey="zoology" name="Zoology" fill={SUBJECT_COLORS.zoology} />
                            <Bar dataKey="classes" name="Classes" fill={SUBJECT_COLORS.classes} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Test Performance Section */}
                <div className="mt-8 space-y-8">
                  <h3 className="text-lg font-semibold mb-4">Test Performance</h3>
                  
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(testStats).map(([subject, stats]) => (
                      <Card key={subject}>
                        <CardContent className="pt-6">
                          <h4 className="font-medium capitalize mb-4">{subject}</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tests Taken</span>
                              <span>{stats.totalTests}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Avg Score</span>
                              <span>{stats.avgScore.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Avg Accuracy</span>
                              <span>{stats.avgAccuracy.toFixed(1)}%</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Performance Trends */}
                  {Object.entries(testTrends).map(([subject, trends]) => {
                    if (trends.length === 0) return null;

                    // Get topic statistics
                    const topicStats = trends.reduce((acc, trend) => {
                      if (!acc[trend.date]) {
                        acc[trend.date] = { count: 0, totalScore: 0 }
                      }
                      acc[trend.date].count++;
                      acc[trend.date].totalScore += trend.score;
                      return acc;
                    }, {} as Record<string, { count: number; totalScore: number }>);

                    return (
                      <Card key={`trend-${subject}`} className="mt-4">
                        <CardHeader>
                          <CardTitle className="text-base capitalize">{subject} Performance Trend</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {/* Performance Trend Chart */}
                          <div className="h-[200px] mb-6">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={trends}>
                                {isDarkMode && <rect width="100%" height="100%" fill="#1f2937" />}
                                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} />
                                <XAxis 
                                  dataKey="date" 
                                  stroke={isDarkMode ? "#d1d5db" : "#374151"}
                                />
                                <YAxis 
                                  stroke={isDarkMode ? "#d1d5db" : "#374151"}
                                  domain={[0, 100]}
                                />
                                <Tooltip
                                  contentStyle={
                                    isDarkMode
                                      ? { backgroundColor: "#1f2937", borderColor: "#374151", color: "#f9fafb" }
                                      : undefined
                                  }
                                />
                                <Legend />
                                <Line 
                                  type="monotone" 
                                  dataKey="score" 
                                  stroke={SUBJECT_COLORS[subject as Subject]} 
                                  name="Score"
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="accuracy" 
                                  stroke="#10b981" 
                                  name="Accuracy %"
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Topic Analysis */}
                          {Object.keys(topicStats).length > 0 && (
                            <div>
                              <h5 className="font-medium mb-3">Topic Analysis</h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {Object.entries(topicStats).map(([topic, stats]) => (
                                  <div key={topic} className="flex justify-between items-center p-2 bg-muted rounded">
                                    <span className="font-medium">{topic}</span>
                                    <div className="text-sm text-muted-foreground">
                                      <div>Tests: {stats.count}</div>
                                      <div>Avg Score: {(stats.totalScore / stats.count).toFixed(1)}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Performance Insights */}
                          <div className="mt-4">
                            <h5 className="font-medium mb-3">Performance Insights</h5>
                            <div className="space-y-2 text-sm text-muted-foreground">
                              {trends.length > 1 && (
                                <>
                                  {trends[trends.length - 1].score > trends[0].score ? (
                                    <p className="text-green-600 dark:text-green-400">
                                      ↗ Score improved by {(trends[trends.length - 1].score - trends[0].score).toFixed(1)} points
                                    </p>
                                  ) : trends[trends.length - 1].score < trends[0].score ? (
                                    <p className="text-red-600 dark:text-red-400">
                                      ↘ Score decreased by {(trends[0].score - trends[trends.length - 1].score).toFixed(1)} points
                                    </p>
                                  ) : (
                                    <p>→ Score remained stable</p>
                                  )}
                                  
                                  {trends[trends.length - 1].accuracy > trends[0].accuracy ? (
                                    <p className="text-green-600 dark:text-green-400">
                                      ↗ Accuracy improved by {(trends[trends.length - 1].accuracy - trends[0].accuracy).toFixed(1)}%
                                    </p>
                                  ) : trends[trends.length - 1].accuracy < trends[0].accuracy ? (
                                    <p className="text-red-600 dark:text-red-400">
                                      ↘ Accuracy decreased by {(trends[0].accuracy - trends[trends.length - 1].accuracy).toFixed(1)}%
                                    </p>
                                  ) : (
                                    <p>→ Accuracy remained stable</p>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
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
        </Tabs>

        {/* Daily Study History */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Study History</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {dailyStats.map(day => (
                  <Card key={day.date}>
                    <CardContent className="py-4">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {format(new Date(day.date), "MMMM d, yyyy")}
                          </h3>
                          <p className="text-muted-foreground">
                            Total Study Time: {formatTime(day.totalTime)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">
                            Total Questions: {
                              Object.values(day.questionsBySubject).reduce((a, b) => a + b, 0)
                            }
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(day.questionsBySubject)
                          .filter(([_, count]) => count > 0)
                          .map(([subject, count]) => (
                            <div key={subject} className="flex justify-between">
                              <span className="capitalize">{subject}:</span>
                              <span>{count} questions</span>
                            </div>
                          ))
                        }
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}
