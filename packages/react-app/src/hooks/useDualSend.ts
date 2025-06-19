import { useCallback, useRef } from 'react'
import { DifyApi, IFile, createDifyApiInstance } from '@dify-chat/api'
import { useDifyChat } from '@dify-chat/core'

interface IDualSendConfig {
  /**
   * 主API实例
   */
  mainApi: DifyApi
  /**
   * 辅助API配置
   */
  auxiliaryConfig?: {
    apiBase?: string
    apiKey?: string
    user?: string
  }
}

interface ISendParams {
  query: string
  conversationId?: string
  inputs?: Record<string, string>
  files?: IFile[]
}

/**
 * 双发送Hook - 在现有发送逻辑基础上添加辅助API调用
 */
export const useDualSend = (config: IDualSendConfig) => {
  const { mainApi, auxiliaryConfig } = config
  const { user } = useDifyChat()
  const auxiliaryApiRef = useRef<DifyApi | null>(null)

  // 初始化辅助API
  const getAuxiliaryApi = useCallback(() => {
    if (!auxiliaryApiRef.current && auxiliaryConfig) {
      auxiliaryApiRef.current = createDifyApiInstance({
        user: auxiliaryConfig.user || user,
        apiBase: auxiliaryConfig.apiBase || mainApi.options.apiBase,
        apiKey: auxiliaryConfig.apiKey || mainApi.options.apiKey,
      })
    }
    return auxiliaryApiRef.current
  }, [auxiliaryConfig, user, mainApi])

  /**
   * 静默发送辅助消息
   */
  const sendAuxiliaryMessage = useCallback(async (params: ISendParams) => {
    const auxiliaryApi = getAuxiliaryApi()
    if (!auxiliaryApi) return null

    try {
      console.log('🔧 发送辅助消息:', params.query)
      
      const response = await auxiliaryApi.sendMessage({
        conversation_id: params.conversationId,
        inputs: params.inputs || {},
        files: params.files || [],
        user,
        response_mode: 'streaming',
        query: params.query
      })

      // 静默消费流响应（不显示在UI中）
      if (response.body) {
        const reader = response.body.getReader()
        let result = ''
        
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          
          if (value) {
            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split('\n')
            
            for (const line of lines) {
              if (line.startsWith('data: ') && line.length > 6) {
                try {
                  const data = JSON.parse(line.substring(6))
                  if (data.event === 'message') {
                    result += data.answer || ''
                  }
                                 } catch {
                   // 忽略解析错误
                 }
              }
            }
          }
        }
        
        console.log('✅ 辅助消息响应完成:', result.substring(0, 100) + '...')
        return result
      }
      
      return null
    } catch (error) {
      console.warn('⚠️ 辅助消息发送失败:', error)
      return null
    }
  }, [getAuxiliaryApi, user])

  /**
   * 包装原始onSubmit方法，添加辅助调用
   */
  const wrapWithDualSend = useCallback((
    originalOnSubmit: (content: string, options?: { files?: IFile[]; inputs?: Record<string, unknown> }) => void,
    auxiliaryQueryGenerator?: (originalQuery: string) => string
  ) => {
    return async (content: string, options?: { files?: IFile[]; inputs?: Record<string, unknown> }) => {
      // 1. 正常调用原始发送方法
      originalOnSubmit(content, options)
      
      // 2. 如果配置了辅助API，则静默发送辅助消息
      if (auxiliaryConfig) {
        // 生成辅助查询内容
        const auxiliaryQuery = auxiliaryQueryGenerator ? auxiliaryQueryGenerator(content) : `辅助分析: ${content}`
        
        // 异步发送辅助消息（不阻塞主流程）
        setTimeout(() => {
          sendAuxiliaryMessage({
            query: auxiliaryQuery,
            conversationId: undefined, // 通常辅助查询使用新对话
            inputs: (options?.inputs as Record<string, string>) || {},
            files: options?.files || []
          }).catch(error => {
            console.warn('辅助消息异步发送失败:', error)
          })
        }, 100) // 稍微延迟，确保主消息先发送
      }
    }
  }, [auxiliaryConfig, sendAuxiliaryMessage])

  return {
    sendAuxiliaryMessage,
    wrapWithDualSend,
    hasAuxiliaryConfig: !!auxiliaryConfig
  }
} 