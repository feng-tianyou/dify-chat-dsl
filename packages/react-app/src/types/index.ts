import { IAgentThought, IRetrieverResource } from '@dify-chat/api'
import { IWorkflowNode } from '@dify-chat/api'

/**
 * 消息对象中的文件 item
 */
export interface IMessageFileItem {
	id: string
	filename: string
	type: string
	url: string
	mime_type: string
	size: number
	transfer_method: string
	belongs_to: string
}

export interface IAgentMessage {
	/**
	 * 工作流信息
	 */
	workflows?: {
		/**
		 * 整个工作流的运行状态 running-运行中，finished-已完成
		 */
		status?: 'running' | 'finished'
		/**
		 * 工作流的节点详细信息
		 */
		nodes?: IWorkflowNode[]
	}
	/**
	 * 文件列表
	 */
	files?: IMessageFileItem[]
	/**
	 * 消息主体内容
	 */
	content: string
	/**
	 * 输入变量
	 */
	inputs?: Record<string, unknown>
	/**
	 * Agent 思维链信息
	 */
	agentThoughts?: IAgentThought[]
	/**
	 * 知识库引用列表
	 */
	retrieverResources?: IRetrieverResource[]
}

/**
 * 高德地图相关类型定义
 */
export interface IMapConfig {
	/**
	 * 高德地图 API Key
	 */
	apiKey: string
	/**
	 * 地图容器 ID
	 */
	containerId: string
	/**
	 * 地图中心点坐标
	 */
	center?: [number, number]
	/**
	 * 地图缩放级别
	 */
	zoom?: number
	/**
	 * 地图样式
	 */
	mapStyle?: string
}

export interface IMapMarker {
	/**
	 * 标记点 ID
	 */
	id: string
	/**
	 * 标记点坐标
	 */
	position: [number, number]
	/**
	 * 标记点标题
	 */
	title?: string
	/**
	 * 标记点内容
	 */
	content?: string
	/**
	 * 标记点图标
	 */
	icon?: string
}

export interface IMapComponentProps {
	/**
	 * 地图配置
	 */
	config: IMapConfig
	/**
	 * 标记点列表
	 */
	markers?: IMapMarker[]
	/**
	 * 地图加载完成回调
	 */
	onMapLoaded?: (map: any) => void
	/**
	 * 标记点点击回调
	 */
	onMarkerClick?: (marker: IMapMarker) => void
	/**
	 * 地图点击回调
	 */
	onMapClick?: (position: [number, number]) => void
	/**
	 * 地图样式类名
	 */
	className?: string
	/**
	 * 地图容器样式
	 */
	style?: React.CSSProperties
}
