'use client'

import { useState } from 'react'
import { useAppStore } from '@/store'
import { generateTestQuestions, analyzeWeakness } from '@/lib/weakness/analyzer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Target, Plus, Settings2, Sparkles, Loader2, Trash2, CheckCircle2, XCircle, ArrowRight, HelpCircle, Upload } from 'lucide-react'
import { UploadAnalyzer } from '@/components/upload-analyzer'
import { MarkdownRenderer } from '@/components/ui/markdown'
import type { KnowledgePoint, TestQuestion, TestResult } from '@/types'

type TestPhase = 'idle' | 'generating' | 'testing' | 'analyzing' | 'result'

export default function WeaknessPage() {
    const { exams, knowledgePoints, addKnowledgePoint, updateKnowledgePoint, deleteKnowledgePoint, settings } = useAppStore()
    const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '')
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

    // AI 测试相关状态
    const [testPhase, setTestPhase] = useState<TestPhase>('idle')
    const [questions, setQuestions] = useState<TestQuestion[]>([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [userAnswers, setUserAnswers] = useState<Record<string, string>>({})
    const [testResults, setTestResults] = useState<TestResult[]>([])
    const [detectedWeakPoints, setDetectedWeakPoints] = useState<(KnowledgePoint & { explanation?: string })[]>([])
    const [questionCount, setQuestionCount] = useState(5)

    const [newPoint, setNewPoint] = useState({
        name: '',
        masteryLevel: 50,
        importance: 3 as 1 | 2 | 3 | 4 | 5
    })

    const selectedExam = exams.find(e => e.id === selectedExamId)
    const examPoints = knowledgePoints.filter(k => k.examId === selectedExamId)
    const weakPoints = examPoints.filter(k => k.masteryLevel < 60)

    const handleAddPoint = () => {
        if (!newPoint.name || !selectedExamId) return

        addKnowledgePoint({
            examId: selectedExamId,
            name: newPoint.name,
            masteryLevel: newPoint.masteryLevel,
            importance: newPoint.importance
        })

        setNewPoint({ name: '', masteryLevel: 50, importance: 3 })
        setIsAddDialogOpen(false)
    }

    const handleMasteryChange = (id: string, level: number) => {
        updateKnowledgePoint(id, { masteryLevel: level })
    }

    const hasAIConfig = !!settings.aiConfig?.apiKey

    // 开始 AI 测试
    const startAITest = async () => {
        if (!selectedExam || !settings.aiConfig) return

        setTestPhase('generating')
        setQuestions([])
        setUserAnswers({})
        setTestResults([])
        setCurrentQuestionIndex(0)

        try {
            const generatedQuestions = await generateTestQuestions({
                examId: selectedExam.id,
                subject: selectedExam.subject,
                count: questionCount,
                type: 'mixed',
                aiConfig: settings.aiConfig
            })

            setQuestions(generatedQuestions)
            setTestPhase('testing')
        } catch (error) {
            console.error('Failed to generate questions:', error)
            alert('生成题目失败: ' + (error as Error).message)
            setTestPhase('idle')
        }
    }

    // 提交答案
    const submitAnswer = (answer: string) => {
        const currentQuestion = questions[currentQuestionIndex]
        setUserAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }))

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1)
        } else {
            // 所有题目完成，开始分析
            analyzeResults(answer)
        }
    }

    // 分析结果
    const analyzeResults = async (lastAnswer: string) => {
        if (!selectedExam || !settings.aiConfig) return

        setTestPhase('analyzing')

        const allAnswers = { ...userAnswers, [questions[currentQuestionIndex].id]: lastAnswer }

        // 计算测试结果
        const results: TestResult[] = questions.map(q => ({
            questionId: q.id,
            userAnswer: allAnswers[q.id] || '',
            isCorrect: allAnswers[q.id]?.toLowerCase().trim() === q.answer?.toLowerCase().trim(),
            knowledgePointId: q.knowledgePointId
        }))

        setTestResults(results)

        try {
            const weakPointsDetected = await analyzeWeakness({
                examId: selectedExam.id,
                subject: selectedExam.subject,
                results,
                questions,
                aiConfig: settings.aiConfig
            })

            setDetectedWeakPoints(weakPointsDetected)
            setTestPhase('result')
        } catch (error) {
            console.error('Failed to analyze:', error)
            alert('分析失败: ' + (error as Error).message)
            setTestPhase('idle')
        }
    }

    // 添加检测到的薄弱点
    const addDetectedPoints = () => {
        detectedWeakPoints.forEach(point => {
            addKnowledgePoint({
                examId: selectedExamId,
                name: point.name,
                masteryLevel: point.masteryLevel,
                importance: point.importance
            })
        })

        // 重置状态
        setTestPhase('idle')
        setDetectedWeakPoints([])
        setQuestions([])
        setUserAnswers({})
        setTestResults([])
    }

    const currentQuestion = questions[currentQuestionIndex]
    const correctCount = testResults.filter(r => r.isCorrect).length

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                        薄弱点管理
                    </h1>
                    <p className="text-muted-foreground mt-1">识别和跟踪你的薄弱知识点</p>
                </div>

                <div className="flex items-center gap-4">
                    <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="选择考试" />
                        </SelectTrigger>
                        <SelectContent>
                            {exams.map(exam => (
                                <SelectItem key={exam.id} value={exam.id}>
                                    {exam.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {exams.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Target className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">请先添加考试</h3>
                        <p className="text-muted-foreground text-center">
                            在考试管理中添加考试后，才能管理薄弱知识点
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Tabs defaultValue="manual" className="space-y-6">
                    <TabsList className="grid w-full max-w-lg grid-cols-3">
                        <TabsTrigger value="manual" className="gap-2">
                            <Settings2 className="h-4 w-4" />
                            手动添加
                        </TabsTrigger>
                        <TabsTrigger value="upload" className="gap-2" disabled={!hasAIConfig}>
                            <Upload className="h-4 w-4" />
                            上传分析
                        </TabsTrigger>
                        <TabsTrigger value="ai" className="gap-2" disabled={!hasAIConfig}>
                            <Sparkles className="h-4 w-4" />
                            AI 检测
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="space-y-6">
                        {/* 统计卡片 */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">总知识点</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{examPoints.length}</div>
                                </CardContent>
                            </Card>
                            <Card className="border-l-4 border-l-amber-500">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">薄弱点</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-amber-600">{weakPoints.length}</div>
                                    <p className="text-xs text-muted-foreground">掌握度 &lt; 60%</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">平均掌握度</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {examPoints.length > 0
                                            ? Math.round(examPoints.reduce((s, k) => s + k.masteryLevel, 0) / examPoints.length)
                                            : 0}%
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* 知识点列表 */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>知识点列表</CardTitle>
                                    <CardDescription>{selectedExam?.name} - {selectedExam?.subject}</CardDescription>
                                </div>
                                <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    添加知识点
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {examPoints.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <p>暂无知识点，点击右上角添加</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {examPoints
                                            .sort((a, b) => a.masteryLevel - b.masteryLevel)
                                            .map(point => (
                                                <KnowledgePointItem
                                                    key={point.id}
                                                    point={point}
                                                    onMasteryChange={handleMasteryChange}
                                                    onDelete={() => deleteKnowledgePoint(point.id)}
                                                />
                                            ))
                                        }
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="upload" className="space-y-6">
                        <UploadAnalyzer
                            examId={selectedExamId}
                            subject={selectedExam?.subject || ''}
                        />
                    </TabsContent>

                    <TabsContent value="ai" className="space-y-6">
                        {/* AI 检测界面 */}
                        {testPhase === 'idle' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-violet-500" />
                                        AI 智能检测
                                    </CardTitle>
                                    <CardDescription>AI 将根据 {selectedExam?.subject} 生成测试题，通过你的答题情况分析薄弱点</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>题目数量</Label>
                                        <Select value={String(questionCount)} onValueChange={(v) => setQuestionCount(Number(v))}>
                                            <SelectTrigger className="w-32">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="3">3 道</SelectItem>
                                                <SelectItem value="5">5 道</SelectItem>
                                                <SelectItem value="10">10 道</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Button
                                        onClick={startAITest}
                                        className="gap-2 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        开始智能检测
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {testPhase === 'generating' && (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-16">
                                    <Loader2 className="h-12 w-12 text-violet-500 animate-spin mb-4" />
                                    <p className="text-lg font-medium">AI 正在生成测试题...</p>
                                    <p className="text-muted-foreground">请稍候，这可能需要几秒钟</p>
                                </CardContent>
                            </Card>
                        )}

                        {testPhase === 'testing' && currentQuestion && (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>第 {currentQuestionIndex + 1} / {questions.length} 题</CardTitle>
                                        <Badge variant="outline">{currentQuestion.type === 'choice' ? '选择题' : currentQuestion.type === 'truefalse' ? '判断题' : '简答题'}</Badge>
                                    </div>
                                    <Progress value={(currentQuestionIndex / questions.length) * 100} className="mt-2" />
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="text-lg">
                                        <MarkdownRenderer content={currentQuestion.question} />
                                    </div>

                                    {currentQuestion.type === 'choice' && currentQuestion.options && (
                                        <div className="space-y-2">
                                            {currentQuestion.options.map((option, index) => (
                                                <Button
                                                    key={index}
                                                    variant="outline"
                                                    className="w-full justify-start text-left h-auto py-3 px-4"
                                                    onClick={() => submitAnswer(option)}
                                                >
                                                    <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                                                    <MarkdownRenderer content={option} className="[&_p]:m-0" />
                                                </Button>
                                            ))}
                                            <Button
                                                variant="outline"
                                                className="w-full justify-start text-left h-auto py-3 px-4 border-dashed text-muted-foreground hover:text-foreground"
                                                onClick={() => submitAnswer('不会')}
                                            >
                                                <HelpCircle className="h-4 w-4 mr-2" />
                                                不会 / 跳过这题
                                            </Button>
                                        </div>
                                    )}

                                    {currentQuestion.type === 'truefalse' && (
                                        <div className="space-y-2">
                                            <div className="flex gap-4">
                                                <Button variant="outline" className="flex-1" onClick={() => submitAnswer('对')}>
                                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                                    对
                                                </Button>
                                                <Button variant="outline" className="flex-1" onClick={() => submitAnswer('错')}>
                                                    <XCircle className="h-4 w-4 mr-2" />
                                                    错
                                                </Button>
                                            </div>
                                            <Button
                                                variant="outline"
                                                className="w-full border-dashed text-muted-foreground hover:text-foreground"
                                                onClick={() => submitAnswer('不会')}
                                            >
                                                <HelpCircle className="h-4 w-4 mr-2" />
                                                不会 / 跳过这题
                                            </Button>
                                        </div>
                                    )}

                                    {currentQuestion.type === 'short' && (
                                        <div className="space-y-2">
                                            <Input
                                                placeholder="请输入你的答案"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        submitAnswer((e.target as HTMLInputElement).value)
                                                    }
                                                }}
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={(e) => {
                                                        const input = (e.currentTarget.parentElement?.previousElementSibling as HTMLInputElement)
                                                        submitAnswer(input.value)
                                                    }}
                                                    className="gap-2 flex-1"
                                                >
                                                    提交答案
                                                    <ArrowRight className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="border-dashed text-muted-foreground hover:text-foreground"
                                                    onClick={() => submitAnswer('不会')}
                                                >
                                                    <HelpCircle className="h-4 w-4 mr-2" />
                                                    不会
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {testPhase === 'analyzing' && (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-16">
                                    <Loader2 className="h-12 w-12 text-violet-500 animate-spin mb-4" />
                                    <p className="text-lg font-medium">AI 正在分析你的答题情况...</p>
                                    <p className="text-muted-foreground">正在识别薄弱知识点</p>
                                </CardContent>
                            </Card>
                        )}

                        {testPhase === 'result' && (
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>测试结果</CardTitle>
                                        <CardDescription>答对 {correctCount} / {questions.length} 道题</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Progress value={(correctCount / questions.length) * 100} className="h-3 mb-4" />
                                        <div className="grid gap-2">
                                            {questions.map((q, i) => {
                                                const result = testResults.find(r => r.questionId === q.id)
                                                return (
                                                    <div key={q.id} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                                                        {result?.isCorrect ? (
                                                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                                                        ) : (
                                                            <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                                                        )}
                                                        <span className="text-sm flex-1 overflow-hidden">
                                                            <span className="font-medium">{i + 1}. </span>
                                                            <MarkdownRenderer content={q.question} className="inline [&_p]:inline [&_p]:m-0" />
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>

                                {detectedWeakPoints.length > 0 && (
                                    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 text-amber-600">
                                                <Sparkles className="h-5 w-5" />
                                                检测到的薄弱知识点
                                            </CardTitle>
                                            <CardDescription>根据你的答题情况，AI 分析出以下薄弱点，并给出了通俗易懂的讲解</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {detectedWeakPoints.map((point, i) => (
                                                <div key={i} className="p-4 rounded-lg border bg-card space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-lg">{point.name}</span>
                                                        <Badge variant="secondary">掌握度 {point.masteryLevel}%</Badge>
                                                    </div>
                                                    <Progress value={point.masteryLevel} className="h-2" />
                                                    {point.explanation && (
                                                        <div className="mt-3 p-3 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
                                                            <p className="text-sm text-violet-700 dark:text-violet-300 flex items-start gap-2">
                                                                <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                                                                <span>{point.explanation}</span>
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            <Button onClick={addDetectedPoints} className="w-full gap-2 bg-gradient-to-r from-violet-500 to-indigo-500">
                                                <Plus className="h-4 w-4" />
                                                添加到我的薄弱点列表
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )}

                                <Button variant="outline" onClick={() => setTestPhase('idle')} className="w-full">
                                    重新检测
                                </Button>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            )}

            {/* 添加知识点对话框 */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>添加知识点</DialogTitle>
                        <DialogDescription>手动添加你认为需要加强的知识点</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>知识点名称</Label>
                            <Input
                                placeholder="如：极限与连续"
                                value={newPoint.name}
                                onChange={(e) => setNewPoint(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>当前掌握程度: {newPoint.masteryLevel}%</Label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={newPoint.masteryLevel}
                                onChange={(e) => setNewPoint(prev => ({ ...prev, masteryLevel: Number(e.target.value) }))}
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>重要程度</Label>
                            <Select
                                value={String(newPoint.importance)}
                                onValueChange={(v) => setNewPoint(prev => ({ ...prev, importance: Number(v) as 1 | 2 | 3 | 4 | 5 }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 - 了解即可</SelectItem>
                                    <SelectItem value="2">2 - 一般重要</SelectItem>
                                    <SelectItem value="3">3 - 比较重要</SelectItem>
                                    <SelectItem value="4">4 - 非常重要</SelectItem>
                                    <SelectItem value="5">5 - 必考重点</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>取消</Button>
                        <Button onClick={handleAddPoint}>添加</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function KnowledgePointItem({
    point,
    onMasteryChange,
    onDelete
}: {
    point: KnowledgePoint
    onMasteryChange: (id: string, level: number) => void
    onDelete: () => void
}) {
    const importanceLabels = ['', '了解', '一般', '重要', '非常重要', '必考']
    const isWeak = point.masteryLevel < 60

    return (
        <div className={`p-4 rounded-lg border ${isWeak ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20' : ''}`}>
            <div className="flex items-center justify-between mb-3">
                <a href={`/learn?id=${point.id}`} className="flex items-center gap-2 hover:text-violet-600 cursor-pointer flex-1">
                    <span className="font-medium">{point.name}</span>
                    {isWeak && <Badge variant="secondary" className="text-amber-600">薄弱</Badge>}
                </a>
                <div className="flex items-center gap-2">
                    <Badge variant="outline">
                        {importanceLabels[point.importance]}
                    </Badge>
                    <a href={`/learn?id=${point.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1 text-violet-600 hover:text-violet-700">
                            <Sparkles className="h-3 w-3" />
                            学习
                        </Button>
                    </a>
                    <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <Progress
                    value={point.masteryLevel}
                    className={`flex-1 h-2 ${isWeak ? '[&>div]:bg-amber-500' : ''}`}
                />
                <span className="text-sm font-medium w-12 text-right">{point.masteryLevel}%</span>
            </div>
        </div>
    )
}
