// 考试信息
export interface Exam {
  id: string
  name: string           // 考试名称
  subject: string        // 学科
  date: string           // 考试日期 (ISO string)
  totalScore: number     // 总分
  createdAt: string
}

// 知识点
export interface KnowledgePoint {
  id: string
  examId: string         // 关联的考试
  name: string
  parentId?: string      // 父级知识点
  masteryLevel: number   // 掌握程度 0-100
  importance: 1 | 2 | 3 | 4 | 5  // 重要程度
}

// 学习任务
export interface StudyTask {
  id: string
  examId: string
  title: string
  description?: string
  knowledgePointId?: string
  estimatedMinutes: number
  scheduledDate: string  // ISO string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  actualMinutes?: number
  completedAt?: string
}

// 学习计划
export interface StudyPlan {
  id: string
  examId: string
  tasks: StudyTask[]
  createdAt: string
  lastAdjustedAt: string
}

// AI 模型配置
export type AIProvider = 'openai' | 'anthropic' | 'dashscope' | 'deepseek' | 'custom'

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  model?: string
  customBaseURL?: string  // 自定义 baseURL（仅 custom 模式使用）
}

// 用户设置
export interface UserSettings {
  aiConfig: AIConfig | null
  dailyStudyMinutes: number  // 每日可学习时长
  preferredStudyTime: 'morning' | 'afternoon' | 'evening' | 'any'
}

// 薄弱点测试题
export interface TestQuestion {
  id: string
  examId: string
  question: string
  type: 'choice' | 'truefalse' | 'short'
  options?: string[]
  answer: string
  knowledgePointId?: string
}

export interface TestResult {
  questionId: string
  userAnswer: string
  isCorrect: boolean
  knowledgePointId?: string
}

// 复习记录（艾宾浩斯遗忘曲线）
export interface ReviewRecord {
  id: string
  knowledgePointId: string
  examId: string
  reviewCount: number          // 当前复习轮次 (0-6, 0表示待首次复习)
  lastReviewDate: string | null // 上次复习日期
  nextReviewDate: string       // 下次复习日期
  status: 'pending' | 'completed'
  createdAt: string
}
