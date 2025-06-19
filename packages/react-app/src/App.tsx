import { DifyChatProvider } from '@dify-chat/core'
import { initResponsiveConfig } from '@dify-chat/helpers'
import { useThemeContext } from '@dify-chat/theme'
import FingerPrintJS from '@fingerprintjs/fingerprintjs'
import { useMount } from 'ahooks'
import { theme as antdTheme, ConfigProvider } from 'antd'
import { BrowserRouter, type IRoute } from 'pure-react-router'
import { useState } from 'react'

import './App.css'
import LayoutIndex from './layout'
import AppListPage from './pages/app-list'
import ChatPage from './pages/chat'
// import DifyAppService from './services/app/localstorage' // 多应用模式需要这个导入

// 初始化响应式配置
initResponsiveConfig()

const routes: IRoute[] = [
	{ path: '/chat', component: () => <ChatPage /> },
	{ path: '/app/:appId', component: () => <ChatPage /> },
	{ path: '/apps', component: () => <AppListPage /> },
]

/**
 * Dify Chat 的最小应用实例
 */
export default function App() {
	const [userId, setUserId] = useState<string>('')

	useMount(() => {
		// 模拟登录过程获取用户唯一标识
		const loadFP = async () => {
			const fp = await FingerPrintJS.load()
			const result = await fp.get()
			setUserId(result.visitorId)
		}
		loadFP()
	})

	const { isDark } = useThemeContext()

	return (
		<ConfigProvider
			theme={{
				algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
			}}
		>
			<BrowserRouter
				basename="/dify-chat"
				routes={routes}
			>
				<DifyChatProvider
					value={{
						mode: 'singleApp',
						user: userId,
						// 单应用模式下的配置
						appConfig: {
							requestConfig: {
								apiBase: 'http://dify-test-b.dslyy.com/v1', // 你的 Dify API Base
								apiKey: 'app-d2fkWguAOebHTjHsAxzEa9V9',        // 你的 Dify API Key
							},
							// 可选：指定应用类型（如果是聊天类型应用可以不设置）
							info: {
								// mode: AppModeEnums.CHATBOT, // 聊天助手
								// mode: AppModeEnums.CHATFLOW, // 聊天流
								// mode: AppModeEnums.AGENT,    // 智能体
								// mode: AppModeEnums.WORKFLOW, // 工作流
								// mode: AppModeEnums.TEXT_GENERATOR, // 文本生成
							},
							// 可选：回复表单配置
							answerForm: {
								enabled: false,
								feedbackText: '我提交了一个表单',
							},
							// 可选：输入参数配置
							inputParams: {
								enableUpdateAfterCvstStarts: true,
							},
							// 可选：开场白配置
							extConfig: {
								conversation: {
									openingStatement: {
										displayMode: 'always', // 'default' | 'always'
									},
								},
							},
						},
					}}
				>
					<LayoutIndex />
				</DifyChatProvider>
			</BrowserRouter>
		</ConfigProvider>
	)
}
