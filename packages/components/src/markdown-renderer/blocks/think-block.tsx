import React, { useContext, useEffect, useRef, useState } from 'react'

// 创建一个Context来传递消息状态
const MessageStatusContext = React.createContext<{
  messageStatus?: 'local' | 'loading' | 'success' | 'error'
  isRequesting?: boolean
  isHistory?: boolean
}>({})

// 导出Provider供外部使用
export const MessageStatusProvider = MessageStatusContext.Provider

const hasEndThink = (children: React.ReactNode): boolean => {
  if (typeof children === 'string')
    return children.includes('[ENDTHINKFLAG]')

  if (Array.isArray(children))
    return children.some(child => hasEndThink(child))

  if (React.isValidElement(children) && children.props?.children)
    return hasEndThink(children.props.children)

  return false
}

const removeEndThink = (children: React.ReactNode): React.ReactNode => {
  if (typeof children === 'string')
    return children.replace('[ENDTHINKFLAG]', '')

  if (Array.isArray(children))
    return children.map(child => removeEndThink(child))

  if (React.isValidElement(children) && children.props?.children) {
    return React.cloneElement(
      children,
      {
        ...children.props,
        children: removeEndThink(children.props.children),
      },
    )
  }

  return children
}

const useThinkTimer = (children: React.ReactNode) => {
  const [startTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [finalTime, setFinalTime] = useState<number | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const timerRef = useRef<NodeJS.Timeout>()
  const { messageStatus, isRequesting, isHistory } = useContext(MessageStatusContext)

  useEffect(() => {
    // 如果是历史消息，直接设置为完成状态
    if (isHistory) {
      setIsComplete(true)
      setElapsedTime(0) // 历史消息不显示计时
      return
    }

    // 检查初始状态是否已完成
    const initialComplete = hasEndThink(children)
    if (initialComplete) {
      setIsComplete(true)
      return
    }

    // 启动计时器
    timerRef.current = setInterval(() => {
      if (!isComplete)
        setElapsedTime(Math.floor((Date.now() - startTime) / 100) / 10)
    }, 100)

    return () => {
      if (timerRef.current)
        clearInterval(timerRef.current)
    }
  }, [startTime, isComplete, children, isHistory])

  useEffect(() => {
    if (hasEndThink(children)) {
      const currentTime = Math.floor((Date.now() - startTime) / 100) / 10
      setFinalTime(currentTime)
      setIsComplete(true)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = undefined
      }
    }
  }, [children, startTime])

  // 基于消息状态的完成检测
  useEffect(() => {
    // 如果消息状态为success且不在请求中，说明AI回复完成
    if (messageStatus === 'success' && !isRequesting && !isComplete) {
      const currentTime = Math.floor((Date.now() - startTime) / 100) / 10
      console.log('🔄 深度思考检测到消息完成，准备停止计时器', { 
        messageStatus, 
        isRequesting, 
        isComplete,
        elapsedTime: currentTime.toFixed(1) + 's'
      })
      
      // 延迟一点时间确保内容完全渲染
      const timer = setTimeout(() => {
        const finalCurrentTime = Math.floor((Date.now() - startTime) / 100) / 10
        setFinalTime(finalCurrentTime)
        console.log('⏹️ 深度思考计时器已停止', { finalTime: finalCurrentTime.toFixed(1) + 's' })
        setIsComplete(true)
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = undefined
        }
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [messageStatus, isRequesting, isComplete, startTime])

  // 添加安全机制：如果计时器运行时间过长（超过5分钟），自动停止
  useEffect(() => {
    if (!isComplete && elapsedTime > 300) { // 5分钟 = 300秒
      setFinalTime(elapsedTime)
      console.log('⏰ 深度思考计时器超时，自动停止', { elapsedTime: elapsedTime.toFixed(1) + 's' })
      setIsComplete(true)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = undefined
      }
    }
  }, [elapsedTime, isComplete])

  const displayTime = isComplete && finalTime !== null ? finalTime : elapsedTime
  return { elapsedTime: displayTime, isComplete }
}

interface ThinkBlockProps {
  children?: React.ReactNode
  'data-think'?: boolean
  [key: string]: unknown
}

export const ThinkBlock = ({ children, ...props }: ThinkBlockProps) => {
  const { elapsedTime, isComplete } = useThinkTimer(children)
  const { isHistory } = useContext(MessageStatusContext)
  const displayContent = removeEndThink(children)

  if (!(props['data-think'] ?? false))
    return (<details {...props}>{children}</details>)

  // 为历史消息显示特殊文本
  const summaryText = isHistory 
    ? '已深度思考'
    : isComplete 
      ? `已深度思考(${elapsedTime.toFixed(1)}s)` 
      : `深度思考中...(${elapsedTime.toFixed(1)}s)`

  return (
    <details {...(!isComplete && { open: true })} className="group">
      <summary className="flex cursor-pointer select-none list-none items-center whitespace-nowrap font-bold text-theme-desc">
        <div className="flex shrink-0 items-center">
          <svg
            className="mr-2 h-3 w-3 transition-transform duration-500 group-open:rotate-90"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          {summaryText}
        </div>
      </summary>
      <div className={`border-l mt-1 rounded-lg border-gray-300 ml-5 text-theme-desc`}>
        {displayContent}
      </div>
    </details>
  )
}

export default ThinkBlock
