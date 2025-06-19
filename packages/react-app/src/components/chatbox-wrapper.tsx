import { Prompts } from '@ant-design/x'
import { DifyApi, IFile, IMessageFileItem, MessageFileBelongsToEnum } from '@dify-chat/api'
import { IMessageItem4Render } from '@dify-chat/api'
import { Chatbox } from '@dify-chat/components'
import { useAppContext } from '@dify-chat/core'
import { Roles, useConversationsContext } from '@dify-chat/core'
import { isTempId } from '@dify-chat/helpers'
import { Button, Empty, Form, GetProp, Spin, notification } from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle, } from 'react'

import { useLatest } from '@/hooks/use-latest'
import { useX } from '@/hooks/useX'
import { useAuxiliaryInstance } from '@/hooks/useAuxiliaryInstance'
import { auxiliaryMessageProcessor } from '@/services/auxiliaryMessageProcessor'

import { AuxiliaryMessageModal } from '@/components/auxiliary-message-modal'
import workflowDataStorage from '@/hooks/useX/workflow-data-storage'

interface IChatboxWrapperProps {
	/**
	 * Dify API 实例
	 */
	difyApi: DifyApi
	/**
	 * 对话列表 loading
	 */
	conversationListLoading?: boolean
	/**
	 * 内部处理对话列表变更的函数
	 */
	conversationItemsChangeCallback: (showLoading?: boolean) => void
	/**
	 * 添加对话
	 */
	onAddConversation: () => void
	/**
	 * 触发配置应用事件
	 */
	handleStartConfig?: () => void
	onSendConfirmAddress: (message: any) => void
	/**
	 * 辅助API配置（可选）
	 */
	auxiliaryConfig?: {
		apiBase: string
		apiKey: string
		user?: string
	}
}

/**
 * 聊天容器 进入此组件时, 应保证应用信息和对话列表已经加载完成
 */
