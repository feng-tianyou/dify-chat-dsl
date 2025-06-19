import React from 'react'
import { Modal, Typography, Space, Tag, Divider } from 'antd'
import { ClockCircleOutlined, RobotOutlined } from '@ant-design/icons'

const { Text, Paragraph } = Typography

interface IAuxiliaryMessage {
  query: string
  content: string
  timestamp: number
  conversationId?: string
}

interface IAuxiliaryMessageModalProps {
  /**
   * 是否显示弹窗
   */
  visible: boolean
  /**
   * 辅助消息内容
   */
  message: IAuxiliaryMessage | null
  /**
   * 关闭弹窗的回调
   */
  onClose: () => void
  /**
   * 弹窗标题（可选）
   */
  title?: string
}

/**
 * 辅助消息弹窗组件
 * 用于显示辅助实例获取的完整消息内容
 */
export const AuxiliaryMessageModal: React.FC<IAuxiliaryMessageModalProps> = ({
  visible,
  message,
  onClose,
  title = '🤖 辅助分析结果'
}) => {
  if (!message) return null

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined style={{ color: '#1890ff' }} />
          <span>{title}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
      centered
      destroyOnClose
      styles={{
        body: { maxHeight: '70vh', overflow: 'auto' }
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 消息头信息 */}
        <div style={{ 
          background: '#f5f5f5', 
          padding: '12px', 
          borderRadius: '6px',
          border: '1px solid #d9d9d9'
        }}>
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Tag color="blue">辅助分析</Tag>
              <Space>
                <ClockCircleOutlined />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {formatTime(message.timestamp)}
                </Text>
              </Space>
            </div>
            
            {message.conversationId && (
              <div>
                <Text strong>对话ID: </Text>
                <Text code style={{ fontSize: '11px' }}>
                  {message.conversationId}
                </Text>
              </div>
            )}
          </Space>
        </div>

        {/* 用户查询内容 */}
        <div>
          <Text strong style={{ color: '#1890ff', fontSize: '14px' }}>
            📤 分析查询:
          </Text>
          <Paragraph
            style={{
              background: '#e6f7ff',
              padding: '12px',
              margin: '8px 0',
              borderRadius: '6px',
              borderLeft: '4px solid #1890ff'
            }}
            copyable={{ text: message.query }}
          >
            {message.query}
          </Paragraph>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {/* AI回复内容 */}
        <div>
          <Text strong style={{ color: '#52c41a', fontSize: '14px' }}>
            📥 AI分析结果:
          </Text>
          <Paragraph
            style={{
              background: '#f6ffed',
              padding: '16px',
              margin: '8px 0',
              borderRadius: '6px',
              borderLeft: '4px solid #52c41a',
              minHeight: '100px',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.6'
            }}
            copyable={{ text: message.content }}
          >
            {message.content}
          </Paragraph>
        </div>

        {/* 统计信息 */}
        <div style={{ 
          background: '#fafafa', 
          padding: '8px 12px', 
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <Space split={<Divider type="vertical" />}>
            <Text type="secondary">查询长度: {message.query.length} 字符</Text>
            <Text type="secondary">回复长度: {message.content.length} 字符</Text>
            <Text type="secondary">处理耗时: 实时</Text>
          </Space>
        </div>
      </Space>
    </Modal>
  )
}

export default AuxiliaryMessageModal 