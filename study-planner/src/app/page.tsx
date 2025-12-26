'use client'

import { useAppStore } from '@/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Target, AlertTriangle, Sparkles, BookOpen, GraduationCap, Brain } from 'lucide-react'
import { SlideUp, StaggerList, StaggerItem, HoverScale } from '@/components/ui/motion'
import Link from 'next/link'

export default function Dashboard() {
  const { exams, settings, knowledgePoints, getReviewsDueToday } = useAppStore()
  const dueReviews = getReviewsDueToday()

  const upcomingExams = exams
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3)

  const totalPoints = knowledgePoints.length
  const weakPoints = knowledgePoints.filter(k => k.masteryLevel < 60)
  const avgMastery = totalPoints > 0
    ? Math.round(knowledgePoints.reduce((s, k) => s + k.masteryLevel, 0) / totalPoints)
    : 0

  const hasAIConfig = !!settings.aiConfig?.apiKey

  return (
    <div className="space-y-8">
      {/* 欢迎区域 */}
      <SlideUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              学习助手
            </h1>
            <p className="text-muted-foreground mt-1">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
            </p>
          </div>
          {!hasAIConfig && (
            <Link href="/settings">
              <Button variant="outline" className="gap-2 animate-pulse">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                配置 AI
              </Button>
            </Link>
          )}
        </div>
      </SlideUp>

      {/* 快速入口 */}
      <StaggerList className="grid gap-4 md:grid-cols-3">
        <StaggerItem>
          <Link href="/exams">
            <HoverScale>
              <Card className="cursor-pointer border-l-4 border-l-violet-500 hover:shadow-lg transition-shadow">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
                    <GraduationCap className="h-6 w-6 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{exams.length}</p>
                    <p className="text-sm text-muted-foreground">场考试</p>
                  </div>
                </CardContent>
              </Card>
            </HoverScale>
          </Link>
        </StaggerItem>

        <StaggerItem>
          <Link href="/weakness">
            <HoverScale>
              <Card className="cursor-pointer border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                    <Target className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{weakPoints.length}</p>
                    <p className="text-sm text-muted-foreground">待加强知识点</p>
                  </div>
                </CardContent>
              </Card>
            </HoverScale>
          </Link>
        </StaggerItem>

        <StaggerItem>
          <HoverScale>
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{avgMastery}%</p>
                  <p className="text-sm text-muted-foreground">平均掌握度</p>
                </div>
              </CardContent>
            </Card>
          </HoverScale>
        </StaggerItem>
      </StaggerList>

      {/* 今日复习 */}
      {dueReviews.length > 0 && (
        <SlideUp delay={0.15}>
          <Link href="/review">
            <Card className="cursor-pointer border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow bg-gradient-to-r from-purple-500/5 to-indigo-500/5">
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                    <Brain className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">今日待复习</p>
                    <p className="text-sm text-muted-foreground">基于艾宾浩斯遗忘曲线</p>
                  </div>
                </div>
                <Badge className="bg-purple-500 text-lg px-4 py-1">{dueReviews.length}</Badge>
              </CardContent>
            </Card>
          </Link>
        </SlideUp>
      )}

      {/* 即将到来的考试 */}
      {upcomingExams.length > 0 && (
        <SlideUp delay={0.2}>
          <Card>
            <CardHeader>
              <CardTitle>即将到来的考试</CardTitle>
            </CardHeader>
            <CardContent>
              <StaggerList className="space-y-3">
                {upcomingExams.map(exam => {
                  const daysLeft = Math.ceil(
                    (new Date(exam.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  )
                  const examPoints = knowledgePoints.filter(k => k.examId === exam.id)
                  const examWeak = examPoints.filter(k => k.masteryLevel < 60).length

                  return (
                    <StaggerItem key={exam.id}>
                      <HoverScale>
                        <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                          <div>
                            <h3 className="font-medium">{exam.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {exam.subject} · {examPoints.length} 个知识点
                              {examWeak > 0 && <span className="text-amber-600"> · {examWeak} 个待加强</span>}
                            </p>
                          </div>
                          <Badge
                            variant={daysLeft <= 7 ? 'destructive' : daysLeft <= 14 ? 'secondary' : 'outline'}
                            className={daysLeft <= 7 ? 'animate-pulse' : ''}
                          >
                            {daysLeft} 天后
                          </Badge>
                        </div>
                      </HoverScale>
                    </StaggerItem>
                  )
                })}
              </StaggerList>
            </CardContent>
          </Card>
        </SlideUp>
      )}

      {/* 需要学习的知识点 */}
      {weakPoints.length > 0 && (
        <SlideUp delay={0.3}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>需要加强的知识点</CardTitle>
                <CardDescription>点击开始 AI 一对一学习</CardDescription>
              </div>
              <Link href="/weakness">
                <Button variant="ghost" size="sm">查看全部 →</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <StaggerList className="space-y-3">
                {weakPoints.slice(0, 5).map(point => {
                  const exam = exams.find(e => e.id === point.examId)
                  return (
                    <StaggerItem key={point.id}>
                      <Link href={`/learn?id=${point.id}`}>
                        <HoverScale>
                          <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-3">
                              <Sparkles className="h-4 w-4 text-violet-500 group-hover:animate-spin" />
                              <div>
                                <p className="font-medium">{point.name}</p>
                                <p className="text-xs text-muted-foreground">{exam?.subject}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={point.masteryLevel} className="w-20 h-2" />
                              <span className="text-sm text-muted-foreground w-10">{point.masteryLevel}%</span>
                            </div>
                          </div>
                        </HoverScale>
                      </Link>
                    </StaggerItem>
                  )
                })}
              </StaggerList>
            </CardContent>
          </Card>
        </SlideUp>
      )}

      {/* 空状态引导 */}
      {exams.length === 0 && (
        <SlideUp delay={0.1}>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-950 flex items-center justify-center mb-4 animate-bounce">
                <GraduationCap className="h-8 w-8 text-violet-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">开始使用</h3>
              <p className="text-muted-foreground text-center mb-4">
                添加你的考试，然后上传题库或添加知识点开始学习
              </p>
              <Link href="/exams">
                <Button className="bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600">
                  添加考试
                </Button>
              </Link>
            </CardContent>
          </Card>
        </SlideUp>
      )}
    </div>
  )
}
