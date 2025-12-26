'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAppStore } from '@/store'
import { callAI } from '@/lib/ai/provider'
import { PATIENT_TEACHER_PROMPT } from '@/lib/ai/prompts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Sparkles, Loader2, CheckCircle2, XCircle, MessageCircle, BookOpen, HelpCircle, Send } from 'lucide-react'
import { MarkdownRenderer } from '@/components/ui/markdown'
import Link from 'next/link'

type LearningPhase = 'explaining' | 'practicing' | 'chatting' | 'idle'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

// 提取主要逻辑到子组件
function LearnContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pointId = searchParams.get('id')

    const { knowledgePoints, exams, settings, updateKnowledgePoint, createReviewRecord } = useAppStore()
    const point = knowledgePoints.find(k => k.id === pointId)
    const exam = exams.find(e => e.id === point?.examId)

    const [phase, setPhase] = useState<LearningPhase>('idle')
    const [explanation, setExplanation] = useState('')
    const [practiceQuestion, setPracticeQuestion] = useState('')
    const [practiceAnswer, setPracticeAnswer] = useState('')
    const [userAnswer, setUserAnswer] = useState('')
    const [feedback, setFeedback] = useState('')
    const [messages, setMessages] = useState<Message[]>([])
    const [inputMessage, setInputMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const hasAIConfig = !!settings.aiConfig?.apiKey

    // 开始学习 - AI 讲解知识点
    const startLearning = async () => {
        if (!point || !settings.aiConfig) return

        setPhase('explaining')
        setIsLoading(true)

        try {
            const prompt = `请用最直白、最通俗的语言给我讲解「${point.name}」这个知识点。

要求：
1. 像跟朋友聊天一样，不要用专业术语
2. 先用一句话说清楚这个知识点是什么
3. 举一个生活中的具体例子帮助理解
4. 分点列出最重要的 2-3 个要点
5. 最后用一句话总结

学科：${exam?.subject || '未知'}
当前掌握度：${point.masteryLevel}%（${point.masteryLevel < 30 ? '完全不会，请从零开始讲' : point.masteryLevel < 60 ? '有点印象但不熟练' : '有基础，帮我巩固'}）`

            const response = await callAI(settings.aiConfig, prompt, PATIENT_TEACHER_PROMPT)
            setExplanation(response)

            // 学习完成后创建复习记录（艾宾浩斯遗忘曲线）
            createReviewRecord(point.id, point.examId)

            setIsLoading(false)
        } catch (error) {
            console.error('Failed to get explanation:', error)
            setExplanation('获取讲解失败: ' + (error as Error).message)
            setIsLoading(false)
        }
    }

    // 生成练习题
    const generatePractice = async () => {
        if (!point || !settings.aiConfig) return

        setPhase('practicing')
        setIsLoading(true)
        setUserAnswer('')
        setFeedback('')

        try {
            const prompt = `请针对「${point.name}」这个知识点出一道练习题。

要求：
1. 题目难度适中，适合刚学完的学生
2. 可以是选择题、判断题或简答题
3. 题目表述清晰，没有歧义

请用以下格式输出：
【题目】你的题目内容
【答案】正确答案
【解析】为什么是这个答案

学科：${exam?.subject || '未知'}`

            const response = await callAI(settings.aiConfig, prompt, PATIENT_TEACHER_PROMPT)

            // 解析题目和答案
            const questionMatch = response.match(/【题目】([\s\S]*?)(?=【答案】|$)/)
            const answerMatch = response.match(/【答案】([\s\S]*?)(?=【解析】|$)/)

            setPracticeQuestion(questionMatch?.[1]?.trim() || response)
            setPracticeAnswer(answerMatch?.[1]?.trim() || '')
            setIsLoading(false)
        } catch (error) {
            console.error('Failed to generate practice:', error)
            setPracticeQuestion('生成练习题失败: ' + (error as Error).message)
            setIsLoading(false)
        }
    }

    // 检查答案
    const checkAnswer = async () => {
        if (!settings.aiConfig || !userAnswer.trim()) return

        setIsLoading(true)

        try {
            const prompt = `学生对这道题的回答是：「${userAnswer}」

题目：${practiceQuestion}
正确答案：${practiceAnswer}

请判断学生的回答是否正确，并给出耐心的反馈。如果错了，解释为什么错，正确答案是什么。如果对了，给予鼓励。`

            const response = await callAI(settings.aiConfig, prompt, PATIENT_TEACHER_PROMPT)
            setFeedback(response)

            // 如果回答正确，提升掌握度
            if (response.includes('正确') || response.includes('对了') || response.includes('很好')) {
                const newLevel = Math.min(100, point!.masteryLevel + 10)
                updateKnowledgePoint(point!.id, { masteryLevel: newLevel })
            }

            setIsLoading(false)
        } catch (error) {
            console.error('Failed to check answer:', error)
            setFeedback('检查答案失败: ' + (error as Error).message)
            setIsLoading(false)
        }
    }

    // 自由提问
    const sendMessage = async () => {
        if (!settings.aiConfig || !inputMessage.trim()) return

        const newMessage: Message = { role: 'user', content: inputMessage }
        setMessages(prev => [...prev, newMessage])
        setInputMessage('')
        setIsLoading(true)

        try {
            const context = messages.map(m => `${m.role === 'user' ? '学生' : '老师'}：${m.content}`).join('\n')

            const prompt = `我们正在学习「${point?.name}」这个知识点。

之前的对话：
${context}

学生的新问题：${inputMessage}

请继续耐心回答学生的问题。`

            const response = await callAI(settings.aiConfig, prompt, PATIENT_TEACHER_PROMPT)
            setMessages(prev => [...prev, { role: 'assistant', content: response }])
            setIsLoading(false)
        } catch (error) {
            console.error('Failed to send message:', error)
            setMessages(prev => [...prev, { role: 'assistant', content: '回复失败: ' + (error as Error).message }])
            setIsLoading(false)
        }
    }

    if (!point) {
        return (
            <div className="text-center py-16">
                <p className="text-muted-foreground">知识点不存在</p>
                <Link href="/weakness">
                    <Button variant="link">返回薄弱点列表</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {/* 头部 */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">{point.name}</h1>
                    <p className="text-muted-foreground">{exam?.subject} · {exam?.name}</p>
                </div>
                <Badge variant={point.masteryLevel < 60 ? 'secondary' : 'outline'}>
                    掌握度 {point.masteryLevel}%
                </Badge>
            </div>

            <Progress value={point.masteryLevel} className="h-2" />

            {!hasAIConfig ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">需要配置 AI</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            请先在设置中配置 AI API Key，才能使用智能学习功能
                        </p>
                        <Link href="/settings">
                            <Button>前往设置</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : phase === 'idle' ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-violet-500" />
                            AI 一对一教学
                        </CardTitle>
                        <CardDescription>选择你想要的学习方式</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <Button
                            variant="outline"
                            className="h-auto py-6 flex-col gap-2"
                            onClick={startLearning}
                        >
                            <BookOpen className="h-8 w-8 text-violet-500" />
                            <span className="font-medium">从头学习</span>
                            <span className="text-xs text-muted-foreground">AI 耐心讲解知识点</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-auto py-6 flex-col gap-2"
                            onClick={generatePractice}
                        >
                            <HelpCircle className="h-8 w-8 text-indigo-500" />
                            <span className="font-medium">做练习题</span>
                            <span className="text-xs text-muted-foreground">检验学习效果</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-auto py-6 flex-col gap-2"
                            onClick={() => setPhase('chatting')}
                        >
                            <MessageCircle className="h-8 w-8 text-emerald-500" />
                            <span className="font-medium">自由提问</span>
                            <span className="text-xs text-muted-foreground">有问题随时问</span>
                        </Button>
                    </CardContent>
                </Card>
            ) : phase === 'explaining' ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-violet-500" />
                            知识讲解
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
                                <span className="ml-3">AI 老师正在准备讲解...</span>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <MarkdownRenderer content={explanation} />

                                <div className="flex gap-2 pt-4 border-t">
                                    <Button onClick={generatePractice} className="gap-2">
                                        <HelpCircle className="h-4 w-4" />
                                        做个练习题
                                    </Button>
                                    <Button variant="outline" onClick={() => setPhase('chatting')}>
                                        我有问题想问
                                    </Button>
                                    <Button variant="ghost" onClick={() => setPhase('idle')}>
                                        返回
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : phase === 'practicing' ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-indigo-500" />
                            练习题
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading && !practiceQuestion ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                                <span className="ml-3">AI 老师正在出题...</span>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-4 rounded-lg bg-muted">
                                    <MarkdownRenderer content={practiceQuestion} />
                                </div>

                                {!feedback ? (
                                    <div className="space-y-4">
                                        <Input
                                            placeholder="请输入你的答案"
                                            value={userAnswer}
                                            onChange={(e) => setUserAnswer(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                                        />
                                        <div className="flex gap-2">
                                            <Button onClick={checkAnswer} disabled={isLoading || !userAnswer.trim()} className="gap-2">
                                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                提交答案
                                            </Button>
                                            <Button variant="outline" onClick={() => setFeedback(`正确答案是：${practiceAnswer}`)}>
                                                不会，看答案
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
                                            <MarkdownRenderer content={feedback} className="text-violet-700 dark:text-violet-300" />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button onClick={generatePractice} className="gap-2">
                                                再来一题
                                            </Button>
                                            <Button variant="outline" onClick={startLearning}>
                                                重新学习
                                            </Button>
                                            <Button variant="ghost" onClick={() => setPhase('idle')}>
                                                返回
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : phase === 'chatting' ? (
                <Card className="flex flex-col h-[600px]">
                    <CardHeader className="shrink-0">
                        <CardTitle className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 text-emerald-500" />
                            自由提问
                        </CardTitle>
                        <CardDescription>有任何关于「{point.name}」的问题都可以问</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto space-y-4">
                        {messages.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>开始提问吧，AI 老师会耐心回答你的问题</p>
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user'
                                        ? 'bg-violet-500 text-white'
                                        : 'bg-muted'
                                        }`}>
                                        {msg.role === 'user' ? (
                                            <p className="text-sm">{msg.content}</p>
                                        ) : (
                                            <MarkdownRenderer content={msg.content} className="text-sm" />
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-muted p-3 rounded-lg">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <div className="p-4 border-t shrink-0">
                        <div className="flex gap-2">
                            <Input
                                placeholder="输入你的问题..."
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            />
                            <Button onClick={sendMessage} disabled={isLoading || !inputMessage.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <Button variant="ghost" size="sm" onClick={() => setPhase('idle')}>
                                返回
                            </Button>
                        </div>
                    </div>
                </Card>
            ) : null}
        </div>
    )
}

export default function LearnPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        }>
            <LearnContent />
        </Suspense>
    )
}
