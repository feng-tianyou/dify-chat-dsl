import {
	EditOutlined,
	MinusCircleOutlined,
	PlusCircleOutlined,
	PlusOutlined,
} from '@ant-design/icons'
import { DifyApi, IConversationItem } from '@dify-chat/api'
import { AppIcon, AppInfo, ConversationList, LucideIcon } from '@dify-chat/components'
import { ConversationsContextProvider, IDifyAppItem, useAppContext } from '@dify-chat/core'
import { isTempId, useIsMobile } from '@dify-chat/helpers'
import { ThemeModeEnum, ThemeModeLabelEnum, useThemeContext } from '@dify-chat/theme'
import {
	Button,
	Dropdown,
	Empty,
	Form,
	GetProp,
	Input,
	message,
	Modal,
	Popover,
	Radio,
	Spin,
	Tooltip,
} from 'antd'
import dayjs from 'dayjs'
import { useSearchParams } from 'pure-react-router'
import React, { useEffect, useMemo, useState, useRef, } from 'react'


import {ChatboxWrapper} from '@/components/chatbox-wrapper'
import { DEFAULT_CONVERSATION_NAME } from '@/constants'
import { useLatest } from '@/hooks/use-latest'

import MapLayout from '@/layout/map-layout'
import { IPoi, } from '@/types'

interface IChatLayoutProps {
	/**
	 * 扩展的 JSX 元素, 如抽屉/弹窗等
	 */
	extComponents?: React.ReactNode
	/**
	 * 自定义中心标题
	 */
	renderCenterTitle?: (appInfo?: IDifyAppItem['info']) => React.ReactNode
	/**
	 * 自定义右侧头部内容
	 */
	renderRightHeader?: () => React.ReactNode
	/**
	 * 是否正在加载应用配置
	 */
	initLoading: boolean
	/**
	 * Dify API 实例
	 */
	difyApi: DifyApi
}

