# 辅助实例功能说明

## 保留的核心功能

### 1. 双发送消息系统
- **主消息**: 正常显示在聊天界面
- **辅助消息**: 后台分析，不上屏显示
- **触发条件**: 每次用户发送消息时自动触发

### 2. 弹窗显示功能
- **功能**: 辅助实例回复完成后，自动弹出显示完整分析结果
- **组件**: `AuxiliaryMessageModal`
- **内容包含**:
  - 查询内容
  - AI分析结果
  - 时间戳
  - 可复制功能

### 3. 通知提醒
- **位置**: 页面右上角
- **触发**: 辅助分析完成时
- **功能**: 点击通知可重新打开弹窗

### 4. 消息处理器
- **处理器**: 地址识别处理器（可扩展）
- **功能**: 自动分析消息内容中的地址信息

## 核心文件结构

```
packages/react-app/src/
├── hooks/
│   └── useAuxiliaryInstance.ts          # 辅助实例Hook
├── services/
│   └── auxiliaryMessageProcessor.ts    # 消息处理器
├── components/
│   ├── chatbox-wrapper.tsx            # 主聊天组件（集成辅助功能）
│   └── auxiliary-message-modal.tsx    # 弹窗组件
└── layout/
    └── chat-layout.tsx                # 主布局（配置辅助实例）
```

## 已清理的调试功能

- ❌ 调试面板组件
- ❌ 测试组件
- ❌ 示例文件
- ❌ 复杂的日志输出
- ❌ 开发文档
- ❌ 状态显示面板

## 使用方式

在 `chat-layout.tsx` 中配置辅助实例参数：

```typescript
const auxiliaryConfig = {
  apiBase: 'https://api.dify.ai/v1',
  apiKey: 'your-api-key',  // 使用与主实例相同的密钥
  user: 'auxiliary-user'
}
```

辅助查询生成逻辑在 `chatbox-wrapper.tsx` 中：

```typescript
const generateAuxiliaryQuery = useCallback((originalContent: string) => {
  return `请识别用户问题是否有包含地址:${originalContent}`
}, [])
```

## 功能特点

- ✅ 零破坏性：不影响原有聊天功能
- ✅ 异步处理：不阻塞主消息流程
- ✅ 独立会话：辅助消息使用独立conversationId
- ✅ 错误处理：包含完整的错误处理和超时控制
- ✅ 生命周期管理：组件卸载时自动清理 