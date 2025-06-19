# 消息内容字符串替换功能

## 概述

该功能允许您对聊天消息内容进行自定义字符串替换，支持对**AI回复**和**用户输入**分别或同时进行处理，可以用于：
- 术语统一（如将"API"替换为"接口"）
- 内容本地化（如将英文术语替换为中文）
- 敏感词过滤或替换
- 品牌词替换
- 用户输入规范化（如统一问候语、请求用词等）

## 文件结构

- `content.tsx` - 消息内容组件，负责应用替换规则
- `string-replacements.ts` - 替换规则配置文件

## 使用方法

### 1. 配置替换规则

编辑 `string-replacements.ts` 文件，在 `stringReplacementRules` 数组中添加您的替换规则：

```typescript
export const stringReplacementRules: StringReplacementRule[] = [
  {
    search: /\bAPI\b/g,           // 使用正则表达式精确匹配
    replace: '接口',
    description: '将英文 API 替换为中文"接口"',
    enabled: true,
  },
  {
    search: 'specific-string',     // 使用字符串精确匹配
    replace: '替换后的内容',
    description: '示例字符串替换',
    enabled: true,
  },
]
```

### 2. 规则配置说明

每个替换规则包含以下字段：

- `search`: 要搜索的内容，可以是字符串或正则表达式
- `replace`: 替换后的内容
- `description`: 规则描述（可选）
- `enabled`: 是否启用此规则（可选，默认为 true）
- `scope`: 应用范围（可选，默认为 'ai'）
  - `'ai'`: 只对AI回复进行替换
  - `'user'`: 只对用户输入进行替换
  - `'both'`: 对AI回复和用户输入都进行替换

### 3. 搜索模式

#### 字符串匹配
```typescript
{
  search: '要替换的文本',
  replace: '新文本',
}
```

#### 正则表达式匹配
```typescript
{
  search: /\b单词边界\b/g,  // 全局匹配
  replace: '替换内容',
}
```

#### 常用正则表达式示例

- 匹配完整单词：`/\b单词\b/g`
- 匹配多个可能的词：`/(词1|词2|词3)/g`
- 不区分大小写：`/内容/gi`
- 匹配数字：`/\d+/g`
- 匹配网址：`/https?:\/\/[^\s]+/g`

### 4. 应用范围配置

#### 只对AI回复进行替换
```typescript
{
  search: /\b机器学习\b/g,
  replace: '人工智能算法',
  scope: 'ai',  // 只替换AI回复中的内容
}
```

#### 只对用户输入进行替换
```typescript
{
  search: /\b(帮我|请帮我)\b/g,
  replace: '请协助我',
  scope: 'user',  // 只替换用户输入中的内容
}
```

#### 对所有消息进行替换
```typescript
{
  search: /\bAPI\b/g,
  replace: '接口',
  scope: 'both',  // 对AI回复和用户输入都进行替换
}
```

### 5. 临时禁用规则

将规则的 `enabled` 设置为 `false`：

```typescript
{
  search: /\b数据库\b/g,
  replace: '数据存储',
  enabled: false,  // 禁用此规则
  scope: 'both',
}
```

### 6. 动态添加规则

#### 通用方式
```typescript
import { addReplacementRule } from './string-replacements'

addReplacementRule({
  search: '动态添加的内容',
  replace: '替换后的内容',
  enabled: true,
  scope: 'both',
})
```

#### 专用方式
```typescript
import { 
  addUserInputReplacementRule, 
  addAIReplyReplacementRule 
} from './string-replacements'

// 添加用户输入专用规则
addUserInputReplacementRule(
  /\b你好\b/g,
  '您好',
  '统一问候语'
)

// 添加AI回复专用规则
addAIReplyReplacementRule(
  /\b数据分析\b/g,
  '数据洞察',
  '优化AI回复用词'
)
```

## 注意事项

1. **性能考虑**: 避免过多复杂的正则表达式，可能会影响渲染性能
2. **顺序影响**: 规则按数组顺序执行，后面的规则可能会影响前面规则的结果
3. **默认作用域**: 如果不指定 `scope`，默认只对 AI 回复进行替换（`scope: 'ai'`）
4. **用户体验**: 对用户输入进行替换时要谨慎，避免过度修改用户原意
5. **测试充分**: 添加新规则后请充分测试，确保不会产生意外的替换
6. **实时生效**: 配置修改后会立即生效，无需重启应用

## 常见使用场景

### 术语统一（所有消息）
```typescript
{
  search: /\b(API|api)\b/g,
  replace: '接口',
  description: '统一接口术语',
  scope: 'both',
}
```

### AI回复专用场景

#### 品牌词替换
```typescript
{
  search: /竞品名称/g,
  replace: '我们的产品',
  description: '品牌词替换',
  scope: 'ai',
}
```

#### 技术术语本地化
```typescript
{
  search: /\bmachine learning\b/gi,
  replace: '机器学习',
  description: 'AI回复中的英文术语本地化',
  scope: 'ai',
}
```

### 用户输入专用场景

#### 问候语统一
```typescript
{
  search: /\b(你好|hi|hello|hey)\b/gi,
  replace: '您好',
  description: '统一问候语格式',
  scope: 'user',
}
```

#### 请求用词规范化
```typescript
{
  search: /\b(帮我|请帮我|能否帮我|可以帮我|麻烦你)\b/g,
  replace: '请协助我',
  description: '规范化请求用词',
  scope: 'user',
}
```

#### 敏感词过滤
```typescript
{
  search: /不当内容/g,
  replace: '[已过滤]',
  description: '用户输入敏感词过滤',
  scope: 'user',
}
```

### 通用场景

#### 网址友好化
```typescript
{
  search: /https:\/\/example\.com/g,
  replace: '我们的官网',
  description: '网址友好化显示',
  scope: 'both',
}
```

#### 表情符号标准化
```typescript
{
  search: /:\)/g,
  replace: '😊',
  description: '文本表情转为emoji',
  scope: 'both',
}
``` 