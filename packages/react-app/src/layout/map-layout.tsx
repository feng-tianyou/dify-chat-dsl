import { Button, Card, Input, message, Space } from 'antd'
import { memo, useState, useImperativeHandle, forwardRef, useCallback } from 'react'

import AMapComponent from '@/components/amap-component'
import { IMapConfig, IMapMarker } from '@/types'

export interface MapLayoutRef {
	onConfigPoi: (longitude: number, latitude: number) => void
}

interface MapLayoutProps {
	// 可以添加其他 props
}

/**
 * 地图布局组件
 */
function MapLayout(props: MapLayoutProps, ref: React.Ref<MapLayoutRef>) {
	const [mapConfig, setMapConfig] = useState<IMapConfig>({
		apiKey: 'b228b9ebcb41e5a9320bcfc45ad0b5c8', // 需要用户提供高德地图 API Key
		containerId: 'amap-container',
		center: [116.397428, 39.90923], // 默认北京
		zoom: 11,
		mapStyle: 'amap://styles/light',
	})

	const [markers, setMarkers] = useState<IMapMarker[]>([])
	const [mapInstance, setMapInstance] = useState<any>(null)
	const [circleInstance, setCircleInstance] = useState<any>(null)

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
	const handleMapLoaded = useCallback((map: any) => {
		console.log('地图加载完成:', map)
		setMapInstance(map)
	}, [])

	/**
	 * 处理标记点点击
	 */
	const handleMarkerClick = useCallback((marker: IMapMarker) => {
		console.log('点击标记点:', marker)
		message.info(`点击了: ${marker.title}`)
	}, [])

	/**
	 * 处理地图点击
	 */
	const handleMapClick = useCallback((position: [number, number]) => {
		console.log('地图点击位置:', position)
		// setNewMarker(prev => ({
		// 	...prev,
		// 	position
		// }))
	}, [])

	/**
	 * 配置POI点：居中地图、清除标记点、添加500米半径圆环
	 */
	const onConfigPoi = useCallback((longitude: number, latitude: number) => {
		if (!mapInstance) {
			console.warn('地图实例未初始化')
			return
		}

		try {
			// 1. 清除所有标记点
			setMarkers([])

			// 2. 清除之前的圆环
			if (circleInstance) {
				mapInstance.remove(circleInstance)
				setCircleInstance(null)
			}

			// 3. 地图居中到指定位置
			mapInstance.setCenter([longitude, latitude])
			
			// 4. 调整缩放级别以显示500米半径
			mapInstance.setZoom(16) // 大约500米视野的缩放级别

			// 5. 添加500米半径的圆环
			const circle = new (window as any).AMap.Circle({
				center: [longitude, latitude],
				radius: 500, // 500米半径
				strokeColor: '#1890ff',
				strokeWeight: 2,
				strokeOpacity: 0.8,
				fillColor: '#1890ff',
				fillOpacity: 0.1,
				strokeStyle: 'solid'
			})

			mapInstance.add(circle)
			setCircleInstance(circle)

			console.log(`地图已配置到位置: ${longitude}, ${latitude}`)
		} catch (error) {
			console.error('配置POI失败:', error)
			message.error('配置POI失败')
		}
	}, [mapInstance, circleInstance])

	// 暴露方法给父组件
	useImperativeHandle(ref, () => ({
		onConfigPoi
	}), [onConfigPoi])

	return (
		<div
			className="w-full h-full flex flex-col overflow-hidden bg-theme-bg"
			style={{
				width: '28.5vw',
				backgroundColor: '#fff',
				borderWidth: '1px',
				borderStyle: 'solid',
				borderColor: '#F4F5F6',
			}}
		>
			{/* 主要内容区域 */}
			<div
				className="flex-1 overflow-hidden flex bg-theme-main-bg"
				style={{ borderRadius: '14px', margin: '10px' }}
			>
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

// 使用 React.memo 包装组件，防止不必要的重新渲染
export default memo(forwardRef<MapLayoutRef, MapLayoutProps>(MapLayout))
