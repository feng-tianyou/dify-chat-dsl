/**
 * 用户输入消息替换示例配置
 * 这个文件提供了常见的用户输入替换规则示例，您可以参考这些配置来设置自己的规则
 */

import { StringReplacementRule, addUserInputReplacementRule } from './string-replacements'

/**
 * 用户输入常见替换规则示例
 */
export const userInputExampleRules: StringReplacementRule[] = [
	// // 问候语统一
	// {
	// 	search: /\b(你好|hi|hello|hey|嗨)\b/gi,
	// 	replace: '您好',
	// 	description: '统一问候语为"您好"',
	// 	enabled: true,
	// 	scope: 'user',
	// },
	
	// // 请求用词规范化
	// {
	// 	search: /\b(帮我|请帮我|能否帮我|可以帮我|麻烦你|拜托)\b/g,
	// 	replace: '请协助我',
	// 	description: '规范化请求用词',
	// 	enabled: true,
	// 	scope: 'user',
	// },
	
	// // 感谢用词统一
	// {
	// 	search: /\b(谢谢|thanks?|thx|多谢)\b/gi,
	// 	replace: '感谢',
	// 	description: '统一感谢用词',
	// 	enabled: true,
	// 	scope: 'user',
	// },
	
	// // 否定表达统一
	// {
	// 	search: /\b(不对|不是的|不对的|错了)\b/g,
	// 	replace: '不正确',
	// 	description: '统一否定表达',
	// 	enabled: true,
	// 	scope: 'user',
	// },
	
	// // 确认表达统一
	// {
	// 	search: /\b(好的|OK|ok|行|可以|没问题)\b/gi,
	// 	replace: '确认',
	// 	description: '统一确认表达',
	// 	enabled: true,
	// 	scope: 'user',
	// },
	
	// // 网络用语转正式用语
	// {
	// 	search: /\b(厉害|牛逼|666|nb)\b/gi,
	// 	replace: '很好',
	// 	description: '将网络用语转为正式表达',
	// 	enabled: true,
	// 	scope: 'user',
	// },
	
	// // 标点符号规范化
	// {
	// 	search: /！+/g,
	// 	replace: '！',
	// 	description: '规范化感叹号',
	// 	enabled: true,
	// 	scope: 'user',
	// },
	// {
	// 	search: /？+/g,
	// 	replace: '？',
	// 	description: '规范化问号',
	// 	enabled: true,
	// 	scope: 'user',
	// },
	
	// // 敏感词过滤示例（根据实际需求配置）
	// {
	// 	search: /\b(垃圾|废话|愚蠢)\b/g,
	// 	replace: '[已过滤]',
	// 	description: '过滤不当用词',
	// 	enabled: false, // 默认禁用，根据需要启用
	// 	scope: 'user',
	// },
	
	// // 英文术语本地化
	// {
	// 	search: /\bAI\b/g,
	// 	replace: '人工智能',
	// 	description: '将AI替换为人工智能',
	// 	enabled: true,
	// 	scope: 'user',
	// },
	// {
	// 	search: /\bAPI\b/g,
	// 	replace: '接口',
	// 	description: '将API替换为接口',
	// 	enabled: true,
	// 	scope: 'user',
	// },
]

/**
 * 批量应用用户输入示例规则
 * 注意：这会将示例规则添加到全局配置中
 */
export const applyUserInputExampleRules = (): void => {
	userInputExampleRules.forEach(rule => {
		if (rule.enabled !== false) {
			addUserInputReplacementRule(
				rule.search,
				rule.replace,
				rule.description
			)
		}
	})
}

/**
 * 获取特定类型的用户输入替换规则
 */
export const getUserInputRulesByCategory = (category: 'greeting' | 'request' | 'thanks' | 'confirmation' | 'filter'): StringReplacementRule[] => {
	const categoryMap = {
		greeting: ['问候语', '您好'],
		request: ['请求', '协助'],
		thanks: ['感谢'],
		confirmation: ['确认'],
		filter: ['过滤'],
	}
	
	const keywords = categoryMap[category]
	return userInputExampleRules.filter(rule => 
		keywords.some(keyword => 
			rule.description?.includes(keyword) || rule.replace.includes(keyword)
		)
	)
}

/**
 * 创建自定义用户输入替换规则的辅助函数
 */
export const createUserInputRule = (
	search: string | RegExp,
	replace: string,
	description?: string,
	enabled: boolean = true
): StringReplacementRule => ({
	search,
	replace,
	description,
	enabled,
	scope: 'user',
}) 