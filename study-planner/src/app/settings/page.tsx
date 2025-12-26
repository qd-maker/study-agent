'use client'

import { useState } from 'react'
import { useAppStore } from '@/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Settings, Key, Clock, Sparkles, CheckCircle2, Globe } from 'lucide-react'
import type { AIProvider } from '@/types'

const providerOptions: { value: AIProvider; label: string; placeholder: string }[] = [
    { value: 'openai', label: 'OpenAI', placeholder: 'sk-xxx' },
    { value: 'anthropic', label: 'Anthropic (Claude)', placeholder: 'sk-ant-xxx' },
    { value: 'dashscope', label: '通义千问', placeholder: 'sk-xxx' },
    { value: 'deepseek', label: 'Deepseek', placeholder: 'sk-xxx' },
    { value: 'custom', label: '自定义 / 聚合 API', placeholder: 'your-api-key' }
]

export default function SettingsPage() {
    const { settings, updateSettings, setAIConfig } = useAppStore()

    const [provider, setProvider] = useState<AIProvider>(settings.aiConfig?.provider || 'openai')
    const [apiKey, setApiKey] = useState(settings.aiConfig?.apiKey || '')
    const [customBaseURL, setCustomBaseURL] = useState(settings.aiConfig?.customBaseURL || '')
    const [customModel, setCustomModel] = useState(settings.aiConfig?.model || '')
    const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)

    const isCustom = provider === 'custom'

    const handleSaveAIConfig = () => {
        if (apiKey) {
            if (isCustom) {
                if (!customBaseURL || !customModel) {
                    alert('自定义模型需要填写 API 地址和模型名称')
                    return
                }
                setAIConfig({
                    provider,
                    apiKey,
                    customBaseURL,
                    model: customModel
                })
            } else {
                setAIConfig({ provider, apiKey })
            }
            setTestResult('success')
            setTimeout(() => setTestResult(null), 3000)
        } else {
            setAIConfig(null)
        }
    }

    const handleClearConfig = () => {
        setApiKey('')
        setCustomBaseURL('')
        setCustomModel('')
        setAIConfig(null)
        setTestResult(null)
    }

    const hasConfig = !!settings.aiConfig?.apiKey

    return (
        <div className="space-y-8 max-w-2xl">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                    设置
                </h1>
                <p className="text-muted-foreground mt-1">配置 AI 模型和学习偏好</p>
            </div>

            {/* AI 配置 */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-violet-500" />
                            <CardTitle>AI 模型配置</CardTitle>
                        </div>
                        {hasConfig && (
                            <Badge variant="outline" className="gap-1 text-emerald-600">
                                <CheckCircle2 className="h-3 w-3" />
                                已配置
                            </Badge>
                        )}
                    </div>
                    <CardDescription>配置 AI API Key 以启用智能功能</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>选择 AI 服务商</Label>
                        <Select value={provider} onValueChange={(v: AIProvider) => setProvider(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {providerOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 自定义模型额外配置 */}
                    {isCustom && (
                        <>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Globe className="h-4 w-4" />
                                    API 地址 (baseURL)
                                </Label>
                                <Input
                                    placeholder="https://api.example.com/v1"
                                    value={customBaseURL}
                                    onChange={(e) => setCustomBaseURL(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    OpenAI 兼容的 API 地址，通常以 /v1 结尾
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>模型名称</Label>
                                <Input
                                    placeholder="gpt-4o-mini / claude-3-5-sonnet / ..."
                                    value={customModel}
                                    onChange={(e) => setCustomModel(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    API 支持的模型名称
                                </p>
                            </div>
                        </>
                    )}

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Key className="h-4 w-4" />
                            API Key
                        </Label>
                        <Input
                            type="password"
                            placeholder={providerOptions.find(p => p.value === provider)?.placeholder}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            你的 API Key 仅存储在本地浏览器中，不会上传到服务器
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={handleSaveAIConfig} className="gap-2">
                            保存配置
                        </Button>
                        {hasConfig && (
                            <Button variant="outline" onClick={handleClearConfig}>
                                清除配置
                            </Button>
                        )}
                    </div>

                    {testResult === 'success' && (
                        <div className="flex items-center gap-2 text-emerald-600 text-sm">
                            <CheckCircle2 className="h-4 w-4" />
                            配置已保存
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 学习偏好 */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-violet-500" />
                        <CardTitle>学习偏好</CardTitle>
                    </div>
                    <CardDescription>设置每日学习时长和偏好时间段</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>每日学习时长（分钟）</Label>
                        <Input
                            type="number"
                            min={30}
                            max={480}
                            value={settings.dailyStudyMinutes}
                            onChange={(e) => updateSettings({ dailyStudyMinutes: Number(e.target.value) })}
                        />
                        <p className="text-xs text-muted-foreground">
                            建议设置 60-180 分钟，系统会自动分配任务
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>偏好学习时间</Label>
                        <Select
                            value={settings.preferredStudyTime}
                            onValueChange={(v: 'morning' | 'afternoon' | 'evening' | 'any') =>
                                updateSettings({ preferredStudyTime: v })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="any">不限</SelectItem>
                                <SelectItem value="morning">上午 (6:00-12:00)</SelectItem>
                                <SelectItem value="afternoon">下午 (12:00-18:00)</SelectItem>
                                <SelectItem value="evening">晚上 (18:00-24:00)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* 数据管理 */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-violet-500" />
                        <CardTitle>数据管理</CardTitle>
                    </div>
                    <CardDescription>管理本地存储的数据</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        所有数据存储在浏览器本地，清除浏览器数据会导致数据丢失。
                    </p>
                    <Button
                        variant="destructive"
                        onClick={() => {
                            if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
                                localStorage.clear()
                                window.location.reload()
                            }
                        }}
                    >
                        清除所有数据
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
