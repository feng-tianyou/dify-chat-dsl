import { Button, message, } from 'antd'
import { forwardRef, memo, useCallback, useRef, useState, useEffect, } from 'react'

import AMapComponent from '@/components/amap-component'
import { IMapConfig, IPoi } from '@/types'
import { createDifyApiInstance, DifyApi } from '@dify-chat/api'

import './map-layout.css'

export interface MapLayoutRef {
	onConfigPoi: (longitude: number, latitude: number) => void
}

interface MapLayoutProps {
	// 待用户点击确定的选址地址
	needConfirmAddress?: string,
	// 回调函数，通知父亲组件发送确认选址的信息
	onSendConfirmAddress: (poi: IPoi) => void
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
	

	const [difyApi] = useState(
		createDifyApiInstance({
			user: '123',
			apiBase: '',
			apiKey: '',
		}),
	)

	// 热力图数据
	type HeatmapPoint = { lng: number; lat: number; count: number }
	const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([])

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
				// TODO: 调用接口查询周边门店数据
				addStoreMarker(lng, lat)
				// 热力图数据
				fetchHeatMapData(lat,lng,1000)
			}
		})
	}

	const fetchHeatMapData = async (latitude:number, longitude:number, circle:number) => {
		console.log('==================',latitude)
		const heatMapRes = await difyApi.getHeatMapData(latitude, longitude, circle)
		let heatMaps: any[] = []
		if (heatMapRes.code == '000000') {
			heatMaps = heatMapRes.data.map((item) => {
				return {
					...item,
					lat:item.latitude,
					lng:item.longitude,

				}
			})
		}
		setHeatmapData(heatMaps)
	}

	const addStoreMarker = async (lng: number, lat: number) => {
		console.log('添加门店标识到地图:', lng, lat)
		// 批量添加marker，mock数据为传入的经纬度，经纬度为113.203299, 23.073685 各加0.001
		const res = await difyApi.getStoreMarker({
			longitude: lng,
			latitude: lat,
			radius: 1000,
		})
		console.log('获取门店数据:', res)
		if (res.code != '000000') {
			return
		}
		const markers = res.data.map((item) => {
			return {
				position: [item.longitude, item.latitude],
				content: item.storeName,
				rent: item.rent,
				flatEffect: item.flatEffect,
			}
		})
		console.log('markers最新数据', markers)

		markers.forEach((item) => {
			// 添加一个marker
			const contentElement = document.createElement('div')
			contentElement.className = 'poi-content'
			contentElement.innerHTML = `
				<svg fill="none" height="30" viewBox="0 0 26 30" width="26" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><filter id="a" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse" height="26.2941" width="28.5" x="-1.25" y="-.146973"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/><feOffset/><feGaussianBlur stdDeviation="3"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0.027451 0 0 0 0 0.764706 0 0 0 0 0.505882 0 0 0 0.25 0"/><feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow_12_3049"/><feBlend in="SourceGraphic" in2="effect1_dropShadow_12_3049" mode="normal" result="shape"/></filter><linearGradient id="b" gradientUnits="userSpaceOnUse" x1="0" x2="22.5" y1="1" y2="27"><stop offset="0" stop-color="#26edc9"/><stop offset="1" stop-color="#05c487"/></linearGradient><clipPath id="c"><path d="m1 1h24v24h-24z"/></clipPath><path clip-rule="evenodd" d="m0 9.6c0-3.36031 0-5.04047.653961-6.32394.575239-1.12898 1.493119-2.04686 2.622099-2.622099 1.28347-.653961 2.96363-.653961 6.32394-.653961h6.8c3.3603 0 5.0405 0 6.3239.653961 1.129.575239 2.0469 1.493119 2.6221 2.622099.654 1.28347.654 2.96363.654 6.32394v8.4919c0 1.7742 0 2.6613-.1862 3.3912-.5426 2.1271-2.2036 3.7881-4.3307 4.3307-.7299.1862-1.617.1862-3.3912.1862-.259 0-.3885 0-.5126.0156-.3564.0447-.6942.1846-.9779.405-.0988.0768-.1903.1683-.3735.3515l-2.0965 2.0965c-.396.396-.5941.5941-.8224.6682-.2008.0653-.4172.0653-.618 0-.2283-.0741-.4264-.2722-.8224-.6682l-2.09652-2.0965c-.18315-.1832-.27472-.2747-.37346-.3515-.28368-.2204-.62149-.3603-.97792-.405-.12408-.0156-.25358-.0156-.51258-.0156-1.77424 0-2.66136 0-3.39122-.1862-2.12712-.5426-3.788087-2.2036-4.330713-4.3307-.186187-.7299-.186187-1.617-.186187-3.3912z" fill="url(#b)" fill-rule="evenodd"/><g clip-path="url(#c)"><g filter="url(#a)"><path d="m18.4987 15.0542c-.1938-.2248-.1008-.4108.1938-.4108.5426 0 .938-.2713 1.1317-.6512.1318-.2868.2481-.8914-.4496-1.7208l-4.7052-5.6122c-.4341-.51936-1.0232-.80617-1.6588-.80617-.6357 0-1.2248.28681-1.6666.80617l-4.70529 5.6122c-.69765.8372-.58137 1.434-.4496 1.7208.18604.3954.58913.6589 1.11624.6589h.00775c.29456 0 .38758.1861.19379.4109l-.13178.1628-2.13169 2.5425c-.64339.7674-.51936 1.3488-.38759 1.6278.13178.2791.50386.7519 1.49607.7519h1.86814c.03297 0 .06529-.0029.09671-.0086 1.39011-.0246 2.69325-.5799 3.67055-1.5572.948-.9479 1.4981-2.1909 1.56-3.5223.0089-.0388.0136-.0793.0136-.121v-.2945h2.124c.3023 0 .5503-.248.5503-.5503 0-.3024-.248-.5504-.5503-.5504h-2.124v-1.6434c0-.3023-.2481-.5504-.5504-.5504s-.5503.2481-.5503.5504v1.6434h-2.1395c-.3023 0-.55032.248-.55032.5504 0 .3023.24802.5503.55032.5503h2.1395v.0708c-.0051.03-.0078.0607-.0078.092 0 1.1317-.4418 2.1937-1.2403 2.9921-.7984.7984-1.86035 1.2403-2.99209 1.2403-.03125 0-.06193.0026-.0918.0077h-1.82282c-.38758 0-.49611-.248-.24805-.5426l.02325-.031 2.1317-2.5425c.69765-.8372.58137-1.4341.4496-1.7209-.17829-.3953-.58138-.6589-1.13174-.6589h-.00775c-.27906-.0077-.35658-.186-.17054-.4108l.13953-.1628 4.68971-5.61996c.2248-.26355.5116-.41083.814-.41083.3023 0 .5891.14728.8139.41083l4.7052 5.61216.1395.1628c.1861.2171.1086.4031-.1705.4108h-.0077c-.5349 0-.9457.2636-1.1318.6589-.1318.2868-.248.8915.4496 1.7209l2.1317 2.5425.0233.031c.2558.3024.1395.5427-.2481.5427h-1.9456c-.0292 0-.0578.0023-.0858.0067-1.2747-.0277-2.4605-.6206-3.2475-1.6346-.186-.2403-.5271-.279-.7674-.093s-.2791.5271-.093.7674c1.0187 1.2965 2.5445 2.0475 4.1872 2.0542h.0065.0069.0085.0028 1.8809c1 0 1.3643-.4729 1.4961-.7519.124-.2791.248-.8682-.3876-1.6279l-2.1317-2.5425z" fill="#fff"/></g></g></svg>
				<div class="marker-store-text">${item.content}租金：${item.rent}元/月</div>`
			const marker = new (window as any).AMap.Marker({
				position: item.position,
				content: contentElement,
				offset: new (window as any).AMap.Pixel(0, 0), //设置点标记偏移量
			  anchor: "center", //设置锚点方位
			})
			mapInstanceRef.current.add(marker)
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
				mapInstanceRef.current.setZoom(12)
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
					heatmapData={heatmapData}
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
