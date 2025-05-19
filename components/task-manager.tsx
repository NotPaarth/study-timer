"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import type { Subject, Task } from "@/lib/types"

interface TaskManagerProps {
  tasks: Task[]
  onAddTask: (task: Task) => void
  onToggleComplete: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
}

export default function TaskManager({ tasks, onAddTask, onToggleComplete, onDeleteTask }: TaskManagerProps) {
  const [activeSubject, setActiveSubject] = useState<Subject>("physics")
  const [newTaskTitle, setNewTaskTitle] = useState("")

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()

    if (newTaskTitle.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        title: newTaskTitle,
        subject: activeSubject,
        completed: false,
        createdAt: new Date().toISOString(),
      }

      onAddTask(newTask)
      setNewTaskTitle("")
    }
  }

  const filteredTasks = tasks.filter((task) => task.subject === activeSubject)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center">Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="physics"
          value={activeSubject}
          onValueChange={(value) => setActiveSubject(value as Subject)}
          className="mb-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="physics">Physics</TabsTrigger>
            <TabsTrigger value="chemistry">Chemistry</TabsTrigger>
            <TabsTrigger value="mathematics">Mathematics</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
          <Input
            placeholder={`Add a new ${activeSubject} task...`}
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="sm">
            <Plus size={16} className="mr-2" />
            Add
          </Button>
        </form>

        <div className="space-y-2">
          {filteredTasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No tasks for {activeSubject} yet. Add some tasks to get started!
            </p>
          ) : (
            filteredTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-2">
                  <Checkbox id={task.id} checked={task.completed} onCheckedChange={() => onToggleComplete(task.id)} />
                  <Label htmlFor={task.id} className={task.completed ? "line-through text-muted-foreground" : ""}>
                    {task.title}
                  </Label>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onDeleteTask(task.id)}>
                  <Trash2 size={16} className="text-red-500" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
