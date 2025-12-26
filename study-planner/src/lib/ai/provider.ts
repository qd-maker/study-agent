import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import type { AIConfig, AIProvider } from '@/types'

// DeepSeek 和通义千问使用 OpenAI 兼容接口
const providerConfigs: Record<Exclude<AIProvider, 'custom'>, { baseURL?: string; defaultModel: string }> = {
    openai: { defaultModel: 'gpt-4o-mini' },
    anthropic: { defaultModel: 'claude-3-5-sonnet-20241022' },
    dashscope: {
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        defaultModel: 'qwen-plus'
    },
    deepseek: {
        baseURL: 'https://api.deepseek.com/v1',
        defaultModel: 'deepseek-chat'
    }
}

export function createAIProvider(config: AIConfig) {
    const { provider, apiKey, model } = config

    if (provider === 'custom') {
        return null
    }

    const providerConfig = providerConfigs[provider]

    if (provider === 'anthropic') {
        return {
            client: createAnthropic({ apiKey }),
            model: model || providerConfig.defaultModel
        }
    }

    return {
        client: createOpenAI({
            apiKey,
            baseURL: providerConfig.baseURL
        }),
        model: model || providerConfig.defaultModel
    }
}

// 直接使用 fetch 调用 API（支持图片）
async function callAPIDirectly(
    baseURL: string,
    apiKey: string,
    model: string,
    prompt: string,
    systemPrompt?: string,
    imageBase64?: string  // 可选的图片 base64
): Promise<string> {
    const messages: any[] = []

    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt })
    }

    // 如果有图片，使用多模态格式
    if (imageBase64) {
        messages.push({
            role: 'user',
            content: [
                {
                    type: 'image_url',
                    image_url: {
                        url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                    }
                },
                {
                    type: 'text',
                    text: prompt
                }
            ]
        })
    } else {
        messages.push({ role: 'user', content: prompt })
    }

    const cleanBaseURL = baseURL.replace(/\/+$/, '')
    const endpoint = cleanBaseURL.includes('/chat/completions')
        ? cleanBaseURL
        : `${cleanBaseURL}/chat/completions`

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 4096
        })
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
        throw new Error(error.error?.message || `API 请求失败: ${response.status}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
}

// 普通文本调用
export async function callAI(config: AIConfig, prompt: string, systemPrompt?: string): Promise<string> {
    const { provider, apiKey, model, customBaseURL } = config

    if (provider === 'custom') {
        if (!customBaseURL || !model) {
            throw new Error('自定义模型需要配置 baseURL 和模型名称')
        }
        return callAPIDirectly(customBaseURL, apiKey, model, prompt, systemPrompt)
    }

    const providerConfig = providerConfigs[provider]
    const actualModel = model || providerConfig.defaultModel

    if ((provider === 'deepseek' || provider === 'dashscope') && providerConfig.baseURL) {
        return callAPIDirectly(providerConfig.baseURL, apiKey, actualModel, prompt, systemPrompt)
    }

    const aiProvider = createAIProvider(config)
    if (!aiProvider) {
        throw new Error('无法创建 AI Provider')
    }

    try {
        const result = await generateText({
            model: aiProvider.client(actualModel),
            system: systemPrompt,
            prompt
        })

        return result.text
    } catch (error) {
        console.error('AI call failed:', error)
        throw error
    }
}

// 图片分析调用
export async function callAIWithImage(
    config: AIConfig,
    prompt: string,
    imageBase64: string,
    systemPrompt?: string
): Promise<string> {
    const { provider, apiKey, model, customBaseURL } = config

    // 对于支持图片的模型，使用 fetch 直接调用
    if (provider === 'custom') {
        if (!customBaseURL || !model) {
            throw new Error('自定义模型需要配置 baseURL 和模型名称')
        }
        return callAPIDirectly(customBaseURL, apiKey, model, prompt, systemPrompt, imageBase64)
    }

    const providerConfig = providerConfigs[provider]
    const actualModel = model || providerConfig.defaultModel

    // 使用支持视觉的模型
    let visionModel = actualModel
    if (provider === 'openai' && !actualModel.includes('vision') && !actualModel.includes('4o')) {
        visionModel = 'gpt-4o-mini' // 默认使用支持视觉的模型
    }
    if (provider === 'dashscope') {
        visionModel = 'qwen-vl-plus' // 通义千问视觉模型
    }

    const baseURL = providerConfig.baseURL || 'https://api.openai.com/v1'
    return callAPIDirectly(baseURL, apiKey, visionModel, prompt, systemPrompt, imageBase64)
}

// 流式调用
export function streamAI(config: AIConfig, prompt: string, systemPrompt?: string) {
    const aiProvider = createAIProvider(config)
    if (!aiProvider) return null

    return {
        model: aiProvider.client(aiProvider.model),
        system: systemPrompt,
        prompt
    }
}
