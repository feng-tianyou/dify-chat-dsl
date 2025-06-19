import AMapLoader from '@amap/amap-jsapi-loader'
import { useEffect, useRef, useState } from 'react'

import { IMapComponentProps } from '@/types'

/**
 * 高德地图组件
 */
export default function AMapComponent(props: IMapComponentProps) {
	const { config, markers = [], onMapLoaded, onMarkerClick, onMapClick, className, style } = props
	const mapRef = useRef<any>(null)
	const mapContainerRef = useRef<HTMLDivElement>(null)
	const markersRef = useRef<any[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	// 初始化地图
	useEffect(() => {
		if (!config.apiKey || !config.containerId) {
			setError('地图配置不完整，请提供 API Key 和容器 ID')
			setIsLoading(false)
			return
		}

		const initMap = async () => {
			try {
				setIsLoading(true)
				setError(null)
				window._AMapSecurityConfig = {
					securityJsCode:'20054b23edebcf0cce2f0df0e50489f7',
			  }
				// 加载高德地图 API
				const AMap = await AMapLoader.load({
					key: config.apiKey,
					version: '2.0',
					plugins: ['AMap.Geolocation', 'AMap.Scale', 'AMap.ToolBar', 'AMap.Geocoder']
				})

				// 创建地图实例
				const map = new AMap.Map(config.containerId, {
					zoom: config.zoom || 11,
					center: config.center || [116.397428, 39.90923], // 默认北京
					mapStyle: config.mapStyle || 'amap://styles/normal'
				})

				// 添加地图控件
				map.addControl(new AMap.Scale())
				map.addControl(new AMap.ToolBar())

				// 保存地图实例
				mapRef.current = map

				// 地图点击事件
				if (onMapClick) {
					map.on('click', (e: any) => {
						const position: [number, number] = [e.lnglat.getLng(), e.lnglat.getLat()]
						onMapClick(position)
					})
				}

				// 地图加载完成回调
				if (onMapLoaded) {
					onMapLoaded(map)
				}

				setIsLoading(false)
			} catch (err) {
				console.error('地图初始化失败:', err)
				setError(`地图初始化失败: ${err instanceof Error ? err.message : '未知错误'}`)
				setIsLoading(false)
			}
		}

		initMap()

		// 清理函数
		return () => {
			if (mapRef.current) {
				mapRef.current.destroy()
				mapRef.current = null
			}
		}
	}, [config.apiKey, config.containerId, config.zoom, config.center, config.mapStyle, onMapLoaded, onMapClick])

	// 更新标记点
	useEffect(() => {
		if (!mapRef.current || !markers.length) {
			return
		}

		// 清除现有标记点
		markersRef.current.forEach(marker => {
			mapRef.current.remove(marker)
		})
		markersRef.current = []

		// 添加新标记点
		markers.forEach(markerData => {
			const marker = new (window as any).AMap.Marker({
				position: markerData.position,
				title: markerData.title,
				icon: markerData.icon
			})

			// 标记点点击事件
			if (onMarkerClick) {
				marker.on('click', () => {
					onMarkerClick(markerData)
				})
			}

			// 添加信息窗体
			if (markerData.content) {
				const infoWindow = new (window as any).AMap.InfoWindow({
					content: markerData.content,
					offset: new (window as any).AMap.Pixel(0, -30)
				})

				marker.on('click', () => {
					infoWindow.open(mapRef.current, marker.getPosition())
				})
			}

			mapRef.current.add(marker)
			markersRef.current.push(marker)
		})
	}, [markers, onMarkerClick])

	// 自动调整地图视野以包含所有标记点
	useEffect(() => {
		if (mapRef.current && markers.length > 0) {
			const bounds = new (window as any).AMap.Bounds()
			markers.forEach(marker => {
				bounds.extend(marker.position)
			})
			mapRef.current.setBounds(bounds)
		}
	}, [markers])

	return (
		<div className={`relative ${className || ''}`} style={style}>
			{/* 地图容器 */}
			<div
				ref={mapContainerRef}
				id={config.containerId}
				className="w-full h-full"
				style={{ minHeight: '400px' }}
			/>

			{/* 加载状态 */}
			{isLoading && (
				<div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
						<div className="text-gray-600">地图加载中...</div>
					</div>
				</div>
			)}

			{/* 错误状态 */}
			{error && (
				<div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
					<div className="text-center text-red-500">
						<div className="mb-2">⚠️</div>
						<div>{error}</div>
					</div>
				</div>
			)}
		</div>
	)
} 