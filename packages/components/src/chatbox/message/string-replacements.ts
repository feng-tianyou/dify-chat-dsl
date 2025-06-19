/**
 * 字符串替换配置
 * 用于自定义消息内容的字符串替换规则
 */

export interface StringReplacementRule {
	/** 要搜索的字符串或正则表达式 */
	search: string | RegExp
	/** 替换的目标字符串 */
	replace: string
	/** 规则描述（可选，用于维护时的注释） */
	description?: string
	/** 是否启用此规则（默认为 true） */
	enabled?: boolean
	/** 应用范围：'ai' | 'user' | 'both' （默认为 'ai'） */
	scope?: 'ai' | 'user' | 'both'
}

/**
 * 自定义字符串替换规则配置
 * 在这里添加、修改或禁用替换规则
 */
export const stringReplacementRules: StringReplacementRule[] = [
	// {
	// 	search: /\bAPI\b/g,
	// 	replace: '接口',
	// 	description: '将英文 API 替换为中文"接口"',
	// 	enabled: true,
	// 	scope: 'both', // 对用户输入和AI回复都进行替换
	// },
	// {
	// 	search: /\b机器学习\b/g,
	// 	replace: '人工智能算法',
	// 	description: '将"机器学习"替换为更通俗的表达',
	// 	enabled: true,
	// 	scope: 'ai', // 只对AI回复进行替换
	// },
	// {
	// 	search: 'https://example.com',
	// 	replace: '示例网站',
	// 	description: '将示例网址替换为友好名称',
	// 	enabled: true,
	// 	scope: 'both',
	// },
	// {
	// 	search: /\b数据库\b/g,
	// 	replace: '数据存储',
	// 	description: '将"数据库"替换为"数据存储"',
	// 	enabled: false, // 示例：禁用此规则
	// 	scope: 'both',
	// },
	// 用户输入专用的替换规则示例
	{
		search: /请识别用户问题是否有包含地址:/g,
		replace: '',
		description: '移除用户输入中的特定前缀',
		enabled: true,
		scope: 'user', // 只对用户输入进行替换
	},
	// 更灵活的替换规则，支持多种变体
	{
		search: /请识别用户问题是否有包含地址[:：]/g,
		replace: '',
		description: '移除用户输入中的特定前缀（支持中英文冒号）',
		enabled: true,
		scope: 'user',
	},

	// 在这里继续添加更多替换规则...
	// {
	//   search: /要替换的内容/g,
	//   replace: '替换后的内容',
	//   description: '规则说明',
	//   enabled: true,
	//   scope: 'both', // 'ai' | 'user' | 'both'
	// },
]

/**
 * 应用字符串替换规则
 * @param content 原始内容
 * @param messageType 消息类型：'ai' | 'user'
 * @param customRules 可选的自定义规则，会与默认规则合并
 * @returns 替换后的内容
 */
export const applyStringReplacements = (
	content: string,
	messageType: 'ai' | 'user',
	customRules?: StringReplacementRule[]
): string => {
	// 合并默认规则和自定义规则
	const allRules = [...stringReplacementRules, ...(customRules || [])]
	
	// 过滤启用的规则，并根据消息类型过滤适用的规则
	const activeRules = allRules.filter(rule => {
		// 规则必须启用
		if (rule.enabled === false) return false
		
		// 根据scope过滤规则
		const scope = rule.scope || 'ai' // 默认只应用于AI回复
		return scope === 'both' || scope === messageType
	})
	
	let processedContent = content
	
	activeRules.forEach(({ search, replace }) => {
		try {
			if (typeof search === 'string') {
				processedContent = processedContent.replaceAll(search, replace)
			} else {
				processedContent = processedContent.replace(search, replace)
			}
		} catch (error) {
			console.warn('字符串替换规则执行失败:', { search, replace, error })
		}
	})
	
	return processedContent
}

/**
 * 获取所有启用的替换规则
 * @param messageType 可选的消息类型过滤
 * @returns 启用的规则列表
 */
export const getActiveReplacementRules = (messageType?: 'ai' | 'user'): StringReplacementRule[] => {
	return stringReplacementRules.filter(rule => {
		if (rule.enabled === false) return false
		
		if (messageType) {
			const scope = rule.scope || 'ai'
			return scope === 'both' || scope === messageType
		}
		
		return true
	})
}

/**
 * 添加新的替换规则
 * @param rule 新规则
 */
export const addReplacementRule = (rule: StringReplacementRule): void => {
	stringReplacementRules.push(rule)
}

/**
 * 移除替换规则
 * @param index 规则索引
 */
export const removeReplacementRule = (index: number): void => {
	if (index >= 0 && index < stringReplacementRules.length) {
		stringReplacementRules.splice(index, 1)
	}
}

/**
 * 获取用户输入专用的替换规则
 * @returns 仅适用于用户输入的规则列表
 */
export const getUserInputReplacementRules = (): StringReplacementRule[] => {
	return getActiveReplacementRules('user')
}

/**
 * 获取AI回复专用的替换规则
 * @returns 仅适用于AI回复的规则列表
 */
export const getAIReplyReplacementRules = (): StringReplacementRule[] => {
	return getActiveReplacementRules('ai')
}

/**
 * 添加用户输入专用的替换规则
 * @param search 搜索内容
 * @param replace 替换内容
 * @param description 规则描述
 */
export const addUserInputReplacementRule = (
	search: string | RegExp,
	replace: string,
	description?: string
): void => {
	addReplacementRule({
		search,
		replace,
		description,
		enabled: true,
		scope: 'user',
	})
}

/**
 * 添加AI回复专用的替换规则
 * @param search 搜索内容
 * @param replace 替换内容
 * @param description 规则描述
 */
export const addAIReplyReplacementRule = (
	search: string | RegExp,
	replace: string,
	description?: string
): void => {
	addReplacementRule({
		search,
		replace,
		description,
		enabled: true,
		scope: 'ai',
	})
}

 