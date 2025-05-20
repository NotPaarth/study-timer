"use client"

import { useState, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Download, FileText, BookOpen, Printer, AlertTriangle } from "lucide-react"
import { format, startOfDay, endOfDay, addDays, subDays, isWithinInterval } from "date-fns"
import type { Subject, Task, TimeLog, QuestionGoal, TestRecord } from "@/lib/types"
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

interface DailyReportProps {
  timeLogs: TimeLog[]
  tasks: Task[]
  tests: TestRecord[]
  questionGoal: QuestionGoal
}

// Colors for the different subjects
const SUBJECT_COLORS: Record<Subject, string> = {
  physics: "#3b82f6", // blue
  chemistry: "#10b981", // green
  mathematics: "#f59e0b", // amber
  botany: "#22c55e", // emerald
  zoology: "#14b8a6", // teal
  classes: "#8b5cf6", // purple
}

export default function DailyReport({ timeLogs, tasks, tests, questionGoal }: DailyReportProps) {
  const [currentDay, setCurrentDay] = useState(() => startOfDay(new Date()))
  const [isExporting, setIsExporting] = useState(false)
  const [showBrowserWarning, setShowBrowserWarning] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  // Calculate day end date
  const currentDayEnd = endOfDay(currentDay)

  // Navigate to previous day
  const goToPreviousDay = () => {
    setCurrentDay(subDays(currentDay, 1))
  }

  // Navigate to next day
  const goToNextDay = () => {
    const nextDay = addDays(currentDay, 1)
    // Don't allow navigating to future days
    if (nextDay <= startOfDay(new Date())) {
      setCurrentDay(nextDay)
    }
  }

  // Filter logs for current day
  const currentDayLogs = useMemo(() => {
    return timeLogs.filter((log) => {
      const logDate = new Date(log.startTime)
      return isWithinInterval(logDate, { start: currentDay, end: currentDayEnd })
    })
  }, [timeLogs, currentDay, currentDayEnd])

  // Filter tasks for current day
  const currentDayTasks = useMemo(() => {
    return tasks.filter((task) => {
      const taskDate = new Date(task.createdAt)
      return isWithinInterval(taskDate, { start: currentDay, end: currentDayEnd })
    })
  }, [tasks, currentDay, currentDayEnd])

  // Filter tests for current day
  const currentDayTests = useMemo(() => {
    return tests.filter((test) => {
      const testDate = new Date(test.date)
      return isWithinInterval(testDate, { start: currentDay, end: currentDayEnd })
    })
  }, [tests, currentDay, currentDayEnd])

  // Calculate total study time for current day
  const currentDayTotalTime = useMemo(() => {
    return currentDayLogs.reduce((total, log) => total + log.duration, 0)
  }, [currentDayLogs])

  // Calculate total questions for current day
  const currentDayTotalQuestions = useMemo(() => {
    return currentDayLogs.reduce((total, log) => total + (log.questionCount || 0), 0)
  }, [currentDayLogs])

  // Calculate time by subject for current day
  const currentDayTimeBySubject = useMemo(() => {
    const result = {
      physics: 0,
      chemistry: 0,
      mathematics: 0,
      botany: 0,
      zoology: 0,
      classes: 0,
    } as Record<Subject, number>

    currentDayLogs.forEach((log) => {
      result[log.subject] += log.duration
    })

    return result
  }, [currentDayLogs])

  // Calculate questions by subject for current day
  const currentDayQuestionsBySubject = useMemo(() => {
    const result = {
      physics: 0,
      chemistry: 0,
      mathematics: 0,
      botany: 0,
      zoology: 0,
      classes: 0,
    } as Record<Subject, number>

    currentDayLogs.forEach((log) => {
      result[log.subject] += log.questionCount || 0
    })

    return result
  }, [currentDayLogs])

  // Calculate total questions for goal tracking (excluding classes)
  const totalQuestionsForGoal = useMemo(() => {
    return (
      currentDayQuestionsBySubject.physics +
      currentDayQuestionsBySubject.chemistry +
      currentDayQuestionsBySubject.mathematics
    )
  }, [currentDayQuestionsBySubject])

  // Calculate task completion rate for current day
  const taskCompletionRate = useMemo(() => {
    if (currentDayTasks.length === 0) return 0
    const completedTasks = currentDayTasks.filter((task) => task.completed).length
    return Math.round((completedTasks / currentDayTasks.length) * 100)
  }, [currentDayTasks])

  // Calculate test stats for current day
  const currentDayTestStats = useMemo(() => {
    return currentDayTests.reduce((acc, test) => {
      Object.entries(test.subjectData).forEach(([subject, data]) => {
        if (!acc[subject as Subject]) {
          acc[subject as Subject] = {
            totalTests: 0,
            totalScore: 0,
            totalAccuracy: 0,
          }
        }
        acc[subject as Subject].totalTests++
        acc[subject as Subject].totalScore += data.score
        acc[subject as Subject].totalAccuracy += (data.correctAnswers / data.questionsAttempted) * 100
      })
      return acc
    }, {} as Record<Subject, { totalTests: number; totalScore: number; totalAccuracy: number }>)
  }, [currentDayTests])

  // Format time as hours and minutes
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  // Detect browser
  const detectBrowser = () => {
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.indexOf("safari") !== -1 && userAgent.indexOf("chrome") === -1) {
      return "safari"
    } else if (userAgent.indexOf("chrome") !== -1) {
      return "chrome"
    } else {
      return "other"
    }
  }

  // Export report as CSV (more reliable fallback)
  const exportReportAsCSV = () => {
    try {
      setIsExporting(true)

      // Create CSV content
      let csvContent = "data:text/csv;charset=utf-8,"

      // Add header
      csvContent += `Daily Study Report: ${format(currentDay, "MMMM d, yyyy")}\n\n`

      // Add summary section
      csvContent += "Study Summary\n"
      csvContent += `Total Study Time,${formatTime(currentDayTotalTime)}\n`
      csvContent += `Total Questions Solved,${totalQuestionsForGoal}/${questionGoal.daily}\n`
      csvContent += `Tasks Completed,${currentDayTasks.filter((t) => t.completed).length}/${currentDayTasks.length}\n\n`

      // Add subject breakdown
      csvContent += "Subject Breakdown\n"
      csvContent += "Subject,Study Time,Questions Solved\n"

      Object.entries(currentDayTimeBySubject)
        .filter(([subject, time]) => time > 0)
        .forEach(([subject, time]) => {
          const questions = currentDayQuestionsBySubject[subject as Subject]
          const subjectDisplay =
            subject === "classes"
              ? `${subject},${formatTime(time)},N/A\n`
              : `${subject},${formatTime(time)},${questions}\n`
          csvContent += subjectDisplay
        })

      // Add goals to the CSV export
      csvContent += "\nStudy Sessions\n"
      csvContent += "Subject,Start Time,End Time,Duration,Questions,Goal,Notes\n"

      currentDayLogs.forEach((log) => {
        csvContent +=
          `${log.subject},` +
          `${format(new Date(log.startTime), "h:mm a")},` +
          `${format(new Date(log.endTime), "h:mm a")},` +
          `${formatTime(log.duration)},` +
          `${log.subject === "classes" ? "N/A" : log.questionCount},` +
          `${log.goalTitle || "No specific goal"},` +
          `"${log.notes ? log.notes.replace(/"/g, '""') : ""}"\n`
      })

      // Create download link
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `study-report-${format(currentDay, "yyyy-MM-dd")}.csv`)
      document.body.appendChild(link)

      // Trigger download
      link.click()

      // Clean up
      document.body.removeChild(link)

      toast({
        title: "Report Downloaded",
        description: "Your study report has been downloaded as a CSV file.",
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

      try {
        // Use require instead of dynamic import for better V0 compatibility
        const jsPDF = require('jspdf').default;
        require('jspdf-autotable');
        
        const doc = new jsPDF();

        // Add title
        doc.setFontSize(18)
        doc.text(`Daily Study Report: ${format(currentDay, "MMMM d, yyyy")}`, 105, 15, { align: "center" })

        // Add summary section
        doc.setFontSize(14)
        doc.text("Study Summary", 14, 30)

        doc.setFontSize(12)
        doc.text(`Total Study Time: ${formatTime(currentDayTotalTime)}`, 14, 40)
        doc.text(`Total Questions Solved: ${totalQuestionsForGoal}/${questionGoal.daily}`, 14, 48)
        doc.text(
          `Tasks Completed: ${currentDayTasks.filter((t) => t.completed).length}/${currentDayTasks.length}`,
          14,
          56,
        )

        // Add subject breakdown table
        doc.setFontSize(14)
        doc.text("Subject Breakdown", 14, 70)

        const subjectData = Object.entries(currentDayTimeBySubject)
          .filter(([_, time]) => time > 0)
          .map(([subject, time]) => [
            subject.charAt(0).toUpperCase() + subject.slice(1),
            formatTime(time),
            subject === "classes" ? "N/A" : currentDayQuestionsBySubject[subject as Subject].toString(),
          ])

        // @ts-ignore - jspdf-autotable types
        doc.autoTable({
          startY: 75,
          head: [["Subject", "Study Time", "Questions Solved"]],
          body: subjectData,
          theme: "striped",
          headStyles: { fillColor: [51, 51, 51] },
        })

        // Add study sessions with notes
        const tableEndY = (doc as any).lastAutoTable.finalY + 10

        doc.setFontSize(14)
        doc.text("Study Sessions", 14, tableEndY)

        // @ts-ignore - jspdf-autotable types
        doc.autoTable({
          startY: tableEndY + 5,
          head: [["Subject", "Time", "Duration", "Questions", "Goal", "Notes"]],
          body: currentDayLogs.map((log) => [
            log.subject.charAt(0).toUpperCase() + log.subject.slice(1),
            `${format(new Date(log.startTime), "h:mm a")} - ${format(new Date(log.endTime), "h:mm a")}`,
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

        // Add footer
        const pageCount = (doc as any).internal.getNumberOfPages()
        doc.setFontSize(10)
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i)
          doc.text(
            `Generated on ${format(new Date(), "MMMM d, yyyy")} | Study Tracker App`,
            105,
            (doc as any).internal.pageSize.height - 10,
            { align: "center" },
          )
        }

        // Save the PDF
        doc.save(`study-report-${format(currentDay, "yyyy-MM-dd")}.pdf`)
        toast({
          title: "Report Downloaded",
          description: "Your study report has been downloaded as a PDF.",
        })
      } catch (importError) {
        console.error("Error loading PDF libraries:", importError);
        toast({
          title: "PDF Generation Failed",
          description: "Could not load PDF generation libraries. Please try the CSV export option instead.",
          variant: "destructive",
        });
        exportReportAsCSV();
        return;
      }
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

  return (
    <div className="space-y-6" ref={printRef}>
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-2xl font-bold">Daily Study Report</h2>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={currentDayLogs.length === 0 || isExporting}
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
        <h1 className="text-3xl font-bold text-center">Daily Study Report</h1>
        <p className="text-center text-lg mt-2">{format(currentDay, "MMMM d, yyyy")}</p>
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

      {/* Day selector */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="outline" size="sm" onClick={goToPreviousDay}>
          <ArrowLeft size={16} className="mr-2" />
          Previous Day
        </Button>
        <div className="text-center">
          <h3 className="font-medium">{format(currentDay, "MMMM d, yyyy")}</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextDay}
          disabled={addDays(currentDay, 1) > startOfDay(new Date())}
        >
          Next Day
          <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>

      {currentDayLogs.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center text-muted-foreground">
              <p>No study data available for this day.</p>
              <p className="text-sm mt-2">Use the timer to track your study sessions!</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total study time */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Total Study Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTime(currentDayTotalTime)}</div>
              </CardContent>
            </Card>

            {/* Total questions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Questions Solved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">{totalQuestionsForGoal}</span>
                  <span className="text-lg text-muted-foreground ml-1">/ {questionGoal.daily}</span>
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
                <div className="text-sm text-muted-foreground mt-1">
                  {currentDayTasks.filter((t) => t.completed).length}/{currentDayTasks.length} tasks completed
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subject breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Subject Breakdown</CardTitle>
              <CardDescription>Time spent and questions solved for each subject today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(currentDayTimeBySubject)
                  .filter(([_, time]) => time > 0)
                  .map(([subject, time]) => {
                    const questions = currentDayQuestionsBySubject[subject as Subject]

                    return (
                      <div key={subject} className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: SUBJECT_COLORS[subject as Subject] }}
                          ></div>
                          <span className="capitalize font-medium">{subject}</span>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="flex items-center">
                            <span className="text-muted-foreground mr-2">Time:</span>
                            <span className="font-medium">{formatTime(time)}</span>
                          </div>

                          <div className="flex items-center">
                            <BookOpen size={14} className="mr-1 text-muted-foreground" />
                            <span className="font-medium">
                              {subject === "classes" ? "N/A" : `${questions} questions`}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Study sessions with goals and notes */}
          {currentDayLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Study Sessions</CardTitle>
                <CardDescription>Details of your study sessions today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentDayLogs.map((log) => (
                    <div key={log.id} className="border-b pb-3 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: SUBJECT_COLORS[log.subject as Subject] }}
                        ></div>
                        <span className="capitalize font-medium">{log.subject}</span>
                        <span className="text-muted-foreground text-sm">
                          {format(new Date(log.startTime), "h:mm a")} - {format(new Date(log.endTime), "h:mm a")}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pl-5">
                        <div className="flex items-center">
                          <span className="text-muted-foreground mr-2">Duration:</span>
                          <span>{formatTime(log.duration)}</span>
                        </div>

                        <div className="flex items-center">
                          <span className="text-muted-foreground mr-2">Questions:</span>
                          <span>{log.subject === "classes" ? "N/A" : log.questionCount}</span>
                        </div>

                        <div className="flex items-center">
                          <span className="text-muted-foreground mr-2">Goal:</span>
                          <span>{log.goalTitle || "No specific goal"}</span>
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

          {/* Test Performance Section */}
          {Object.keys(currentDayTestStats).length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Today's Test Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(currentDayTestStats).map(([subject, stats]) => (
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
                          <span>{(stats.totalScore / stats.totalTests).toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Accuracy</span>
                          <span>{(stats.totalAccuracy / stats.totalTests).toFixed(1)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Print-only footer */}
      <div className="hidden print:block print:mt-8 print:text-center print:text-sm print:text-gray-500">
        <p>Generated on {format(new Date(), "MMMM d, yyyy")} | Study Tracker App</p>
      </div>
    </div>
  )
}
