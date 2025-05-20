"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { format } from "date-fns"
import { DEFAULT_EXAM_CONFIGS } from "@/lib/types"
import type { TestRecord, Subject, UserSettings } from "@/lib/types"
import { toast } from "@/components/ui/use-toast"

interface TestTrackerProps {
  tests: TestRecord[]
  settings: UserSettings
  onAddTest: (test: Omit<TestRecord, "id">) => void
  onDeleteTest: (id: string) => void
  onEditTest: (id: string, test: Omit<TestRecord, "id">) => void
}

export default function TestTracker({ tests, settings, onAddTest, onDeleteTest, onEditTest }: TestTrackerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingTest, setEditingTest] = useState<TestRecord | null>(null)
  const [activeTab, setActiveTab] = useState<"list" | "analytics">("list")

  // Get exam config based on settings
  const examConfig = DEFAULT_EXAM_CONFIGS[settings.examType]

  // Initialize new test state based on exam type
  const getInitialTestState = () => ({
    totalMarks: examConfig.totalMarks,
    timeSpent: 180,
    totalScore: 0,
    subjectData: Object.keys(examConfig.subjectMarks).reduce((acc, subject) => {
      acc[subject] = {
        score: 0,
        questionsAttempted: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        topicsTested: [],
      }
      return acc
    }, {} as TestRecord["subjectData"]),
    notes: "",
  })

  const [newTest, setNewTest] = useState<Partial<TestRecord>>(getInitialTestState())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Calculate total score
    const totalScore = Object.values(newTest.subjectData || {}).reduce((sum, subject) => sum + subject.score, 0)

    // Calculate incorrect answers for each subject
    const updatedSubjectData = Object.entries(newTest.subjectData || {}).reduce((acc, [subject, data]) => {
      acc[subject as keyof typeof acc] = {
        ...data,
        incorrectAnswers: data.questionsAttempted - data.correctAnswers
      }
      return acc
    }, {} as TestRecord["subjectData"])

    // Validation
    if (!newTest.subjectData) {
      toast({
        title: "Error",
        description: "Please fill in test data for at least one subject",
        variant: "destructive",
      })
      return
    }

    // Validate each subject's data based on exam config
    for (const [subject, data] of Object.entries(newTest.subjectData)) {
      const maxMarks = examConfig.subjectMarks[subject as keyof typeof examConfig.subjectMarks]
      if (data.score > maxMarks) {
        toast({
          title: "Error",
          description: `${subject.charAt(0).toUpperCase() + subject.slice(1)} score cannot exceed ${maxMarks}`,
          variant: "destructive",
        })
        return
      }

      if (data.correctAnswers > data.questionsAttempted) {
        toast({
          title: "Error",
          description: `${subject.charAt(0).toUpperCase() + subject.slice(1)} correct answers cannot exceed questions attempted`,
          variant: "destructive",
        })
        return
      }
    }

    if (editingTest) {
      onEditTest(editingTest.id, {
        ...newTest as Omit<TestRecord, "id">,
        totalScore,
        subjectData: updatedSubjectData,
        date: editingTest.date,
      })
    } else {
      onAddTest({
        ...newTest as Omit<TestRecord, "id">,
        totalScore,
        subjectData: updatedSubjectData,
        date: new Date().toISOString(),
      })
    }

    setShowAddDialog(false)
    setEditingTest(null)
    setNewTest(getInitialTestState())
  }

  const handleEdit = (test: TestRecord) => {
    setEditingTest(test)
    setNewTest({
      totalMarks: test.totalMarks,
      timeSpent: test.timeSpent,
      totalScore: test.totalScore,
      subjectData: test.subjectData,
      notes: test.notes || "",
    })
    setShowAddDialog(true)
  }

  // Calculate analytics
  const subjectPerformance = tests.reduce((acc, test) => {
    if (test.subjectData) {
      Object.entries(test.subjectData).forEach(([subject, data]) => {
        if (!acc[subject]) {
          acc[subject] = {
            totalTests: 0,
            avgScore: 0,
            avgAccuracy: 0,
            tests: [],
          }
        }

        if (data.questionsAttempted > 0) {
          acc[subject].totalTests++
          acc[subject].avgScore = (acc[subject].avgScore * (acc[subject].totalTests - 1) + data.score) / acc[subject].totalTests
          acc[subject].avgAccuracy = (acc[subject].avgAccuracy * (acc[subject].totalTests - 1) + (data.correctAnswers / data.questionsAttempted) * 100) / acc[subject].totalTests
          acc[subject].tests.push({
            date: format(new Date(test.date), "MMM dd"),
            score: data.score,
            accuracy: (data.correctAnswers / data.questionsAttempted) * 100,
          })
        }
      })
    }
    return acc
  }, {} as Record<string, { totalTests: number; avgScore: number; avgAccuracy: number; tests: { date: string; score: number; accuracy: number }[] }>)

  // Get display name for a subject
  const getSubjectDisplayName = (subject: string) => {
    return settings.customSubjectNames[subject] || subject
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Test Tracker ({settings.examType})</CardTitle>
        <Button onClick={() => setShowAddDialog(true)}>Add Test</Button>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "list" | "analytics")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Test List</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <ScrollArea className="h-[400px] w-full">
              {tests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No tests recorded yet. Add your first test!
                </div>
              ) : (
                <div className="space-y-4">
                  {tests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((test) => (
                    <Card key={test.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{settings.examType} Test</h3>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(test.date), "PPP")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="font-semibold">{test.totalScore}/{test.totalMarks} marks</p>
                              <p className="text-sm text-muted-foreground">
                                {test.timeSpent} minutes
                              </p>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(test)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => onDeleteTest(test.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 space-y-4">
                          {test.subjectData && Object.entries(test.subjectData).map(([subject, data]) => (
                            <div key={subject} className="border-t pt-4">
                              <h4 className="font-medium capitalize mb-2">{getSubjectDisplayName(subject)}</h4>
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Score</p>
                                  <p className="font-medium">{data.score}/{examConfig.subjectMarks[subject as keyof typeof examConfig.subjectMarks]}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Attempted</p>
                                  <p className="font-medium">{data.questionsAttempted}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Correct</p>
                                  <p className="font-medium">{data.correctAnswers}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Incorrect</p>
                                  <p className="font-medium">{data.incorrectAnswers}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {test.notes && (
                          <p className="mt-4 text-sm text-muted-foreground">{test.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-8">
              {Object.entries(subjectPerformance).map(([subject, data]) => (
                <Card key={subject}>
                  <CardHeader>
                    <CardTitle className="capitalize">{getSubjectDisplayName(subject)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Average Score</p>
                        <p className="text-2xl font-semibold">{data.avgScore.toFixed(1)}/{examConfig.subjectMarks[subject as keyof typeof examConfig.subjectMarks]}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Average Accuracy</p>
                        <p className="text-2xl font-semibold">{data.avgAccuracy.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Tests</p>
                        <p className="text-2xl font-semibold">{data.totalTests}</p>
                      </div>
                    </div>

                    {data.tests.length > 0 && (
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={data.tests}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis yAxisId="left" domain={[0, examConfig.subjectMarks[subject as keyof typeof examConfig.subjectMarks]]} />
                            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                            <Tooltip />
                            <Line yAxisId="left" type="monotone" dataKey="score" stroke="#8884d8" name="Score" />
                            <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#82ca9d" name="Accuracy %" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Test Dialog */}
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false)
            setEditingTest(null)
            setNewTest(getInitialTestState())
          }
        }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editingTest ? "Edit Test" : "Add New Test"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label>Time Spent (minutes)</Label>
                <Input
                  type="number"
                  value={newTest.timeSpent}
                  onChange={(e) => setNewTest({ ...newTest, timeSpent: Number(e.target.value) })}
                  required
                />
              </div>

              {newTest.subjectData && Object.entries(newTest.subjectData).map(([subject, data]) => (
                <div key={subject} className="space-y-4 border rounded-lg p-4">
                  <h4 className="font-medium capitalize">{getSubjectDisplayName(subject)}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Score (max {examConfig.subjectMarks[subject as keyof typeof examConfig.subjectMarks]})</Label>
                      <Input
                        type="number"
                        value={data.score}
                        onChange={(e) => {
                          const updatedSubjectData = { ...newTest.subjectData } as TestRecord["subjectData"]
                          updatedSubjectData[subject as keyof typeof updatedSubjectData] = {
                            ...data,
                            score: Number(e.target.value)
                          }
                          setNewTest({
                            ...newTest,
                            subjectData: updatedSubjectData
                          })
                        }}
                        required
                      />
                    </div>
                    <div>
                      <Label>Questions Attempted</Label>
                      <Input
                        type="number"
                        value={data.questionsAttempted}
                        onChange={(e) => {
                          const updatedSubjectData = { ...newTest.subjectData } as TestRecord["subjectData"]
                          updatedSubjectData[subject as keyof typeof updatedSubjectData] = {
                            ...data,
                            questionsAttempted: Number(e.target.value)
                          }
                          setNewTest({
                            ...newTest,
                            subjectData: updatedSubjectData
                          })
                        }}
                        required
                      />
                    </div>
                    <div>
                      <Label>Correct Answers</Label>
                      <Input
                        type="number"
                        value={data.correctAnswers}
                        onChange={(e) => {
                          const updatedSubjectData = { ...newTest.subjectData } as TestRecord["subjectData"]
                          updatedSubjectData[subject as keyof typeof updatedSubjectData] = {
                            ...data,
                            correctAnswers: Number(e.target.value)
                          }
                          setNewTest({
                            ...newTest,
                            subjectData: updatedSubjectData
                          })
                        }}
                        required
                      />
                    </div>
                    <div>
                      <Label>Topics Tested (comma-separated)</Label>
                      <Input
                        type="text"
                        value={data.topicsTested?.join(", ") || ""}
                        onChange={(e) => {
                          const updatedSubjectData = { ...newTest.subjectData } as TestRecord["subjectData"]
                          updatedSubjectData[subject as keyof typeof updatedSubjectData] = {
                            ...data,
                            topicsTested: e.target.value.split(",").map(t => t.trim()).filter(Boolean)
                          }
                          setNewTest({
                            ...newTest,
                            subjectData: updatedSubjectData
                          })
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Notes */}
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={newTest.notes}
                  onChange={(e) => setNewTest({ ...newTest, notes: e.target.value })}
                  placeholder="Add any additional notes about the test..."
                />
              </div>

              <DialogFooter>
                <Button type="submit">{editingTest ? "Save Changes" : "Add Test"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
} 