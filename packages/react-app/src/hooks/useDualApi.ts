import { useCallback, useRef, useState } from 'react'
import { DifyApi, IFile, createDifyApiInstance } from '@dify-chat/api'
import { useDifyChat } from '@dify-chat/core'
import { message as antdMessage } from 'antd'

interface IDualApiOptions {
  /**
   * 主API实例（用于正常对话）
   */
  mainApi: DifyApi
  /**
   * 辅助API配置（用于第二次调用）
   */
  auxiliaryConfig?: {
    apiBase?: string
    apiKey?: string
    user?: string
  }
}

interface ISendDualMessageParams {
  query: string
  conversationId?: string
  inputs?: Record<string, string>
  files?: IFile[]
  /**
   * 辅助消息内容，如果不提供则使用主消息内容
   */
  auxiliaryQuery?: string
  /**
   * 是否静默执行辅助调用（不显示在UI中）
   */
  silentAuxiliary?: boolean
}

/**
 * 双API实例Hook - 支持同时调用两个API
 */
export const useDualApi = (options: IDualApiOptions) => {
  const { mainApi, auxiliaryConfig } = options
  const { user } = useDifyChat()
  const [isMainRequesting, setIsMainRequesting] = useState(false)
  const [isAuxiliaryRequesting, setIsAuxiliaryRequesting] = useState(false)
  
  // 辅助API实例
  const auxiliaryApiRef = useRef<DifyApi | null>(null)
  
  // 初始化辅助API实例
  const initAuxiliaryApi = useCallback(() => {
    if (!auxiliaryApiRef.current && auxiliaryConfig) {
      auxiliaryApiRef.current = createDifyApiInstance({
        user: auxiliaryConfig.user || user,
        apiBase: auxiliaryConfig.apiBase || mainApi.options.apiBase,
        apiKey: auxiliaryConfig.apiKey || mainApi.options.apiKey,
      })
    }
    return auxiliaryApiRef.current || mainApi
  }, [auxiliaryConfig, user, mainApi])

  /**
   * 发送主要消息
   */
  const sendMainMessage = useCallback(async (params: {
    query: string
    conversationId?: string
    inputs?: Record<string, string>
    files?: IFile[]
  }) => {
    setIsMainRequesting(true)
    try {
      const response = await mainApi.sendMessage({
        conversation_id: params.conversationId,
        inputs: params.inputs || {},
        files: params.files || [],
        user,
        response_mode: 'streaming',
        query: params.query
      })
      return response
    } catch (error) {
      console.error('主消息发送失败:', error)
      throw error
    } finally {
      setIsMainRequesting(false)
    }
  }, [mainApi, user])

  /**
   * 发送辅助消息（可选择静默执行）
   */
  const sendAuxiliaryMessage = useCallback(async (params: {
    query: string
    conversationId?: string
    inputs?: Record<string, string>
    files?: IFile[]
    silent?: boolean
  }) => {
    const auxiliaryApi = initAuxiliaryApi()
    
    if (!params.silent) {
      setIsAuxiliaryRequesting(true)
    }
    
    try {
      const response = await auxiliaryApi.sendMessage({
        conversation_id: params.conversationId,
        inputs: params.inputs || {},
        files: params.files || [],
        user,
        response_mode: 'streaming',
        query: params.query
      })
      
      if (params.silent) {
        // 静默处理响应
        const reader = response.body?.getReader()
        if (reader) {
          // 消费流但不显示在UI中
          while (true) {
            const { done } = await reader.read()
            if (done) break
          }
        }
      }
      
      return response
    } catch (error) {
      console.error('辅助消息发送失败:', error)
      if (!params.silent) {
        antdMessage.error('辅助处理失败')
      }
      throw error
    } finally {
      if (!params.silent) {
        setIsAuxiliaryRequesting(false)
      }
    }
  }, [initAuxiliaryApi, user])

  /**
   * 同时发送双消息
   */
  const sendDualMessage = useCallback(async (params: ISendDualMessageParams) => {
    const {
      query,
      conversationId,
      inputs = {},
      files = [],
      auxiliaryQuery,
      silentAuxiliary = true
    } = params

    const baseParams = {
      conversationId,
      inputs,
      files
    }

    try {
      // 同时发起两个请求
      const [mainResponse, auxiliaryResponse] = await Promise.allSettled([
        sendMainMessage({
          ...baseParams,
          query
        }),
        sendAuxiliaryMessage({
          ...baseParams,
          query: auxiliaryQuery || query,
          silent: silentAuxiliary
        })
      ])

      // 处理结果
      if (mainResponse.status === 'rejected') {
        console.error('主消息发送失败:', mainResponse.reason)
        throw new Error('主消息发送失败')
      }

      if (auxiliaryResponse.status === 'rejected') {
        console.warn('辅助消息发送失败:', auxiliaryResponse.reason)
        // 辅助消息失败不影响主流程
      }

      return {
        mainResponse: mainResponse.value,
        auxiliaryResponse: auxiliaryResponse.status === 'fulfilled' ? auxiliaryResponse.value : null,
        success: true
      }
    } catch (error) {
      console.error('双消息发送失败:', error)
      throw error
    }
  }, [sendMainMessage, sendAuxiliaryMessage])

  return {
    // 状态
    isMainRequesting,
    isAuxiliaryRequesting,
    isAnyRequesting: isMainRequesting || isAuxiliaryRequesting,
    
    // 方法
    sendMainMessage,
    sendAuxiliaryMessage,
    sendDualMessage,
    
    // API实例
    mainApi,
    auxiliaryApi: auxiliaryApiRef.current,
    initAuxiliaryApi
  }
} 