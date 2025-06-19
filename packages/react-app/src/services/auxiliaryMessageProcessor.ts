import { IAuxiliaryMessage } from '@/hooks/useAuxiliaryInstance'

/**
 * 辅助消息处理结果
 */
interface IProcessResult {
  /**
   * 处理器名称
   */
  processor: string
  /**
   * 是否成功
   */
  success: boolean
  /**
   * 处理结果数据
   */
  data?: unknown
  /**
   * 错误信息
   */
  error?: string
  /**
   * 处理时间戳
   */
  timestamp: number
}

/**
 * 辅助消息处理器接口
 */
interface IAuxiliaryMessageProcessor {
  /**
   * 处理器名称
   */
  name: string
  /**
   * 处理器描述
   */
  description: string
  /**
   * 是否启用
   */
  enabled: boolean
  /**
   * 处理函数
   */
  process: (message: IAuxiliaryMessage) => Promise<IProcessResult> | IProcessResult
}

/**
 * 辅助消息处理器管理类
 */
class AuxiliaryMessageProcessorManager {
  private processors: Map<string, IAuxiliaryMessageProcessor> = new Map()

  /**
   * 注册处理器
   */
  registerProcessor(processor: IAuxiliaryMessageProcessor) {
    this.processors.set(processor.name, processor)
  }

  /**
   * 处理辅助消息
   */
  async processMessage(message: IAuxiliaryMessage): Promise<IProcessResult[]> {
    const results: IProcessResult[] = []
    const enabledProcessors = Array.from(this.processors.values()).filter(p => p.enabled)

    for (const processor of enabledProcessors) {
      try {
        const result = await processor.process(message)
        const finalResult: IProcessResult = {
          ...result,
          processor: processor.name,
          timestamp: Date.now()
        }
        results.push(finalResult)
      } catch (error) {
        const errorResult: IProcessResult = {
          processor: processor.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now()
        }
        results.push(errorResult)
      }
    }

    return results
  }

  /**
   * 获取所有处理器信息
   */
  getProcessors() {
    return Array.from(this.processors.values())
  }
}

// 单例实例
export const auxiliaryMessageProcessor = new AuxiliaryMessageProcessorManager()

/**
 * 地址识别处理器
 */
export const addressRecognitionProcessor: IAuxiliaryMessageProcessor = {
  name: 'addressRecognition',
  description: '识别和提取消息中的地址信息',
  enabled: true,
  process: async (message: IAuxiliaryMessage) => {
    try {
      const { content } = message
      
      // 简单的地址识别逻辑
      const addressPatterns = [
        /([北上广深]\w*[市区县])/g,
        /(\w+省\w*[市区县])/g,
        /(\w+市\w*[区县])/g,
        /(\w+区\w*[街道路])/g
      ]
      
      const addresses: string[] = []
      for (const pattern of addressPatterns) {
        const matches = content.match(pattern)
        if (matches) {
          addresses.push(...matches)
        }
      }
      
      const hasAddress = addresses.length > 0
      
      return {
        processor: 'addressRecognition',
        success: true,
        data: {
          hasAddress,
          addresses: [...new Set(addresses)], // 去重
          originalContent: content
        },
        timestamp: Date.now()
      }
    } catch (error) {
      return {
        processor: 'addressRecognition',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      }
    }
  }
}

// 自动注册默认处理器
auxiliaryMessageProcessor.registerProcessor(addressRecognitionProcessor) 