export default function ChatLayout(props: IChatLayoutProps) {
	const { extComponents, renderCenterTitle, initLoading, difyApi } = props
	const [sidebarOpen, setSidebarOpen] = useState(true)
	const { themeMode, setThemeMode } = useThemeContext()
	const { appLoading, currentApp } = useAppContext()
	const [renameForm] = Form.useForm()
	const [conversations, setConversations] = useState<IConversationItem[]>([])
	const [currentConversationId, setCurrentConversationId] = useState<string>('')
	const currentConversationInfo = useMemo(() => {
		return conversations.find(item => item.id === currentConversationId)
	}, [conversations, currentConversationId])
	const isMobile = useIsMobile()

	// 创建 Dify API 实例
	const searchParams = useSearchParams()
	const [conversationListLoading, setCoversationListLoading] = useState<boolean>(false)
	const latestCurrentConversationId = useLatest(currentConversationId)

	const chatboxRef = useRef();

	// 用户的待确认选址地址,会传递给地图，地图显示该地址并显示确认弹窗
	// 如使用 setNeedConfirmAddress('广州沙园')
	const [needConfirmAddress, setNeedConfirmAddress] = useState<string>('')

	// 热力图数据
	type HeatmapPoint = { lng: number; lat: number; count: number }
	const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([])

	// 🔧 辅助实例配置
	const auxiliaryConfig = useMemo(() => ({
		apiBase: difyApi.options.apiBase,
		apiKey: difyApi.options.apiKey,
		user: `${difyApi.options.user}-auxiliary`
	}), [difyApi.options.apiBase, difyApi.options.apiKey, difyApi.options.user])

	useEffect(() => {
		if (!currentApp?.config) {
			return
		}
		setConversations([])
		setCurrentConversationId('')
		getConversationItems().then(() => {
			const isNewConversation = searchParams.get('isNewCvst') === '1'
			if (isNewConversation) {
				onAddConversation()
			}
		})
	}, [currentApp?.config])

	/**
	 * 获取对话列表
	 */
	const getConversationItems = async (showLoading = true) => {
		if (showLoading) {
			setCoversationListLoading(true)
		}
		try {
			const result = await difyApi?.getConversationList()
			const newItems =
				result?.data?.map(item => {
					return {
						key: item.id,
						label: item.name,
					}
				}) || []
			setConversations(result?.data)
			// 避免闭包问题
			if (!latestCurrentConversationId.current) {
				if (newItems.length) {
					setCurrentConversationId(newItems[0]?.key)
				} else {
					onAddConversation()
				}
			}
		} catch (error) {
			console.error(error)
			message.error(`获取会话列表失败: ${error}`)
		} finally {
			setCoversationListLoading(false)
		}
	}

	/**
	 * 添加临时新对话(要到第一次服务器响应有效的对话 ID 时才真正地创建完成)
	 */
	const onAddConversation = () => {
		// 创建新对话
		const newKey = `temp_${Math.random()}`
		// 使用函数式更新保证状态一致性（修复潜在竞态条件）
		setConversations(prev => {
			return [
				{
					id: newKey,
					name: DEFAULT_CONVERSATION_NAME,
					created_at: dayjs().valueOf(),
					inputs: {},
					introduction: '',
					status: 'normal',
					updated_at: dayjs().valueOf(),
				},
				...(prev || []),
			]
		})
		setCurrentConversationId(newKey)
	}

	/**
	 * 重命名对话
	 */
	const onRenameConversation = async (conversationId: string, name: string) => {
		await difyApi?.renameConversation({
			conversation_id: conversationId,
			name,
		})
		getConversationItems()
	}

	/**
	 * 重命名会话
	 * @param conversation 会话对象
	 */
	const handleRenameConversation = () => {
		renameForm.setFieldsValue({
			name: currentConversationInfo?.name,
		})
		Modal.confirm({
			centered: true,
			destroyOnClose: true,
			title: '编辑对话名称',
			content: (
				<Form
					form={renameForm}
					className="mt-3"
				>
					<Form.Item name="name">
						<Input placeholder="请输入" />
					</Form.Item>
				</Form>
			),
			onOk: async () => {
				await renameForm.validateFields()
				const values = await renameForm.validateFields()
				await onRenameConversation(currentConversationId, values.name)
				message.success('对话重命名成功')
			},
		})
	}

	/**
	 * 删除对话
	 */
	const onDeleteConversation = async (conversationId: string) => {
		if (isTempId(conversationId)) {
			setConversations(prev => {
				const newConversations = prev.filter(item => item.id !== conversationId)
				// 删除当前对话
				if (conversationId === currentConversationId) {
					// 如果列表不为空，则选择第一个作为当前对话
					if (newConversations.length) {
						setCurrentConversationId(newConversations[0].id)
					} else {
						// 如果列表为空，则创建一个新的临时对话
						onAddConversation()
					}
				}
				return newConversations
			})
		} else {
			await difyApi?.deleteConversation(conversationId)
			if (conversationId === currentConversationId) {
				setCurrentConversationId('')
			}
			getConversationItems()
			return Promise.resolve()
		}
	}

	const fetchHeatMapData = async () => {
		const heatMapRes = await difyApi.getHeatMapData()
		let heatMaps: string[] = []
		if (heatMapRes.code == '000000') {
			// hotQuestions = hotRequestion.data.map((item) => {
			// 	return item.title
			// })
		}

		setHeatmapData([
			{
				"lng": 116.191031,
				"lat": 39.988585,
				"count": 10
			}, {
				"lng": 116.389275,
				"lat": 39.925818,
				"count": 11
			}, {
				"lng": 116.287444,
				"lat": 39.810742,
				"count": 12
			}, {
				"lng": 116.481707,
				"lat": 39.940089,
				"count": 13
			}, {
				"lng": 116.410588,
				"lat": 39.880172,
				"count": 14
			}, {
				"lng": 116.394816,
				"lat": 39.91181,
				"count": 15
			}, {
				"lng": 116.416002,
				"lat": 39.952917,
				"count": 16
			}, {
				"lng": 116.39671,
				"lat": 39.924903,
				"count": 17
			}, {
				"lng": 116.180816,
				"lat": 39.957553,
				"count": 18
			}, {
				"lng": 116.382035,
				"lat": 39.874114,
				"count": 19
			}, {
				"lng": 116.316648,
				"lat": 39.914529,
				"count": 20
			}, {
				"lng": 116.395803,
				"lat": 39.908556,
				"count": 21
			}, {
				"lng": 116.74553,
				"lat": 39.875916,
				"count": 22
			}, {
				"lng": 116.352289,
				"lat": 39.916475,
				"count": 23
			}, {
				"lng": 116.441548,
				"lat": 39.878262,
				"count": 24
			}, {
				"lng": 116.318947,
				"lat": 39.942735,
				"count": 25
			}, {
				"lng": 116.382585,
				"lat": 39.941949,
				"count": 26
			}, {
				"lng": 116.42042,
				"lat": 39.884017,
				"count": 27
			}, {
				"lng": 116.31744,
				"lat": 39.892561,
				"count": 28
			}, {
				"lng": 116.407059,
				"lat": 39.912438,
				"count": 29
			}, {
				"lng": 116.412351,
				"lat": 39.888082,
				"count": 30
			}, {
				"lng": 116.444341,
				"lat": 39.915891,
				"count": 31
			}, {
				"lng": 116.335385,
				"lat": 39.741756,
				"count": 32
			}, {
				"lng": 116.3926,
				"lat": 40.008733,
				"count": 33
			}, {
				"lng": 116.389731,
				"lat": 39.92292,
				"count": 34
			}, {
				"lng": 116.413371,
				"lat": 39.874483,
				"count": 35
			}, {
				"lng": 116.199752,
				"lat": 39.911717,
				"count": 36
			}, {
				"lng": 116.278472,
				"lat": 40.254994,
				"count": 37
			}, {
				"lng": 116.464252,
				"lat": 39.925828,
				"count": 38
			}, {
				"lng": 116.479475,
				"lat": 39.937945,
				"count": 39
			}, {
				"lng": 116.415599,
				"lat": 39.956902,
				"count": 40
			}, {
				"lng": 116.355675,
				"lat": 39.870089,
				"count": 41
			}, {
				"lng": 116.295267,
				"lat": 39.987171,
				"count": 42
			}, {
				"lng": 116.323634,
				"lat": 39.911692,
				"count": 43
			}, {
				"lng": 116.692769,
				"lat": 40.173307,
				"count": 44
			}, {
				"lng": 116.287888,
				"lat": 39.928531,
				"count": 45
			}, {
				"lng": 116.386502,
				"lat": 39.922747,
				"count": 46
			}, {
				"lng": 116.236773,
				"lat": 40.218341,
				"count": 47
			}, {
				"lng": 116.490636,
				"lat": 39.804253,
				"count": 48
			}, {
				"lng": 116.391095,
				"lat": 39.925791,
				"count": 49
			}, {
				"lng": 116.472402,
				"lat": 39.769178,
				"count": 50
			}, {
				"lng": 116.38657,
				"lat": 39.956731,
				"count": 51
			}, {
				"lng": 116.427536,
				"lat": 39.943671,
				"count": 52
			}, {
				"lng": 116.374547,
				"lat": 39.967588,
				"count": 53
			}, {
				"lng": 116.380383,
				"lat": 39.871634,
				"count": 54
			}, {
				"lng": 116.376092,
				"lat": 39.965485,
				"count": 55
			}, {
				"lng": 116.352424,
				"lat": 39.91811,
				"count": 56
			}, {
				"lng": 116.020157,
				"lat": 40.348526,
				"count": 57
			}, {
				"lng": 116.416201,
				"lat": 39.951736,
				"count": 58
			}, {
				"lng": 116.405392,
				"lat": 39.908738,
				"count": 59
			}, {
				"lng": 116.49238,
				"lat": 39.926248,
				"count": 60
			}, {
				"lng": 116.389282,
				"lat": 39.988391,
				"count": 61
			}, {
				"lng": 116.396683,
				"lat": 39.923487,
				"count": 62
			}, {
				"lng": 116.41718,
				"lat": 39.905213,
				"count": 63
			}, {
				"lng": 116.321512,
				"lat": 39.913192,
				"count": 64
			}, {
				"lng": 116.260028,
				"lat": 40.03353,
				"count": 65
			}, {
				"lng": 116.394846,
				"lat": 39.911168,
				"count": 66
			}, {
				"lng": 116.374767,
				"lat": 39.96608,
				"count": 67
			}, {
				"lng": 116.6841,
				"lat": 39.909762,
				"count": 68
			}, {
				"lng": 116.3838,
				"lat": 39.95811,
				"count": 69
			}, {
				"lng": 116.39243,
				"lat": 40.01143,
				"count": 70
			}, {
				"lng": 116.661912,
				"lat": 40.121137,
				"count": 71
			}, {
				"lng": 116.333056,
				"lat": 39.90123,
				"count": 72
			}, {
				"lng": 116.484839,
				"lat": 39.881729,
				"count": 73
			}
		])
	}

	const mobileMenuItems: GetProp<typeof Dropdown, 'menu'>['items'] = useMemo(() => {
		const actionMenus: GetProp<typeof Dropdown, 'menu'>['items'] = [
			{
				key: 'add_conversation',
				icon: <PlusCircleOutlined />,
				label: '新增对话',
				disabled: isTempId(currentConversationId),
				onClick: () => {
					onAddConversation()
				},
			},
			{
				key: 'rename_conversation',
				icon: <EditOutlined />,
				label: '编辑对话名称',
				disabled: isTempId(currentConversationId),
				onClick: () => {
					handleRenameConversation()
				},
			},
			{
				key: 'delete_conversation',
				icon: <MinusCircleOutlined />,
				label: '删除当前对话',
				disabled: isTempId(currentConversationId),
				danger: true,
				onClick: () => {
					Modal.confirm({
						centered: true,
						title: '确定删除当前对话？',
						content: '删除后，聊天记录将不可恢复。',
						okText: '删除',
						cancelText: '取消',
						onOk: async () => {
							// 执行删除操作
							await onDeleteConversation(currentConversationId)
							message.success('删除成功')
						},
					})
				},
			},
			{
				type: 'divider',
			},
		]

		const conversationListMenus: GetProp<typeof Dropdown, 'menu'>['items'] = [
			{
				key: 'view-mode',
				type: 'group',
				children: [
					{
						key: 'light',
						label: (
							<Radio.Group
								key="view-mode"
								optionType="button"
								value={themeMode}
								onChange={e => {
									setThemeMode(e.target.value as ThemeModeEnum)
								}}
							>
								<Radio value={ThemeModeEnum.SYSTEM}>{ThemeModeLabelEnum.SYSTEM}</Radio>
								<Radio value={ThemeModeEnum.LIGHT}>{ThemeModeLabelEnum.LIGHT}</Radio>
								<Radio value={ThemeModeEnum.DARK}>{ThemeModeLabelEnum.DARK}</Radio>
							</Radio.Group>
						),
					},
				],
				label: '主题',
			},
			{
				type: 'divider',
			},
			{
				type: 'group',
				label: '对话列表',
				children: conversations?.length
					? conversations.map(item => {
							return {
								key: item.id,
								label: item.name,
								onClick: () => {
									setCurrentConversationId(item.id)
								},
							}
						})
					: [
							{
								key: 'no_conversation',
								label: '暂无对话',
								disabled: true,
							},
						],
			},
		]

		if (isTempId(currentConversationId)) {
			return [...conversationListMenus]
		}

		return [...actionMenus, ...conversationListMenus]
	}, [currentConversationId, conversations, themeMode, setThemeMode])

	// 对话列表（包括加载和缺省状态）
	const conversationListWithEmpty = useMemo(() => {
		return (
			<Spin spinning={conversationListLoading}>
				{conversations?.length ? (
					<ConversationList
						renameConversationPromise={onRenameConversation}
						deleteConversationPromise={onDeleteConversation}
						items={conversations.map(item => {
							return {
								key: item.id,
								label: item.name,
							}
						})}
						activeKey={currentConversationId}
						onActiveChange={id => {
							setCurrentConversationId(id)
						}}
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center">
						<Empty
							className="pt-6"
							description="暂无会话"
						/>
					</div>
				)}
			</Spin>
		)
	}, [conversations, onRenameConversation, onDeleteConversation, setCurrentConversationId])

	return (
		<ConversationsContextProvider
			value={{
				conversations,
				setConversations,
				currentConversationId,
				setCurrentConversationId,
				currentConversationInfo,
			}}
		>
			<div className={`w-full h-screen flex flex-col overflow-hidden bg-theme-bg`}>
				{/* 头部 */}
				{/* <HeaderLayout
					title={renderCenterTitle?.(currentApp?.config?.info)}
					rightIcon={
						isMobile ? (
							<Dropdown
								menu={{
									className: '!pb-3 w-[80vw]',
									activeKey: currentConversationId,
									items: mobileMenuItems,
								}}
							>
								<MenuOutlined className="text-xl" />
							</Dropdown>
						) : null
					}
				/> */}

				{/* Main */}
				<div className="flex-1 overflow-hidden flex rounded-t-3xl bg-theme-main-bg">
					{appLoading || initLoading ? (
						<div className="absolute w-full h-full left-0 top-0 z-50 flex items-center justify-center">
							<Spin spinning />
						</div>
					) : currentApp?.config ? (
						<>
							{/* 左侧对话列表 */}
							<div
								className={`hidden md:!flex ${sidebarOpen ? 'w-72' : 'w-14'} transition-all h-full flex-col border-0 border-r border-solid border-r-theme-splitter`}
							>
								{sidebarOpen ? (
									<>
										{currentApp.config.info ? <AppInfo /> : null}
										{/* 添加会话 */}
										{currentApp ? (
											<Button
												onClick={() => {
													onAddConversation()
												}}
												type="default"
												className="h-10 leading-10 rounded-lg border border-solid border-gray-200 mt-3 mx-4 text-theme-text "
												icon={<PlusOutlined className="" />}
											>
												新增对话
											</Button>
										) : null}
										{/* 🌟 对话管理 */}
										<div className="px-4 mt-3 flex-1">{conversationListWithEmpty}</div>
									</>
								) : (
									<div className="flex flex-col justify-start items-center flex-1 pt-6">
										{/* 应用图标 */}
										<div className="mb-1.5 flex items-center justify-center">
											<AppIcon size="small" />
										</div>

										{/* 新增对话 */}
										<Tooltip
											title="新增对话"
											placement="right"
										>
											<div className="text-theme-text my-1.5 hover:text-primary flex items-center">
												<LucideIcon
													name="plus-circle"
													strokeWidth={1.25}
													size={28}
													className="cursor-pointer"
													onClick={() => {
														onAddConversation()
													}}
												/>
											</div>
										</Tooltip>

										<Popover
											content={
												<div className="max-h-[50vh] overflow-auto pr-3">
													{conversationListWithEmpty}
												</div>
											}
											title="对话列表"
											placement="rightTop"
										>
											{/* 必须包裹一个 HTML 标签才能正常展示 Popover */}
											<div className="flex items-center justify-center">
												<LucideIcon
													className="my-1.5 cursor-pointer hover:text-primary"
													strokeWidth={1.25}
													size={28}
													name="menu"
												/>
											</div>
										</Popover>
									</div>
								)}

								<div className="border-0 border-t border-solid border-theme-border flex items-center justify-center h-12">
									<Tooltip
										title={sidebarOpen ? '折叠侧边栏' : '展开侧边栏'}
										placement="right"
									>
										<div className="flex items-center justify-center">
											<LucideIcon
												onClick={() => {
													setSidebarOpen(!sidebarOpen)
												}}
												name={sidebarOpen ? 'arrow-left-circle' : 'arrow-right-circle'}
												className="cursor-pointer hover:text-primary"
												strokeWidth={1.25}
												size={28}
											/>
										</div>
									</Tooltip>
								</div>
							</div>

							{/* 右侧内容区域 - 包含聊天和地图 */}
							<div className="flex-1 min-w-0 flex overflow-hidden">
								{/* 聊天窗口 */}
								<div className="flex-1 min-w-0 flex flex-col overflow-hidden">
																<ChatboxWrapper
								ref={chatboxRef}
								difyApi={difyApi}
								onSendConfirmAddress={(message) => {
									console.log('🚀 ---123123准备发送辅助分析:', message)
									setNeedConfirmAddress(message.content)
								}}
								conversationListLoading={conversationListLoading}
								onAddConversation={onAddConversation}
								conversationItemsChangeCallback={() => getConversationItems(false)}
								// 🔥 启用辅助实例配置 - 使用与主实例相同的API密钥
								auxiliaryConfig={auxiliaryConfig}
									/>
								</div>
								{/* 地图组件 */}
								<div className="flex-shrink-0" style={{ width: '28.5vw' }}>
									<MapLayout heatmapData={heatmapData} needConfirmAddress={needConfirmAddress} onSendConfirmAddress={(poi: IPoi) => {
										// 这里发送信息确定选址，让ai评估选址
										if (chatboxRef.current) {
											chatboxRef.current.onSubmit(
												`帮我进行门店选址，地址是：${poi.address}，经纬度是：${poi.lng},${poi.lat}。`
											);
											// 获取热力图数据
											fetchHeatMapData()
										}
									}}/>
								</div>
							</div>
						</>
					) : (
						<div className="w-full h-full flex items-center justify-center">
							<Empty
								description="暂无 Dify 应用配置，请联系管理员"
								className="text-base"
							/>
						</div>
					)}
				</div>
			</div>

			{extComponents}

		</ConversationsContextProvider>
	)
}
