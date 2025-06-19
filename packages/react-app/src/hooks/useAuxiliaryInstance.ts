import { useCallback, useRef, useState } from 'react'
import { DifyApi, IFile, createDifyApiInstance, EventEnum } from '@dify-chat/api'
import { useDifyChat } from '@dify-chat/core'
import { XStream } from '@ant-design/x'

// 🔥 辅助实例管理器
class AuxiliaryInstanceManager {
  private activeRequests = new Map<string, AbortController>()
  private requestCounter = 0

  /**
   * 创建新的请求ID
   */
  createRequestId(): string {
    return `auxiliary-request-${++this.requestCounter}-${Date.now()}`
  }

  /**
   * 注册活跃请求
   */
  registerRequest(requestId: string, controller: AbortController): void {
    this.activeRequests.set(requestId, controller)
  }

  /**
   * 取消指定请求
   */
  cancelRequest(requestId: string): boolean {
    const controller = this.activeRequests.get(requestId)
    if (controller) {
      controller.abort()
      this.activeRequests.delete(requestId)
      return true
    }
    return false
  }

  /**
   * 取消所有活跃请求
   */
  cancelAllRequests(): number {
    const count = this.activeRequests.size
    for (const [requestId, controller] of this.activeRequests) {
      controller.abort()
    }
    this.activeRequests.clear()
    console.log(`🛑 已取消 ${count} 个辅助请求`)
    return count
  }

  /**
   * 完成请求时清理
   */
  completeRequest(requestId: string): void {
    this.activeRequests.delete(requestId)
  }

  /**
   * 获取活跃请求数量
   */
  getActiveRequestsCount(): number {
    return this.activeRequests.size
  }

  /**
   * 获取所有活跃请求ID
   */
  getActiveRequestIds(): string[] {
    return Array.from(this.activeRequests.keys())
  }
}

// 🔥 全局辅助实例管理器
const auxiliaryManager = new AuxiliaryInstanceManager()

interface IAuxiliaryConfig {
  /**
   * 辅助API配置
   */
  apiBase?: string
  apiKey?: string
  user?: string
}

export interface IAuxiliaryMessage {
  /**
   * 消息ID
   */
  messageId: string
  /**
   * 对话ID
   */
  conversationId: string
  /**
   * 完整的回复内容
   */
  content: string
  /**
   * 发送的原始查询
   */
  query: string
  /**
   * 响应时间戳
   */
  timestamp: number
  /**
   * 处理状态
   */
  status: 'success' | 'error'
  /**
   * 错误信息（如果有）
   */
  error?: string
  /**
   * 请求ID（用于追踪和取消）
   */
  requestId?: string
}

interface IAuxiliaryResponse {
  /**
   * 是否成功
   */
  success: boolean
  /**
   * 消息数据
   */
  message?: IAuxiliaryMessage
  /**
   * 错误信息
   */
  error?: string
}

type AuxiliaryMessageHandler = (message: IAuxiliaryMessage) => void | Promise<void>
type AuxiliaryErrorHandler = (error: string, query: string) => void

/**
 * 辅助实例Hook - 专门处理不上屏的辅助消息
 */
