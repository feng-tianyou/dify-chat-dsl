import { Button, message, } from 'antd'
import { forwardRef, memo, useCallback, useRef, useState, useEffect, } from 'react'

import AMapComponent from '@/components/amap-component'
import { IMapConfig, IPoi } from '@/types'

import './map-layout.css'

export interface MapLayoutRef {
	onConfigPoi: (longitude: number, latitude: number) => void
}

type HeatmapPoint = { lng: number; lat: number; count: number }

interface MapLayoutProps {
	// 待用户点击确定的选址地址
	needConfirmAddress?: string,
	// 回调函数，通知父亲组件发送确认选址的信息
	onSendConfirmAddress: (poi: IPoi) => void
	// 热力地图数据
	heatmapData?:HeatmapPoint[]
}

/**
 * 地图布局组件
 */
function MapLayout(props: MapLayoutProps, ref: React.Ref<MapLayoutRef>) {
	const [mapConfig, setMapConfig] = useState<IMapConfig>({
		apiKey: 'b228b9ebcb41e5a9320bcfc45ad0b5c8', // 需要用户提供高德地图 API Key
		containerId: 'amap-container',
		center: [113.203299, 23.073685], // 默认大参林副中心
		zoom: 11,
		mapStyle: 'amap://styles/light',
	})

	const mapInstanceRef = useRef<any>(null)

	const [showConfirm, setShowConfirm] = useState<boolean>(false)

	/**
	 * 当前地图选择的位置信息
	 * 地址、经纬度
	 */
	const [poiInstance, setPoiInstance] = useState<IPoi>({
		address: '',
		lng: 113.203299, 
		lat: 23.073685,
	})

	useEffect(() => {
		console.log('---外部待确认地址发生变化---')
		if(props.needConfirmAddress && props.needConfirmAddress != '') {
			addAddressToMap(props.needConfirmAddress)
		}
	}, [props]);

	/**
	 * 处理地图加载完成
	 */
	const handleMapLoaded = useCallback((map: any) => {
		console.log('地图加载完成:', map)
		mapInstanceRef.current = map
	}, [])

	/**
	 * 处理地图点击
	 */
	const handleMapClick = useCallback((position: [number, number]) => {
		console.log('地图点击位置:', position)
		getAddressByLngAndLat(position[0], position[1])
	}, [])

	/**
	 * 点击确认地址弹窗
	 */
	const onConfirm = () => {
		setShowConfirm(false)
		// todo, 调用外部发送信息函数，发送提问: 帮我进行门店选址，地址是：xxx，经纬度是：xxx。
		props.onSendConfirmAddress(poiInstance)
	}

	/**
	 * 提供给外部调用！！
	 * 根据地址获取经纬度，然后再根据经纬度获取地址添加标识到地图
	 * 为何要再根据经纬度获取地址添加到地图呢，因为这个函数的地址可能是一个范围
	 */
	const addAddressToMap = (address: string) => {
		const geocoder = new (window as any).AMap.Geocoder({
			radius: 500,
			extensions: 'base',
		})
		geocoder.getLocation(address, (status: string, result: any) => {
			console.log('根据给定的地址描述进行解析:', status, result)
			if (status === 'complete' && result.info === 'OK') {
				if(result.geocodes && result.geocodes.length > 0) {
					let realGeocode = result.geocodes[0]
					getAddressByLngAndLat(realGeocode.location.lng, realGeocode.location.lat)
				} else {
					message.error(`${address}无法获得经纬度,请输入更精准描述，感谢。`, 3);
				}
			}
		})
	}

	/**
	 * 逆地理编码获取地址并添加标识到地图
	 */
	const getAddressByLngAndLat = (lng: number, lat: number) => {
		const geocoder = new (window as any).AMap.Geocoder({
			radius: 500,
			extensions: 'base',
		})
		geocoder.getAddress([lng, lat], (status: string, result: any) => {
			console.log('逆地理编码结果:', status, result)
			if (status === 'complete' && result.info === 'OK') {
				let address = ''
				if(result.regeocode.addressComponent.street == '') {
					address = result.regeocode.formattedAddress
				} else {
					address = result.regeocode.addressComponent.city + result.regeocode.addressComponent.street + result.regeocode.addressComponent.streetNumber
				}
				// 添加poi标识到地图
				onConfigPoi(address, lng, lat)
				// 显示确认选址弹窗
				setShowConfirm(true)
			}
		})
	}

	/**
	 * 配置POI点：居中地图、清除标记点、添加500米半径圆环
	 */
	const onConfigPoi = useCallback(
		(address: string, longitude: number = 0, latitude: number = 0) => {
			if (!mapInstanceRef.current) {
				console.warn('地图实例未初始化')
				return
			}

			try {
				console.log('---调用添加poi点---')
				setPoiInstance({
					address: address,
					lng: longitude,
					lat: latitude,
				})
				// 清除之前的圆环、marker
				mapInstanceRef.current.clearMap()
				// 地图居中到指定位置
				mapInstanceRef.current.setCenter([longitude, latitude])
				// 调整缩放级别以显示500米半径
				mapInstanceRef.current.setZoom(14)
				// 添加500米半径的圆环
				const circle = new (window as any).AMap.Circle({
					center: [longitude, latitude],
					radius: 500, // 500米半径
					strokeColor: '#1890ff',
					strokeWeight: 2,
					strokeOpacity: 0.8,
					fillColor: '#1890ff',
					fillOpacity: 0.1,
					strokeStyle: 'dashed',
				})

				mapInstanceRef.current.add(circle)

				// 添加一个marker
				const contentElement = document.createElement('div')
				contentElement.className = 'poi-content'
				contentElement.innerHTML = `
				  <div class="marker-poi-text">${address}</div>
					<svg xmlns="http://www.w3.org/2000/svg" width="6" height="20" viewBox="0 0 6 20" fill="none">
						<path fill-rule="evenodd" clip-rule="evenodd" d="M3 20C2.43231 20 1.95698 19.5698 1.9005 19.005L0 0H6L4.0995 19.005C4.04302 19.5698 3.56769 20 3 20Z" fill="url(#paint0_linear_33_10)"/>
						<defs>
						<linearGradient id="paint0_linear_33_10" x1="3" y1="-1.05263" x2="3" y2="9.47368" gradientUnits="userSpaceOnUse">
						<stop stop-color="#1D2129"/>
						<stop offset="1" stop-color="#4E5969"/>
						</linearGradient>
						</defs>
					</svg>
			`
				const marker = new (window as any).AMap.Marker({
					position: [longitude, latitude],
					content: contentElement,
					offset: new (window as any).AMap.Pixel(0, 0), //设置点标记偏移量
  				anchor: "bottom-center", //设置锚点方位
				})
				mapInstanceRef.current.add(marker)

				console.log(`地图已配置到位置: ${longitude}, ${latitude}`)
			} catch (error) {
				console.error('配置POI失败:', error)
			}
		},
		[mapInstanceRef.current],
	)

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
				style={{ position: 'relative', borderRadius: '14px', margin: '10px' }}
			>
				{/* 地图 */}
				<AMapComponent
					heatmapData={props.heatmapData}
					config={mapConfig}
					onMapLoaded={handleMapLoaded}
					onMapClick={handleMapClick}
					className="w-full h-full"
				/>
				{/* 确认弹窗 */}
				{showConfirm && <div className="popup-confign-content">
					<span>上面的地址是否是你属意的门店选址地址？</span>
					<span style={{marginTop: '5px', }}>拖动地图点击任何一处可以切换新地址。</span>
					<Button type="primary" style={{marginTop: '10px', }} autoInsertSpace={false} onClick={onConfirm}>确定</Button>
				</div>}
			</div>
		</div>
	)
}

// 使用 React.memo 包装组件，防止不必要的重新渲染
export default memo(forwardRef<MapLayoutRef, MapLayoutProps>(MapLayout))
