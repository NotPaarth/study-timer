"use client"

import { useState, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  FileText,
  Printer,
  AlertTriangle,
} from "lucide-react"
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, differenceInDays, isWithinInterval } from "date-fns"
import type { Subject, Task, TimeLog, QuestionGoal } from "@/lib/types"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { useTheme } from "next-themes"
import { toast } from "@/components/ui/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"

interface WeeklyReportProps {
  timeLogs: TimeLog[]
  tasks: Task[]
  questionGoal: QuestionGoal
}

// Colors for the different subjects
const SUBJECT_COLORS = {
  physics: "#3b82f6", // blue
  chemistry: "#10b981", // green
  mathematics: "#f59e0b", // amber
  classes: "#8b5cf6", // purple
}

// Function to detect the browser
const detectBrowser = () => {
  if (typeof window === "undefined") {
    return null // Return null for server-side rendering
  }

  const userAgent = navigator.userAgent

  if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    return "safari"
  } else if (userAgent.includes("Chrome")) {
    return "chrome"
  } else if (userAgent.includes("Firefox")) {
    return "firefox"
  } else if (userAgent.includes("Edge")) {
    return "edge"
  } else {
    return "unknown"
  }
}

export default function WeeklyReport({ timeLogs, tasks, questionGoal }: WeeklyReportProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [isExporting, setIsExporting] = useState(false)
  const [showBrowserWarning, setShowBrowserWarning] = useState(false)
  const { theme } = useTheme()
  const isDarkMode = theme === "dark"
  const printRef = useRef<HTMLDivElement>(null)

  // Calculate week end date
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })

  // Previous week dates
  const previousWeekStart = startOfWeek(subWeeks(currentWeekStart, 1), { weekStartsOn: 1 })
  const previousWeekEnd = endOfWeek(previousWeekStart, { weekStartsOn: 1 })

  // Navigate to previous week
  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1))
  }

  // Navigate to next week
  const goToNextWeek = () => {
    const nextWeek = addWeeks(currentWeekStart, 1)
    // Don't allow navigating to future weeks
    if (differenceInDays(nextWeek, startOfWeek(new Date(), { weekStartsOn: 1 })) <= 0) {
      setCurrentWeekStart(nextWeek)
    }
  }

  // Filter logs for current week
  const currentWeekLogs = useMemo(() => {
    return timeLogs.filter((log) => {
      const logDate = new Date(log.startTime)
      return isWithinInterval(logDate, { start: currentWeekStart, end: currentWeekEnd })
    })
  }, [timeLogs, currentWeekStart, currentWeekEnd])

  // Filter logs for previous week
  const previousWeekLogs = useMemo(() => {
    return timeLogs.filter((log) => {
      const logDate = new Date(log.startTime)
      return isWithinInterval(logDate, { start: previousWeekStart, end: previousWeekEnd })
    })
  }, [timeLogs, previousWeekStart, previousWeekEnd])

  // Filter tasks for current week
  const currentWeekTasks = useMemo(() => {
    return tasks.filter((task) => {
      const taskDate = new Date(task.createdAt)
      return isWithinInterval(taskDate, { start: currentWeekStart, end: currentWeekEnd })
    })
  }, [tasks, currentWeekStart, currentWeekEnd])

  // Calculate total study time for current week
  const currentWeekTotalTime = useMemo(() => {
    return currentWeekLogs.reduce((total, log) => total + log.duration, 0)
  }, [currentWeekLogs])

  // Calculate total study time for previous week
  const previousWeekTotalTime = useMemo(() => {
    return previousWeekLogs.reduce((total, log) => total + log.duration, 0)
  }, [previousWeekLogs])

  // Calculate total questions for current week (excluding classes)
  const currentWeekTotalQuestions = useMemo(() => {
    return currentWeekLogs
      .filter((log) => log.subject !== "classes")
      .reduce((total, log) => total + (log.questionCount || 0), 0)
  }, [currentWeekLogs])

  // Calculate total questions for previous week (excluding classes)
  const previousWeekTotalQuestions = useMemo(() => {
    return previousWeekLogs
      .filter((log) => log.subject !== "classes")
      .reduce((total, log) => total + (log.questionCount || 0), 0)
  }, [previousWeekLogs])

  // Calculate time by subject for current week
  const currentWeekTimeBySubject = useMemo(() => {
    const result: Record<Subject, number> = {
      physics: 0,
      chemistry: 0,
      mathematics: 0,
      classes: 0,
    }

    currentWeekLogs.forEach((log) => {
      result[log.subject] += log.duration
    })

    return result
  }, [currentWeekLogs])

  // Calculate time by subject for previous week
  const previousWeekTimeBySubject = useMemo(() => {
    const result: Record<Subject, number> = {
      physics: 0,
      chemistry: 0,
      mathematics: 0,
      classes: 0,
    }

    previousWeekLogs.forEach((log) => {
      result[log.subject] += log.duration
    })

    return result
  }, [previousWeekLogs])

  // Calculate questions by subject for current week
  const currentWeekQuestionsBySubject = useMemo(() => {
    const result: Record<Subject, number> = {
      physics: 0,
      chemistry: 0,
      mathematics: 0,
      classes: 0,
    }

    currentWeekLogs.forEach((log) => {
      result[log.subject] += log.questionCount || 0
    })

    return result
  }, [currentWeekLogs])

  // Calculate questions by subject for previous week
  const previousWeekQuestionsBySubject = useMemo(() => {
    const result: Record<Subject, number> = {
      physics: 0,
      chemistry: 0,
      mathematics: 0,
      classes: 0,
    }

    previousWeekLogs.forEach((log) => {
      result[log.subject] += log.questionCount || 0
    })

    return result
  }, [previousWeekLogs])

  // Calculate task completion rate for current week
  const taskCompletionRate = useMemo(() => {
    if (currentWeekTasks.length === 0) return 0
    const completedTasks = currentWeekTasks.filter((task) => task.completed).length
    return Math.round((completedTasks / currentWeekTasks.length) * 100)
  }, [currentWeekTasks])

  // Calculate daily study time for current week
  const dailyStudyData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const data = days.map((day, index) => {
      const dayDate = new Date(currentWeekStart)
      dayDate.setDate(currentWeekStart.getDate() + index)

      // Initialize with zero values
      const result: any = { name: day, date: format(dayDate, "MMM d") }

      // Add subject times
      const subjects: Subject[] = ["physics", "chemistry", "mathematics", "classes"]
      subjects.forEach((subject) => {
        result[subject] = 0
      })

      // Fill in actual data
      currentWeekLogs.forEach((log) => {
        const logDate = new Date(log.startTime)
        if (
          logDate.getDate() === dayDate.getDate() &&
          logDate.getMonth() === dayDate.getMonth() &&
          logDate.getFullYear() === dayDate.getFullYear()
        ) {
          result[log.subject] += Math.round(log.duration / 60) // Convert to minutes
        }
      })

      return result
    })

    return data
  }, [currentWeekLogs, currentWeekStart])

  // Calculate daily question counts for current week
  const dailyQuestionData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const data = days.map((day, index) => {
      const dayDate = new Date(currentWeekStart)
      dayDate.setDate(currentWeekStart.getDate() + index)

      // Initialize with zero values
      const result: any = {
        name: day,
        date: format(dayDate, "MMM d"),
        physics: 0,
        chemistry: 0,
        mathematics: 0,
        total: 0,
      }

      // Fill in actual data
      currentWeekLogs
        .filter((log) => log.subject !== "classes")
        .forEach((log) => {
          const logDate = new Date(log.startTime)
          if (
            logDate.getDate() === dayDate.getDate() &&
            logDate.getMonth() === dayDate.getMonth() &&
            logDate.getFullYear() === dayDate.getFullYear()
          ) {
            result[log.subject] += log.questionCount || 0
            result.total += log.questionCount || 0
          }
        })

      return result
    })

    return data
  }, [currentWeekLogs, currentWeekStart])

  // Calculate week-over-week change
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
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

  // Calculate daily question goal
  const dailyQuestionGoal = questionGoal.daily

  // Calculate weekly question goal (daily goal * 7)
  const weeklyQuestionGoal = dailyQuestionGoal * 7

  // Generate recommendations based on the data
  const generateRecommendations = () => {
    const recommendations = []

    // Check if there's a significant decrease in study time
    if (calculateChange(currentWeekTotalTime, previousWeekTotalTime) < -20) {
      recommendations.push(
        "Your study time has decreased significantly this week. Try to allocate more time for studying.",
      )
    }

    // Check for subjects with low study time
    Object.entries(currentWeekTimeBySubject).forEach(([subject, time]) => {
      if (time < 1800 && subject !== "classes") {
        // Less than 30 minutes
        recommendations.push(
          `You've spent very little time on ${subject} this week. Consider allocating more time to it.`,
        )
      }
    })

    // Check for subjects with low question count
    Object.entries(currentWeekQuestionsBySubject).forEach(([subject, count]) => {
      if (count < 5 && currentWeekTimeBySubject[subject as Subject] > 1800 && subject !== "classes") {
        // Less than 5 questions but more than 30 minutes
        recommendations.push(
          `You've only solved ${count} questions in ${subject} despite studying for ${formatTime(
            currentWeekTimeBySubject[subject as Subject],
          )}. Try to focus more on solving problems.`,
        )
      }
    })

    // Check for task completion rate
    if (taskCompletionRate < 50 && currentWeekTasks.length > 0) {
      recommendations.push(
        "Your task completion rate is low. Try breaking down tasks into smaller, more manageable pieces.",
      )
    }

    // Check for study consistency
    const daysWithStudy = dailyStudyData.filter((day) =>
      Object.entries(day).some(
        ([key, value]) => ["physics", "chemistry", "mathematics", "classes"].includes(key) && value > 0,
      ),
    ).length

    if (daysWithStudy < 4) {
      recommendations.push(
        "You studied on fewer than 4 days this week. Try to maintain a more consistent study schedule.",
      )
    }

    // Check for sessions without notes
    const sessionsWithGoals = currentWeekLogs.filter((log) => log.goalId).length
    const sessionsWithNotes = currentWeekLogs.filter((log) => log.notes).length

    if (sessionsWithGoals > 0 && sessionsWithNotes < sessionsWithGoals) {
      recommendations.push(
        "You have study sessions with goals but without notes. Adding notes about your progress can help you track your learning journey better.",
      )
    }

    // Check for question goal progress
    if (currentWeekTotalQuestions < weeklyQuestionGoal * 0.7) {
      recommendations.push(
        `You've only completed ${currentWeekTotalQuestions} questions out of your weekly goal of ${weeklyQuestionGoal}. Try to solve more questions each day to reach your goal.`,
      )
    }

    return recommendations.length > 0 ? recommendations : ["Great job this week! Keep up the good work."]
  }

  // Export report as CSV
  const exportReportAsCSV = () => {
    try {
      setIsExporting(true)

      // Create CSV content
      let csvContent = "data:text/csv;charset=utf-8,"

      // Add header
      csvContent +=
        "Weekly Study Report: " +
        format(currentWeekStart, "MMM d, yyyy") +
        " to " +
        format(currentWeekEnd, "MMM d, yyyy") +
        "\n\n"

      // Add total study time
      csvContent += "Total Study Time," + formatTime(currentWeekTotalTime) + "\n"
      csvContent += "Previous Week," + formatTime(previousWeekTotalTime) + "\n"
      csvContent += "Change," + calculateChange(currentWeekTotalTime, previousWeekTotalTime) + "%\n\n"

      // Add total questions
      csvContent += "Total Questions," + currentWeekTotalQuestions + "/" + weeklyQuestionGoal + "\n"
      csvContent += "Previous Week," + previousWeekTotalQuestions + "\n"
      csvContent += "Change," + calculateChange(currentWeekTotalQuestions, previousWeekTotalQuestions) + "%\n\n"

      // Add subject breakdown
      csvContent += "Subject,Time,Previous Week,Change,Questions,Previous Week,Change\n"
      Object.entries(currentWeekTimeBySubject).forEach(([subject, time]) => {
        const prevTime = previousWeekTimeBySubject[subject as Subject]
        const questions = currentWeekQuestionsBySubject[subject as Subject]
        const prevQuestions = previousWeekQuestionsBySubject[subject as Subject]

        if (subject === "classes") {
          csvContent +=
            subject +
            "," +
            formatTime(time) +
            "," +
            formatTime(prevTime) +
            "," +
            calculateChange(time, prevTime) +
            "%," +
            "N/A,N/A,N/A\n"
        } else {
          csvContent +=
            subject +
            "," +
            formatTime(time) +
            "," +
            formatTime(prevTime) +
            "," +
            calculateChange(time, prevTime) +
            "%," +
            questions +
            "," +
            prevQuestions +
            "," +
            calculateChange(questions, prevQuestions) +
            "%\n"
        }
      })

      // Add daily breakdown
      csvContent += "\nDaily Breakdown\n"
      csvContent += "Day,Physics,Chemistry,Mathematics,Classes,Total\n"
      dailyStudyData.forEach((day) => {
        const total = day.physics + day.chemistry + day.mathematics + day.classes
        csvContent +=
          day.name +
          "," +
          day.physics +
          "," +
          day.chemistry +
          "," +
          day.mathematics +
          "," +
          day.classes +
          "," +
          total +
          "\n"
      })

      // Add daily question breakdown
      csvContent += "\nDaily Question Breakdown\n"
      csvContent += "Day,Physics,Chemistry,Mathematics,Total,Daily Goal\n"
      dailyQuestionData.forEach((day) => {
        csvContent +=
          day.name +
          "," +
          day.physics +
          "," +
          day.chemistry +
          "," +
          day.mathematics +
          "," +
          day.total +
          "," +
          dailyQuestionGoal +
          "\n"
      })

      // Add task completion
      csvContent += "\nTasks\n"
      csvContent += "Total Tasks," + currentWeekTasks.length + "\n"
      csvContent += "Completed Tasks," + currentWeekTasks.filter((t) => t.completed).length + "\n"
      csvContent += "Completion Rate," + taskCompletionRate + "%\n"

      // Add recommendations
      csvContent += "\nRecommendations\n"
      generateRecommendations().forEach((recommendation) => {
        csvContent += recommendation + "\n"
      })

      // Add goals and notes to the CSV export
      csvContent += "\nStudy Sessions\n"
      csvContent += "Day,Subject,Duration,Questions,Goal,Notes\n"

      currentWeekLogs.forEach((log) => {
        csvContent +=
          `${format(new Date(log.startTime), "EEE, MMM d")},` +
          `${log.subject},` +
          `${formatTime(log.duration)},` +
          `${log.subject === "classes" ? "N/A" : log.questionCount},` +
          `${log.goalTitle || "No specific goal"},` +
          `"${log.notes ? log.notes.replace(/"/g, '""') : ""}"\n`
      })

      // Create download link
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `study-report-${format(currentWeekStart, "yyyy-MM-dd")}.csv`)
      document.body.appendChild(link)

      // Trigger download
      link.click()

      // Clean up
      document.body.removeChild(link)

      toast({
        title: "Report Downloaded",
        description: "Your weekly study report has been downloaded as a CSV file.",
      })
    } catch (error) {
      console.error("Error exporting CSV:", error)
      toast({
        title: "Error",
        description: "Failed to export report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Export report as PDF
  const exportReportAsPDF = async () => {
    try {
      // Check browser compatibility
      const browser = detectBrowser()
      if (browser === "safari" || browser === "chrome") {
        setShowBrowserWarning(true)
        return
      }

      setIsExporting(true)

      // Dynamically import jsPDF and jspdf-autotable
      const jsPDFModule = await import("jspdf")
      const jsPDF = jsPDFModule.default
      await import("jspdf-autotable")

      const doc = new jsPDF()

      // Add title
      doc.setFontSize(18)
      doc.text(
        `Weekly Study Report: ${format(currentWeekStart, "MMM d")} - ${format(currentWeekEnd, "MMM d, yyyy")}`,
        105,
        15,
        { align: "center" },
      )

      // Add summary section
      doc.setFontSize(14)
      doc.text("Study Summary", 14, 30)

      doc.setFontSize(12)
      doc.text(`Total Study Time: ${formatTime(currentWeekTotalTime)}`, 14, 40)
      doc.text(
        `vs Previous Week: ${formatTime(previousWeekTotalTime)} (${calculateChange(currentWeekTotalTime, previousWeekTotalTime)}%)`,
        14,
        48,
      )
      doc.text(`Total Questions: ${currentWeekTotalQuestions}/${weeklyQuestionGoal}`, 14, 56)
      doc.text(
        `vs Previous Week: ${previousWeekTotalQuestions} (${calculateChange(currentWeekTotalQuestions, previousWeekTotalQuestions)}%)`,
        14,
        64,
      )
      doc.text(`Task Completion Rate: ${taskCompletionRate}%`, 14, 72)

      // Add subject breakdown table
      doc.setFontSize(14)
      doc.text("Subject Breakdown", 14, 85)

      const subjectData = Object.entries(currentWeekTimeBySubject).map(([subject, time]) => {
        const prevTime = previousWeekTimeBySubject[subject as Subject]
        const questions = currentWeekQuestionsBySubject[subject as Subject]
        const prevQuestions = previousWeekQuestionsBySubject[subject as Subject]

        return [
          subject.charAt(0).toUpperCase() + subject.slice(1),
          formatTime(time),
          `${calculateChange(time, prevTime)}%`,
          subject === "classes" ? "N/A" : questions.toString(),
          subject === "classes" ? "N/A" : `${calculateChange(questions, prevQuestions)}%`,
        ]
      })

      // @ts-ignore - jspdf-autotable types
      doc.autoTable({
        startY: 90,
        head: [["Subject", "Time", "Change", "Questions", "Change"]],
        body: subjectData,
        theme: "striped",
        headStyles: { fillColor: [51, 51, 51] },
      })

      // Add daily question breakdown
      const tableEndY = (doc as any).lastAutoTable.finalY + 10
      doc.setFontSize(14)
      doc.text("Daily Question Progress", 14, tableEndY)

      // @ts-ignore - jspdf-autotable types
      doc.autoTable({
        startY: tableEndY + 5,
        head: [["Day", "Physics", "Chemistry", "Mathematics", "Total", "Goal"]],
        body: dailyQuestionData.map((day) => [
          `${day.name} (${day.date})`,
          day.physics,
          day.chemistry,
          day.mathematics,
          day.total,
          dailyQuestionGoal,
        ]),
        theme: "striped",
        headStyles: { fillColor: [51, 51, 51] },
      })

      // Add recommendations
      const recommendations = generateRecommendations()
      const questionsTableEndY = (doc as any).lastAutoTable.finalY + 10

      doc.setFontSize(14)
      doc.text("Recommendations", 14, questionsTableEndY)

      doc.setFontSize(12)
      recommendations.forEach((recommendation, index) => {
        doc.text(`• ${recommendation}`, 14, questionsTableEndY + 10 + index * 8)
      })

      // Add study sessions with goals and notes
      const sessionsWithGoals = currentWeekLogs.filter((log) => log.goalId || log.notes)

      if (sessionsWithGoals.length > 0) {
        const recEndY = questionsTableEndY + 10 + recommendations.length * 8 + 10

        doc.setFontSize(14)
        doc.text("Study Sessions with Goals & Notes", 14, recEndY)

        // @ts-ignore - jspdf-autotable types
        doc.autoTable({
          startY: recEndY + 5,
          head: [["Day", "Subject", "Duration", "Questions", "Goal", "Notes"]],
          body: sessionsWithGoals.map((log) => [
            format(new Date(log.startTime), "EEE, MMM d"),
            log.subject.charAt(0).toUpperCase() + log.subject.slice(1),
            formatTime(log.duration),
            log.subject === "classes" ? "N/A" : log.questionCount,
            log.goalTitle || "No specific goal",
            log.notes || "",
          ]),
          theme: "striped",
          headStyles: { fillColor: [51, 51, 51] },
          columnStyles: {
            5: { cellWidth: "auto" },
          },
          styles: {
            overflow: "linebreak",
            cellPadding: 3,
          },
        })
      }

      // Add footer
      const pageCount = doc.internal.getNumberOfPages()
      doc.setFontSize(10)
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.text(
          `Generated on ${format(new Date(), "MMMM d, yyyy")} | Study Tracker App`,
          105,
          doc.internal.pageSize.height - 10,
          { align: "center" },
        )
      }

      // Save the PDF
      doc.save(`study-report-${format(currentWeekStart, "yyyy-MM-dd")}.pdf`)
      toast({
        title: "Report Downloaded",
        description: "Your weekly study report has been downloaded as a PDF.",
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "PDF Generation Failed",
        description: "Please try the CSV export option instead.",
        variant: "destructive",
      })
      // Automatically try CSV export as fallback
      exportReportAsCSV()
    } finally {
      setIsExporting(false)
    }
  }

  // Print the report (browser-compatible alternative to PDF)
  const handlePrint = () => {
    try {
      setIsExporting(true)

      if (window) {
        window.print()
        toast({
          title: "Print Dialog Opened",
          description: "Use your browser's print function to save as PDF.",
        })
      }
    } catch (error) {
      console.error("Error printing report:", error)
      toast({
        title: "Error",
        description: "Failed to open print dialog. Please try the CSV export instead.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const recommendations = generateRecommendations()

  return (
    <div className="space-y-6" ref={printRef}>
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-2xl font-bold">Weekly Study Report</h2>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={isExporting || currentWeekLogs.length === 0}
            >
              <Download size={16} />
              {isExporting ? "Exporting..." : "Export Report"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handlePrint} disabled={isExporting}>
              <Printer className="mr-2 h-4 w-4" />
              <span>Print / Save as PDF</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportReportAsCSV} disabled={isExporting}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Export as CSV</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Print-only title */}
      <div className="hidden print:block print:mb-8">
        <h1 className="text-3xl font-bold text-center">Weekly Study Report</h1>
        <p className="text-center text-lg mt-2">
          {format(currentWeekStart, "MMM d")} - {format(currentWeekEnd, "MMM d, yyyy")}
        </p>
      </div>

      {/* Browser compatibility warning dialog */}
      <Dialog open={showBrowserWarning} onOpenChange={setShowBrowserWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Browser Compatibility Issue
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <p className="mb-4">
              PDF export is not fully supported in Safari and some versions of Chrome/Chromium. Please use the CSV
              export option instead, which works in all browsers.
            </p>
            <p>CSV files can be opened in Excel, Google Sheets, or any spreadsheet application.</p>
          </DialogDescription>
          <div className="flex justify-between">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            <Button
              onClick={() => {
                setShowBrowserWarning(false)
                exportReportAsCSV()
              }}
            >
              Export as CSV Instead
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Week selector */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
          <ArrowLeft size={16} className="mr-2" />
          Previous Week
        </Button>
        <div className="text-center">
          <h3 className="font-medium">
            {format(currentWeekStart, "MMM d")} - {format(currentWeekEnd, "MMM d, yyyy")}
          </h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextWeek}
          disabled={differenceInDays(addWeeks(currentWeekStart, 1), startOfWeek(new Date(), { weekStartsOn: 1 })) > 0}
        >
          Next Week
          <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total study time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total Study Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(currentWeekTotalTime)}</div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-muted-foreground mr-2">vs previous week:</span>
              {currentWeekTotalTime === previousWeekTotalTime ? (
                <Badge variant="outline" className="flex items-center">
                  <Minus size={14} className="mr-1" />
                  No change
                </Badge>
              ) : currentWeekTotalTime > previousWeekTotalTime ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 flex items-center">
                  <TrendingUp size={14} className="mr-1" />
                  {calculateChange(currentWeekTotalTime, previousWeekTotalTime)}% increase
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 flex items-center">
                  <TrendingDown size={14} className="mr-1" />
                  {Math.abs(calculateChange(currentWeekTotalTime, previousWeekTotalTime))}% decrease
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total questions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Questions Solved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <span className="text-2xl font-bold">{currentWeekTotalQuestions}</span>
              <span className="text-lg text-muted-foreground ml-1">/ {weeklyQuestionGoal}</span>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-muted-foreground mr-2">vs previous week:</span>
              {currentWeekTotalQuestions === previousWeekTotalQuestions ? (
                <Badge variant="outline" className="flex items-center">
                  <Minus size={14} className="mr-1" />
                  No change
                </Badge>
              ) : currentWeekTotalQuestions > previousWeekTotalQuestions ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 flex items-center">
                  <TrendingUp size={14} className="mr-1" />
                  {calculateChange(currentWeekTotalQuestions, previousWeekTotalQuestions)}% increase
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 flex items-center">
                  <TrendingDown size={14} className="mr-1" />
                  {Math.abs(calculateChange(currentWeekTotalQuestions, previousWeekTotalQuestions))}% decrease
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Task completion */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Task Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskCompletionRate}%</div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-muted-foreground mr-2">
                {currentWeekTasks.filter((t) => t.completed).length}/{currentWeekTasks.length} tasks completed
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Most studied subject */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Most Studied Subject</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(currentWeekTimeBySubject).length > 0 ? (
              <>
                <div className="text-2xl font-bold capitalize">
                  {Object.entries(currentWeekTimeBySubject).reduce(
                    (max, [subject, time]) =>
                      time > currentWeekTimeBySubject[max as Subject] ? (subject as Subject) : max,
                    "physics" as Subject,
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {formatTime(Math.max(...Object.values(currentWeekTimeBySubject)))}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No study data for this week</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Question Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Question Progress</CardTitle>
          <CardDescription>Questions solved each day compared to your daily goal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2 border-b">Day</th>
                  <th className="text-left p-2 border-b">Physics</th>
                  <th className="text-left p-2 border-b">Chemistry</th>
                  <th className="text-left p-2 border-b">Mathematics</th>
                  <th className="text-left p-2 border-b">Total</th>
                  <th className="text-left p-2 border-b">Goal</th>
                  <th className="text-left p-2 border-b">Progress</th>
                </tr>
              </thead>
              <tbody>
                {dailyQuestionData.map((day) => (
                  <tr key={day.name} className="border-b">
                    <td className="p-2">{`${day.name} (${day.date})`}</td>
                    <td className="p-2">{day.physics}</td>
                    <td className="p-2">{day.chemistry}</td>
                    <td className="p-2">{day.mathematics}</td>
                    <td className="p-2 font-medium">{day.total}</td>
                    <td className="p-2">{dailyQuestionGoal}</td>
                    <td className="p-2">
                      {day.total >= dailyQuestionGoal ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          Completed
                        </Badge>
                      ) : day.total >= dailyQuestionGoal * 0.7 ? (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                          {Math.round((day.total / dailyQuestionGoal) * 100)}%
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                          {Math.round((day.total / dailyQuestionGoal) * 100)}%
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Study sessions with goals and notes - only show if there are sessions with goals or notes */}
      {currentWeekLogs.some((log) => log.goalTitle || log.notes) && (
        <Card>
          <CardHeader>
            <CardTitle>Goals & Notes Progress</CardTitle>
            <CardDescription>Study sessions with goals and progress notes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentWeekLogs
                .filter((log) => log.goalTitle || log.notes)
                .map((log) => (
                  <div key={log.id} className="border-b pb-3 last:border-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: SUBJECT_COLORS[log.subject as Subject] }}
                      ></div>
                      <span className="capitalize font-medium">{log.subject}</span>
                      <span className="text-muted-foreground text-sm">
                        {format(new Date(log.startTime), "EEE, MMM d, h:mm a")}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pl-5">
                      {log.goalTitle && (
                        <div className="flex items-center">
                          <span className="text-muted-foreground mr-2">Goal:</span>
                          <span className="font-medium">{log.goalTitle}</span>
                        </div>
                      )}

                      <div className="flex items-center">
                        <span className="text-muted-foreground mr-2">Duration:</span>
                        <span>{formatTime(log.duration)}</span>
                      </div>

                      <div className="flex items-center">
                        <span className="text-muted-foreground mr-2">Questions:</span>
                        <span>{log.subject === "classes" ? "N/A" : log.questionCount}</span>
                      </div>

                      {log.notes && (
                        <div className="md:col-span-3 mt-2 bg-muted/30 p-3 rounded-md">
                          <span className="text-muted-foreground font-medium">Notes: </span>
                          <p className="mt-1 whitespace-pre-line">{log.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subject breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Subject Breakdown</CardTitle>
          <CardDescription>Time spent and questions solved for each subject this week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(currentWeekTimeBySubject).map(([subject, time]) => {
              const prevTime = previousWeekTimeBySubject[subject as Subject]
              const timeChange = calculateChange(time, prevTime)
              const questions = currentWeekQuestionsBySubject[subject as Subject]
              const prevQuestions = previousWeekQuestionsBySubject[subject as Subject]
              const questionsChange = calculateChange(questions, prevQuestions)

              return (
                <div key={subject} className="space-y-2">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: SUBJECT_COLORS[subject as Subject] }}
                    ></div>
                    <span className="capitalize font-medium">{subject}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-muted-foreground mr-2">Time:</span>
                        <span className="font-medium">{formatTime(time)}</span>
                      </div>
                      {time === prevTime ? (
                        <Badge variant="outline" className="flex items-center">
                          <Minus size={14} className="mr-1" />
                          No change
                        </Badge>
                      ) : time > prevTime ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 flex items-center">
                          <TrendingUp size={14} className="mr-1" />
                          {timeChange}% increase
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 flex items-center">
                          <TrendingDown size={14} className="mr-1" />
                          {Math.abs(timeChange)}% decrease
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-muted-foreground mr-2">Questions:</span>
                        <span className="font-medium">{subject === "classes" ? "N/A" : questions}</span>
                      </div>
                      {subject === "classes" ? (
                        <Badge variant="outline" className="flex items-center">
                          <Minus size={14} className="mr-1" />
                          N/A
                        </Badge>
                      ) : questions === prevQuestions ? (
                        <Badge variant="outline" className="flex items-center">
                          <Minus size={14} className="mr-1" />
                          No change
                        </Badge>
                      ) : questions > prevQuestions ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 flex items-center">
                          <TrendingUp size={14} className="mr-1" />
                          {questionsChange}% increase
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 flex items-center">
                          <TrendingDown size={14} className="mr-1" />
                          {Math.abs(questionsChange)}% decrease
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Daily breakdown chart - hide in print view */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Daily Study Pattern</CardTitle>
          <CardDescription>Your study time distribution throughout the week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyStudyData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                {isDarkMode && <rect width="100%" height="100%" fill="#1f2937" />}
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} />
                <XAxis
                  dataKey="name"
                  stroke={isDarkMode ? "#d1d5db" : "#374151"}
                  tickFormatter={(value, index) => `${value} (${dailyStudyData[index].date})`}
                />
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
                    isDarkMode ? { backgroundColor: "#1f2937", borderColor: "#374151", color: "#f9fafb" } : undefined
                  }
                  formatter={(value, name) => [`${value} min`, name.charAt(0).toUpperCase() + name.slice(1)]}
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

      {/* Print-friendly daily breakdown table */}
      <div className="hidden print:block">
        <h2 className="text-xl font-bold mb-4">Daily Study Pattern</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2 text-left">Day</th>
              <th className="border p-2 text-left">Physics (min)</th>
              <th className="border p-2 text-left">Chemistry (min)</th>
              <th className="border p-2 text-left">Mathematics (min)</th>
              <th className="border p-2 text-left">Classes (min)</th>
              <th className="border p-2 text-left">Total (min)</th>
            </tr>
          </thead>
          <tbody>
            {dailyStudyData.map((day) => {
              const total = day.physics + day.chemistry + day.mathematics + day.classes
              return (
                <tr key={day.name}>
                  <td className="border p-2">{`${day.name} (${day.date})`}</td>
                  <td className="border p-2">{day.physics}</td>
                  <td className="border p-2">{day.chemistry}</td>
                  <td className="border p-2">{day.mathematics}</td>
                  <td className="border p-2">{day.classes}</td>
                  <td className="border p-2 font-medium">{total}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>Based on your study patterns this week</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 list-disc pl-5">
            {recommendations.map((recommendation, index) => (
              <li key={index}>{recommendation}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Print-only footer */}
      <div className="hidden print:block print:mt-8 print:text-center print:text-sm print:text-gray-500">
        <p>Generated on {format(new Date(), "MMMM d, yyyy")} | Study Tracker App</p>
      </div>
    </div>
  )
}