export const useAuxiliaryInstance = (config?: IAuxiliaryConfig) => {
  const { user } = useDifyChat()
  const auxiliaryApiRef = useRef<DifyApi | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [messageHistory, setMessageHistory] = useState<IAuxiliaryMessage[]>([])
  
  // 消息处理器注册表
  const messageHandlersRef = useRef<AuxiliaryMessageHandler[]>([])
  const errorHandlersRef = useRef<AuxiliaryErrorHandler[]>([])

  /**
   * 初始化辅助API实例
   */
  const initAuxiliaryApi = useCallback(() => {
    if (!auxiliaryApiRef.current) {
      auxiliaryApiRef.current = createDifyApiInstance({
        user: config?.user || user,
        apiBase: config?.apiBase || 'http://dify-test-b.dslyy.com/v1',
        apiKey: config?.apiKey || 'app-default-key',
      })
      console.log('🔧 辅助API实例已初始化:', {
        apiBase: config?.apiBase,
        user: config?.user || user
      })
    }
    return auxiliaryApiRef.current
  }, [config, user])

  /**
   * 注册消息处理器
   */
  const onMessage = useCallback((handler: AuxiliaryMessageHandler) => {
    messageHandlersRef.current.push(handler)
    
    // 返回取消注册的函数
    return () => {
      const index = messageHandlersRef.current.indexOf(handler)
      if (index > -1) {
        messageHandlersRef.current.splice(index, 1)
      }
    }
  }, [])

  /**
   * 注册错误处理器
   */
  const onError = useCallback((handler: AuxiliaryErrorHandler) => {
    errorHandlersRef.current.push(handler)
    
    return () => {
      const index = errorHandlersRef.current.indexOf(handler)
      if (index > -1) {
        errorHandlersRef.current.splice(index, 1)
      }
    }
  }, [])

  /**
   * 触发消息处理器
   */
  const triggerMessageHandlers = useCallback(async (message: IAuxiliaryMessage) => {
    for (const handler of messageHandlersRef.current) {
      try {
        await handler(message)
      } catch (error) {
        console.error('消息处理器执行失败:', error)
      }
    }
  }, [])

  /**
   * 触发错误处理器
   */
  const triggerErrorHandlers = useCallback((error: string, query: string) => {
    for (const handler of errorHandlersRef.current) {
      try {
        handler(error, query)
      } catch (err) {
        console.error('错误处理器执行失败:', err)
      }
    }
  }, [])

  /**
   * 发送辅助消息（不上屏）
   */
  const sendAuxiliaryMessage = useCallback(async (params: {
    query: string
    conversationId?: string
    inputs?: Record<string, string>
    files?: IFile[]
  }): Promise<IAuxiliaryResponse> => {
    const { query, conversationId, inputs = {}, files = [] } = params
    const auxiliaryApi = initAuxiliaryApi()
    
    // 🔥 创建请求ID和中断控制器
    const requestId = auxiliaryManager.createRequestId()
    const abortController = new AbortController()
    auxiliaryManager.registerRequest(requestId, abortController)
    
    setIsProcessing(true)
    
    try {
      console.log('🚀 发送辅助消息:', query)
      
      const response = await auxiliaryApi.sendMessage({
        conversation_id: conversationId,
        inputs,
        files,
        user: config?.user || user,
        response_mode: 'streaming',
        query
      })

      if (response.status !== 200) {
        const errorMsg = `辅助API请求失败: ${response.status} ${response.statusText}`
        triggerErrorHandlers(errorMsg, query)
        return { success: false, error: errorMsg }
      }

      // 处理流式响应但不上屏
      let content = ''
      let lastContent = '' // 🔥 记录上次的完整内容，避免重复
      let messageId = ''
      let finalConversationId = conversationId || ''
      let isStreamEnded = false
      
      const readableStream = XStream({
        readableStream: response.body as ReadableStream,
      })

      const reader = readableStream.getReader()
      
      // 🔥 设置超时控制（防止长时间无响应）
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ 辅助消息处理超时，主动结束')
        abortController.abort()
        reader.cancel()
      }, 30000) // 30秒超时
      
      try {
        while (!isStreamEnded && !abortController.signal.aborted) {
          const { value: chunk, done } = await reader.read()
          
          if (done || abortController.signal.aborted) {
            console.log('🔚 辅助消息流结束 (done或aborted)')
            break
          }
          
          if (chunk?.data) {
            try {
              const parsedData = JSON.parse(chunk.data)
              
              // 更新ID信息
              if (parsedData.conversation_id) {
                finalConversationId = parsedData.conversation_id
              }
              if (parsedData.message_id) {
                messageId = parsedData.message_id
              }
              
              // 🔥 处理消息内容 - 避免重复累积
              if (parsedData.event === EventEnum.MESSAGE) {
                // 使用完整的answer替换，而不是累积
                if (parsedData.answer && parsedData.answer !== lastContent) {
                  content = parsedData.answer
                  lastContent = parsedData.answer
                  console.log('📝 辅助消息内容更新:', content.length, '字符')
                }
              }
              
              // 🔥 处理所有可能的结束事件
              if (parsedData.event === EventEnum.MESSAGE_END || 
                  parsedData.event === EventEnum.WORKFLOW_FINISHED ||
                  parsedData.event === EventEnum.ERROR) {
                
                if (parsedData.event === EventEnum.MESSAGE_END) {
                  console.log('✅ 辅助消息正常结束 (MESSAGE_END)')
                } else if (parsedData.event === EventEnum.WORKFLOW_FINISHED) {
                  console.log('✅ 辅助消息工作流结束 (WORKFLOW_FINISHED)')
                } else if (parsedData.event === EventEnum.ERROR) {
                  console.error('❌ 辅助消息错误结束:', parsedData.message)
                  const errorMsg = `辅助消息处理错误: ${parsedData.message}`
                  triggerErrorHandlers(errorMsg, query)
                  return { success: false, error: errorMsg }
                }
                
                isStreamEnded = true
                break
              }
              
              // 🔥 处理ping事件（保持连接活跃，但不需要特殊处理）
              if (parsedData.event === EventEnum.PING) {
                // ping事件仅用于保持连接，无需处理
                continue
              }
              
            } catch (parseError) {
              console.warn('解析辅助消息数据失败:', parseError, 'chunk:', chunk.data?.substring(0, 100))
            }
          }
        }
      } finally {
        clearTimeout(timeoutId)
        reader.releaseLock()
      }

      // 🔥 确保内容不为空
      if (!content.trim()) {
        console.warn('⚠️ 辅助消息内容为空')
        return { success: false, error: '辅助消息内容为空' }
      }

      // 创建消息对象
      const auxiliaryMessage: IAuxiliaryMessage = {
        messageId,
        conversationId: finalConversationId,
        content: content.trim(), // 去除首尾空白
        query,
        timestamp: Date.now(),
        status: 'success',
        requestId // 🔥 添加请求ID用于追踪
      }

      // 保存到历史记录
      setMessageHistory(prev => [...prev, auxiliaryMessage])
      
      // 触发处理器
      await triggerMessageHandlers(auxiliaryMessage)
      
      console.log('🎯 辅助消息处理完成:', {
        length: content.length,
        preview: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        messageId,
        conversationId: finalConversationId
      })
      
      return { success: true, message: auxiliaryMessage }
      
    } catch (error) {
      const errorMsg = `辅助消息发送失败: ${error}`
      console.error('❌', errorMsg)
      triggerErrorHandlers(errorMsg, query)
      return { success: false, error: errorMsg }
      
    } finally {
      // 🔥 清理请求
      auxiliaryManager.completeRequest(requestId)
      setIsProcessing(false)
    }
  }, [config, user, initAuxiliaryApi, triggerMessageHandlers, triggerErrorHandlers])

  /**
   * 批量发送辅助消息
   */
  const sendBatchAuxiliaryMessages = useCallback(async (queries: string[]) => {
    const results: IAuxiliaryResponse[] = []
    
    for (const query of queries) {
      // 避免频率过快
      if (results.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      const result = await sendAuxiliaryMessage({ query })
      results.push(result)
    }
    
    return results
  }, [sendAuxiliaryMessage])

  /**
   * 获取消息历史
   */
  const getMessageHistory = useCallback((filter?: {
    query?: string
    status?: 'success' | 'error'
    limit?: number
  }) => {
    let filtered = messageHistory
    
    if (filter?.query) {
      filtered = filtered.filter(msg => 
        msg.query.includes(filter.query!) || msg.content.includes(filter.query!)
      )
    }
    
    if (filter?.status) {
      filtered = filtered.filter(msg => msg.status === filter.status)
    }
    
    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit)
    }
    
    return filtered
  }, [messageHistory])

  /**
   * 清除消息历史
   */
  const clearMessageHistory = useCallback(() => {
    setMessageHistory([])
  }, [])

  /**
   * 取消所有活跃的辅助请求
   */
  const cancelAllAuxiliaryRequests = useCallback(() => {
    const cancelledCount = auxiliaryManager.cancelAllRequests()
    setIsProcessing(false)
    return cancelledCount
  }, [])

  /**
   * 获取活跃请求状态
   */
  const getActiveRequestsInfo = useCallback(() => {
    return {
      count: auxiliaryManager.getActiveRequestsCount(),
      ids: auxiliaryManager.getActiveRequestIds()
    }
  }, [])

  return {
    // 核心方法
    sendAuxiliaryMessage,
    sendBatchAuxiliaryMessages,
    
    // 请求控制
    cancelAllAuxiliaryRequests,
    getActiveRequestsInfo,
    
    // 事件处理
    onMessage,
    onError,
    
    // 数据管理
    getMessageHistory,
    clearMessageHistory,
    messageHistory,
    
    // 状态
    isProcessing,
    isInitialized: !!auxiliaryApiRef.current,
    
    // API实例
    auxiliaryApi: auxiliaryApiRef.current,
    initAuxiliaryApi
  }
} 