// export default function ChatboxWrapper(props: IChatboxWrapperProps) {
export const ChatboxWrapper = forwardRef<{ onSubmit: (content: string, options?: { files?: IFile[]; inputs?: Record<string, unknown> }) => void }, IChatboxWrapperProps>((props, ref) => {
	const {
		difyApi,
		conversationListLoading,
		onAddConversation,
		conversationItemsChangeCallback,
		handleStartConfig,
		auxiliaryConfig,
		onSendConfirmAddress,
	} = props
	const {
		currentConversationId,
		setCurrentConversationId,
		setConversations,
		currentConversationInfo,
	} = useConversationsContext()
	const { currentAppId, currentApp, appLoading } = useAppContext()

	const [entryForm] = Form.useForm()
	const abortRef = useRef(() => {})
	
	// 是否允许消息列表请求时展示 loading
	const [messagesloadingEnabled, setMessagesloadingEnabled] = useState(true)
	const [initLoading, setInitLoading] = useState<boolean>(false)
	const [historyMessages, setHistoryMessages] = useState<IMessageItem4Render[]>([])

	const [nextSuggestions, setNextSuggestions] = useState<string[]>([])
	// 定义 ref, 用于获取最新的 conversationId
	const latestProps = useLatest({
		conversationId: currentConversationId,
		appId: currentAppId,
	})
	const latestState = useLatest({
		inputParams: currentConversationInfo?.inputs || {},
	})

	const filesRef = useRef<IFile[]>([])

	// 初始化辅助实例
	const {
		sendAuxiliaryMessage,
		onMessage,
		onError,
		cancelAllAuxiliaryRequests
	} = useAuxiliaryInstance(auxiliaryConfig)

	// 🔥 组件生命周期管理
	useEffect(() => {
		return () => {
			abortRef.current()
			// 组件卸载时取消所有辅助请求
			if (cancelAllAuxiliaryRequests) {
				cancelAllAuxiliaryRequests()
			}
		}
	}, [cancelAllAuxiliaryRequests])

	// 🎯 弹窗状态管理
	const [auxiliaryModalVisible, setAuxiliaryModalVisible] = useState(false)
	const [currentAuxiliaryMessage, setCurrentAuxiliaryMessage] = useState<{
		query: string
		content: string
		timestamp: number
		conversationId?: string
	} | null>(null)



	// 🔥 注册辅助消息处理器
	useEffect(() => {
		if (!auxiliaryConfig) return

		const unsubscribeMessage = onMessage(async (message) => {
			// TODO: 这里调用地图方法将地址信息传给地图组件
			console.log('🚀 准备发送辅助消息返回结果:', message)
			props.onSendConfirmAddress(message)

			// 设置当前消息并显示弹窗
			// setCurrentAuxiliaryMessage({
			// 	query: message.query,
			// 	content: message.content,
			// 	timestamp: message.timestamp,
			// 	conversationId: message.conversationId
			// })
			// setAuxiliaryModalVisible(true)
			
			// 显示通知提醒
			// notification.info({
			// 	message: '🤖 辅助分析完成',
			// 	description: '点击查看完整的AI分析结果',
			// 	placement: 'topRight',
			// 	duration: 3,
			// 	onClick: () => {
			// 		setAuxiliaryModalVisible(true)
			// 	}
			// })
			
			// 使用处理器管理器处理消息
			const results = await auxiliaryMessageProcessor.processMessage(message)
			
			// 根据处理结果执行相应的业务逻辑
			handleAuxiliaryProcessResults(results, message)
		})

		const unsubscribeError = onError((error, query) => {
			console.error('❌ 辅助消息错误:', { error, query })
		})

		return () => {
			unsubscribeMessage()
			unsubscribeError()
		}
	}, [auxiliaryConfig, onMessage, onError])

	/**
	 * 处理辅助消息的处理结果
	 */
	const handleAuxiliaryProcessResults = useCallback((results: unknown[], _message: unknown) => {
		for (const result of results) {
			const processResult = result as { processor: string; success: boolean; data: unknown }
			switch (processResult.processor) {
				case 'addressRecognition':
					if (processResult.success && (processResult.data as { hasAddress: boolean }).hasAddress) {
						// 可以触发地址相关的业务逻辑
					}
					break
					
				case 'intentAnalysis':
					if (processResult.success) {
						// 根据意图执行不同的业务逻辑
					}
					break
					
				case 'keywordExtraction':
					if (processResult.success) {
						// 可以用于搜索推荐、内容过滤等
					}
					break
					
				default:
					// 其他处理器的结果
					break
			}
		}
	}, [])

	/**
	 * 获取下一轮问题建议
	 */
	const getNextSuggestions = useCallback(
		async (message_id: string) => {
			const result = await difyApi.getNextSuggestions({ message_id })
			setNextSuggestions(result.data)
		},
		[difyApi],
	)

	const updateConversationInputs = useCallback(
		(formValues: Record<string, unknown>) => {
			setConversations(prev => {
				return prev.map(item => {
					if (item.id === currentConversationId) {
						return {
							...item,
							inputs: formValues,
						}
					}
					return item
				})
			})
		},
		[currentConversationId, setConversations],
	)

	/**
	 * 获取对话的历史消息
	 */
	const getConversationMessages = useCallback(
		async (conversationId: string) => {
			// 如果是临时 ID，则不获取历史消息
			if (isTempId(conversationId)) {
				return
			}
			const result = await difyApi.getConversationHistory(conversationId)

			if (!result?.data?.length) {
				return
			}

			const newMessages: IMessageItem4Render[] = []

			// 只有当历史消息中的参数不为空时才更新
			if (result?.data?.length && Object.values(result.data?.[0]?.inputs)?.length) {
				updateConversationInputs(result.data[0]?.inputs || {})
			}

			result.data.forEach(item => {
				const createdAt = dayjs(item.created_at * 1000).format('YYYY-MM-DD HH:mm:ss')
				newMessages.push(
					{
						id: item.id,
						content: item.query,
						status: 'success',
						isHistory: true,
						files: item.message_files?.filter(item => {
							return item.belongs_to === MessageFileBelongsToEnum.user
						}),
						role: Roles.USER,
						created_at: createdAt,
					},
					{
						id: item.id,
						content: item.answer,
						status: item.status === 'error' ? item.status : 'success',
						error: item.error || '',
						isHistory: true,
						files: item.message_files?.filter(item => {
							return item.belongs_to === MessageFileBelongsToEnum.assistant
						}),
						feedback: item.feedback,
						workflows:
							workflowDataStorage.get({
								appId: currentAppId || '',
								conversationId,
								messageId: item.id,
								key: 'workflows',
							}) || [],
						agentThoughts: item.agent_thoughts || [],
						retrieverResources: item.retriever_resources || [],
						role: Roles.AI,
						created_at: createdAt,
					},
				)
			})

			setMessages([]) // 历史消息回来之后，应该清空临时消息
			setHistoryMessages(newMessages)
			if (newMessages?.length) {
				// 如果下一步问题建议已开启，则请求接口获取
				if (currentApp?.parameters?.suggested_questions_after_answer.enabled) {
					getNextSuggestions(newMessages[newMessages.length - 1].id)
				}
			}
		},
		[
			difyApi,
			currentApp?.parameters?.suggested_questions_after_answer.enabled,
			currentAppId,
			getNextSuggestions,
			updateConversationInputs,
		],
	)

	const { agent, onRequest, messages, setMessages, currentTaskId } = useX({
		latestProps,
		latestState,
		filesRef,
		getNextSuggestions,
		abortRef,
		getConversationMessages,
		onConversationIdChange: id => {
			setMessagesloadingEnabled(false)
			setCurrentConversationId(id)
			conversationItemsChangeCallback()
		},
		entryForm,
		difyApi,
	})

	const initConversationInfo = async () => {
		// 有对话 ID 且非临时 ID 时，获取历史消息
		if (currentConversationId && !isTempId(currentConversationId)) {
			await getConversationMessages(currentConversationId)
			setInitLoading(false)
		} else {
			// 不管有没有参数，都结束 loading，开始展示内容
			setInitLoading(false)
		}
	}

	useEffect(() => {
		if (!messagesloadingEnabled) {
			setMessagesloadingEnabled(true)
		} else {
			// 只有允许 loading 时，才清空对话列表数据
			setInitLoading(true)
			setMessages([])
			setNextSuggestions([])
			setHistoryMessages([])
		}
		initConversationInfo()
	}, [currentConversationId])

	const onPromptsItemClick: GetProp<typeof Prompts, 'onItemClick'> = info => {
		onRequest({
			content: info.data.description as string,
		})
	}

	const isFormFilled = useMemo(() => {
		if (!currentApp?.parameters?.user_input_form?.length) {
			return true
		}
		return currentApp?.parameters.user_input_form.every(item => {
			const fieldInfo = Object.values(item)[0]
			return !!currentConversationInfo?.inputs?.[fieldInfo.variable]
		})
	}, [currentApp?.parameters, currentConversationInfo])

	const onSubmit = useCallback(
		(nextContent: string, options?: { files?: IFile[]; inputs?: Record<string, unknown> }) => {
			filesRef.current = options?.files || []
			const formattedContent = formatNextContent(nextContent)
			
			// 1. 发送主消息（正常流程，会上屏显示）
			onRequest({
				content: formattedContent,
				files: options?.files as IMessageFileItem[],
			})

			// 如果配置了辅助实例，则发送辅助消息进行分析（不上屏）
			if (auxiliaryConfig && sendAuxiliaryMessage) {
				// 生成辅助查询内容
				const auxiliaryQuery = generateAuxiliaryQuery(nextContent)
				
				// 异步发送辅助消息（不阻塞主流程）
				setTimeout(() => {
					sendAuxiliaryMessage({
						query: auxiliaryQuery,
						conversationId: undefined, // 辅助消息使用独立对话
						inputs: entryForm.getFieldsValue(),
						files: options?.files || []
					}).catch(error => {
						console.warn('辅助消息发送失败:', error)
					})
				}, 200) // 稍微延迟，确保主消息先发送
			}
		},
		[onRequest, auxiliaryConfig, sendAuxiliaryMessage, entryForm],
	)

	/**
	 * 生成辅助查询内容
	 */
	const generateAuxiliaryQuery = useCallback((originalContent: string) => {		
		return `请识别用户问题是否有包含地址:${originalContent}`
	}, [])

	// 暴露 onSubmit 给父组件
	useImperativeHandle(ref, () => ({
		onSubmit,
	}));

	// 格式化用户输入的内容
	const formatNextContent = (nextContent: string) => {
		return nextContent
	}

	const unStoredMessages4Render = useMemo(() => {
		return messages.map(item => {
			return {
				id: item.id,
				status: item.status,
				// @ts-expect-error TODO: 类型待优化
				error: item.message.error || '',
				workflows: item.message.workflows,
				agentThoughts: item.message.agentThoughts,
				retrieverResources: item.message.retrieverResources,
				files: item.message.files,
				content: item.message.content,
				role: item.status === Roles.LOCAL ? Roles.USER : Roles.AI,
			} as IMessageItem4Render
		})
	}, [messages])

	const messageItems = useMemo(() => {
		return [...historyMessages, ...unStoredMessages4Render]
	}, [historyMessages, unStoredMessages4Render])

	const fallbackCallback = useCallback(
		(conversationId: string) => {
			// 反馈成功后，重新获取历史消息
			getConversationMessages(conversationId)
		},
		[getConversationMessages],
	)

	// 如果应用配置 / 对话列表加载中，则展示 loading
	if (conversationListLoading || appLoading) {
		return (
			<div className="w-full h-full flex items-center justify-center">
				<Spin spinning />
			</div>
		)
	}

	if (!currentApp) {
		return (
			<div className="w-full h-full flex items-center justify-center">
				<Empty description="请先配置 Dify 应用">
					<Button
						type="primary"
						onClick={handleStartConfig}
					>
						开始配置
					</Button>
				</Empty>
			</div>
		)
	}

	return (
		<div className="flex h-screen flex-col overflow-hidden flex-1">

			<div className="flex-1 overflow-hidden relative">
				{initLoading ? (
					<div className="absolute w-full h-full left-0 top-0 z-50 flex items-center justify-center">
						<Spin spinning />
					</div>
				) : null}

				{currentConversationId ? (
					<Chatbox
						conversationId={currentConversationId!}
						nextSuggestions={nextSuggestions}
						messageItems={messageItems}
						isRequesting={agent.isRequesting()}
						onPromptsItemClick={(...params) => {
							setNextSuggestions([])
							return onPromptsItemClick(...params)
						}}
						onSubmit={onSubmit}
						onCancel={async () => {
							abortRef.current()
							if (currentTaskId) {
								await difyApi.stopTask(currentTaskId)
								getConversationMessages(currentConversationId!)
							}
						}}
						isFormFilled={isFormFilled}
						onStartConversation={formValues => {
							updateConversationInputs(formValues)

							if (!currentConversationId) {
								onAddConversation()
							}
						}}
						feedbackApi={difyApi.feedbackMessage}
						feedbackCallback={fallbackCallback}
						uploadFileApi={difyApi.uploadFile}
						difyApi={difyApi}
						entryForm={entryForm}
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center">
						<Spin spinning />
					</div>
				)}
			</div>
			

			
			{/* 🎯 辅助消息弹窗 */}
			<AuxiliaryMessageModal
				visible={auxiliaryModalVisible}
				message={currentAuxiliaryMessage}
				onClose={() => {
					setAuxiliaryModalVisible(false)
					setCurrentAuxiliaryMessage(null)
				}}
				title="🤖 辅助分析完整结果"
			/>
		</div>
	)
})

ChatboxWrapper.displayName = 'ChatboxWrapper'
