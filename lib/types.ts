export type ExamType = "JEE" | "NEET"

export type JEESubject = "physics" | "chemistry" | "mathematics" | "classes"
export type NEETSubject = "physics" | "chemistry" | "botany" | "zoology" | "classes"

export type Subject = JEESubject | NEETSubject

export interface ExamConfig {
  type: ExamType
  totalMarks: number
  subjectMarks: Record<string, number>
}

export const DEFAULT_EXAM_CONFIGS = {
  JEE: {
    type: "JEE" as const,
    totalMarks: 300,
    subjectMarks: {
      physics: 100,
      chemistry: 100,
      mathematics: 100,
    }
  },
  NEET: {
    type: "NEET" as const,
    totalMarks: 720,
    subjectMarks: {
      physics: 180,
      chemistry: 180,
      botany: 180,
      zoology: 180,
    }
  }
} as const

export interface Task {
  id: string
  title: string
  subject: Subject
  completed: boolean
  createdAt: string  // ISO string timestamp
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

export interface SubjectTestData {
  score: number
  questionsAttempted: number
  correctAnswers: number
  incorrectAnswers: number
  topicsTested?: string[]
}

export interface TestRecord {
  id: string
  date: string
  totalScore: number // Combined score of all subjects
  totalMarks: number // Default based on exam type
  timeSpent: number // in minutes, default 180
  notes?: string
  subjectData: Record<string, SubjectTestData>
}

export interface StreakData {
  currentStreak: number
  longestStreak: number
  lastStreakDate: string  // ISO string of the last date streak was maintained
  streakHistory: {
    date: string  // ISO string
    maintained: boolean
  }[]
}

export interface UserSettings {
  examType: ExamType
  customSubjectNames: Record<string, string>
  streakConfig: {
    minStudyHours: number
    minQuestions: number
  }
}

// Default streak configuration
export const DEFAULT_STREAK_CONFIG = {
  minStudyHours: 10,  // 10 hours
  minQuestions: 60    // 60 questions
}