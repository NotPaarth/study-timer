export type Subject = "physics" | "chemistry" | "mathematics" | "classes"

export interface Task {
  id: string
  title: string
  subject: Subject
  completed: boolean
  createdAt: string
}

export interface TimeLog {
  id: string
  subject: Subject
  duration: number // in seconds
  timestamp: string // keeping for backward compatibility
  startTime: string // ISO string for when the timer started
  endTime: string // ISO string for when the timer ended
  questionCount: number // number of questions practiced
  goalId?: string // ID of the selected task/goal for this session
  goalTitle?: string // Title of the selected task/goal
  notes?: string // Notes about progress on the goal
}

export interface QuestionGoal {
  daily: number // daily question goal
}
