'use client'

import { useState, useRef } from 'react'
import { useAppStore } from '@/store'
import { callAIWithImage } from '@/lib/ai/provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { MarkdownRenderer } from '@/components/ui/markdown'
import { Upload, Image as ImageIcon, FileText, Sparkles, Loader2, Plus, BookOpen, X } from 'lucide-react'
import type { KnowledgePoint } from '@/types'

interface UploadAnalyzerProps {
    examId: string
    subject: string
    onPointsGenerated?: (points: KnowledgePoint[]) => void
}

type AnalysisType = 'scope' | 'questions' | null

interface AnalysisResult {
    type: AnalysisType
    knowledgePoints?: Array<{
        name: string
        importance: 1 | 2 | 3 | 4 | 5
        masteryLevel: number
    }>
    questionExplanations?: Array<{
        question: string
        answer: string
        explanation: string
        knowledgePoint: string
    }>
    summary?: string
}

export function UploadAnalyzer({ examId, subject, onPointsGenerated }: UploadAnalyzerProps) {
    const { settings, addKnowledgePoint } = useAppStore()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [isLoading, setIsLoading] = useState(false)
    const [uploadedImage, setUploadedImage] = useState<string | null>(null)
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)

    const hasAIConfig = !!settings.aiConfig?.apiKey

    // 处理文件上传
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // 检查文件类型
        const isImage = file.type.startsWith('image/')
        if (!isImage) {
            alert('目前仅支持图片格式 (JPG, PNG, WEBP)')
            return
        }

        // 转换为 base64
        const reader = new FileReader()
        reader.onload = async (event) => {
            const base64 = event.target?.result as string
            setUploadedImage(base64)

            // 自动开始分析
            await analyzeImage(base64)
        }
        reader.readAsDataURL(file)
    }

    // 分析图片内容
    const analyzeImage = async (imageBase64: string) => {
        if (!settings.aiConfig) return

        setIsLoading(true)
        setAnalysisResult(null)

        try {
            const prompt = `请分析这张图片的内容，判断它是以下哪种类型：

1. **考试范围/大纲**：如果是教学大纲、考试范围、知识点列表等
2. **题目/题库**：如果是试卷、练习题、题库等

根据内容类型，按照以下格式输出 JSON：

如果是考试范围/大纲：
{
  "type": "scope",
  "knowledgePoints": [
    {"name": "知识点名称", "importance": 1-5, "masteryLevel": 30}
  ],
  "summary": "简要说明这是什么内容"
}

如果是题目/题库：
{
  "type": "questions",
  "questionExplanations": [
    {
      "question": "题目内容",
      "answer": "正确答案",
      "explanation": "用最直白的话解释这道题，为什么答案是这个，相关知识点是什么",
      "knowledgePoint": "这道题考察的知识点"
    }
  ],
  "summary": "简要说明共有多少道题"
}

学科：${subject}
请直接输出 JSON，不要加 markdown 代码块。`

            const response = await callAIWithImage(settings.aiConfig, prompt, imageBase64)

            // 解析 JSON
            const jsonMatch = response.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]) as AnalysisResult
                setAnalysisResult(result)
            } else {
                throw new Error('AI 返回格式错误')
            }

            setIsLoading(false)
        } catch (error) {
            console.error('Failed to analyze:', error)
            alert('分析失败: ' + (error as Error).message)
            setIsLoading(false)
        }
    }

    // 添加知识点
    const addGeneratedPoints = () => {
        if (!analysisResult?.knowledgePoints) return

        analysisResult.knowledgePoints.forEach(point => {
            addKnowledgePoint({
                examId,
                name: point.name,
                importance: point.importance,
                masteryLevel: point.masteryLevel
            })
        })

        // 重置
        setUploadedImage(null)
        setAnalysisResult(null)
        onPointsGenerated?.(analysisResult.knowledgePoints as any)
    }

    // 清除上传
    const clearUpload = () => {
        setUploadedImage(null)
        setAnalysisResult(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    if (!hasAIConfig) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                        请先在设置中配置 AI API Key
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* 上传区域 */}
            {!uploadedImage && (
                <Card
                    className="border-dashed cursor-pointer hover:border-violet-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-950 flex items-center justify-center mb-4">
                            <Upload className="h-8 w-8 text-violet-500" />
                        </div>
                        <p className="text-lg font-medium mb-2">上传图片分析</p>
                        <p className="text-muted-foreground text-center text-sm">
                            支持上传考试范围、题库截图，AI 会自动识别并生成知识点或讲解题目
                        </p>
                        <div className="flex gap-2 mt-4">
                            <Badge variant="outline" className="gap-1">
                                <ImageIcon className="h-3 w-3" />
                                JPG
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                                <ImageIcon className="h-3 w-3" />
                                PNG
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                                <FileText className="h-3 w-3" />
                                WEBP
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
            />

            {/* 图片预览 */}
            {uploadedImage && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">已上传图片</CardTitle>
                        <Button variant="ghost" size="icon" onClick={clearUpload}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <img
                            src={uploadedImage}
                            alt="上传的图片"
                            className="max-h-64 mx-auto rounded-lg border"
                        />
                    </CardContent>
                </Card>
            )}

            {/* 分析中 */}
            {isLoading && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-12 w-12 text-violet-500 animate-spin mb-4" />
                        <p className="text-lg font-medium">AI 正在分析图片内容...</p>
                        <p className="text-muted-foreground">这可能需要几秒钟</p>
                    </CardContent>
                </Card>
            )}

            {/* 分析结果 - 考试范围 */}
            {analysisResult?.type === 'scope' && (
                <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-emerald-600">
                            <Sparkles className="h-5 w-5" />
                            识别到考试范围
                        </CardTitle>
                        <CardDescription>{analysisResult.summary}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {analysisResult.knowledgePoints?.map((point, i) => (
                            <div key={i} className="p-3 rounded-lg border bg-card">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium">{point.name}</span>
                                    <Badge variant="secondary">重要度 {point.importance}</Badge>
                                </div>
                                <Progress value={point.masteryLevel} className="h-2" />
                            </div>
                        ))}

                        <Button onClick={addGeneratedPoints} className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-teal-500">
                            <Plus className="h-4 w-4" />
                            全部添加到我的知识点 ({analysisResult.knowledgePoints?.length} 个)
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* 分析结果 - 题目讲解 */}
            {analysisResult?.type === 'questions' && (
                <Card className="border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-violet-600">
                            <BookOpen className="h-5 w-5" />
                            题目讲解
                        </CardTitle>
                        <CardDescription>{analysisResult.summary}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {analysisResult.questionExplanations?.map((item, i) => (
                            <div key={i} className="p-4 rounded-lg border bg-card space-y-3">
                                <div className="flex items-start gap-2">
                                    <Badge variant="outline" className="shrink-0">第 {i + 1} 题</Badge>
                                    <p className="font-medium">{item.question}</p>
                                </div>

                                <div className="p-3 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                        ✓ 答案：{item.answer}
                                    </p>
                                </div>

                                <div className="p-3 rounded bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
                                    <p className="text-sm text-violet-700 dark:text-violet-300 flex items-start gap-2">
                                        <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                                        <MarkdownRenderer content={item.explanation} />
                                    </p>
                                </div>

                                <Badge variant="secondary" className="text-xs">
                                    考察知识点：{item.knowledgePoint}
                                </Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
