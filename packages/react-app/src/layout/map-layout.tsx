import { Button, Card, Input, message, Space } from 'antd'
import { useState } from 'react'

import AMapComponent from '@/components/amap-component'
import { IMapConfig, IMapMarker } from '@/types'

/**
 * 地图布局组件
 */
export default function MapLayout() {
	const [mapConfig, setMapConfig] = useState<IMapConfig>({
		apiKey: 'b228b9ebcb41e5a9320bcfc45ad0b5c8', // 需要用户提供高德地图 API Key
		containerId: 'amap-container',
		center: [116.397428, 39.90923], // 默认北京
		zoom: 11,
		mapStyle: 'amap://styles/light',
	})

	const [markers, setMarkers] = useState<IMapMarker[]>([
		// {
		// 	id: '1',
		// 	position: [116.397428, 39.90923],
		// 	title: '天安门',
		// 	content: '<div><h4>天安门</h4><p>北京市中心的地标建筑</p></div>'
		// },
		// {
		// 	id: '2',
		// 	position: [116.403963, 39.915119],
		// 	title: '故宫',
		// 	content: '<div><h4>故宫博物院</h4><p>明清两代的皇家宫殿</p></div>'
		// }
	])

	const [newMarker, setNewMarker] = useState<{
		title: string
		content: string
		position: [number, number]
	}>({
		title: '',
		content: '',
		position: [116.397428, 39.90923],
	})

	/**
	 * 处理地图加载完成
	 */
	const handleMapLoaded = (map: any) => {
		console.log('地图加载完成:', map)
	}

	/**
	 * 处理标记点点击
	 */
	const handleMarkerClick = (marker: IMapMarker) => {
		console.log('点击标记点:', marker)
		message.info(`点击了: ${marker.title}`)
	}

	/**
	 * 处理地图点击
	 */
	const handleMapClick = (position: [number, number]) => {
		console.log('地图点击位置:', position)
		// setNewMarker(prev => ({
		// 	...prev,
		// 	position
		// }))
	}

	return (
		<div className="w-full h-screen flex flex-col overflow-hidden bg-theme-bg" style={{ width: '28.5vw', }} >
			{/* 主要内容区域 */}
			<div className="flex-1 overflow-hidden flex bg-theme-main-bg" style={{ borderRadius: '14px', }}>
				<AMapComponent
					config={mapConfig}
					markers={markers}
					onMapLoaded={handleMapLoaded}
					onMarkerClick={handleMarkerClick}
					onMapClick={handleMapClick}
					className="w-full h-full"
				/>
			</div>
		</div>
	)
}
