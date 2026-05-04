export enum SchemaVersion {
  V1 = 1,
}

export enum MessageRole {
  User = 'USER',
  Assistant = 'ASSISTANT',
  System = 'SYSTEM',
  Tool = 'TOOL',
  ToolResult = 'TOOL_RESULT',
}

export enum MessageStatus {
  Finished = 'FINISHED',
  WIP = 'WIP',
  Error = 'ERROR',
  Interrupted = 'INTERRUPTED',
}

export enum MessageFeedback {
  NotProvided = '',
  Positive = '+',
  Negative = '-',
}

export enum MessageFragmentType {
  TextFragment = 'text',
}

export enum MessageContentType {
  Text = 'text',
}

export type MessageContent<T extends MessageContentType> =
  T extends MessageContentType.Text ? string : never

export interface MessageFragment {
  id: number
  type: MessageFragmentType
  ts: number
  elapsed?: number
  first_token_latency?: number
  contentType: MessageContentType
  content: MessageContent<this['contentType']>
}

export enum MessageFeatureType {
  Thinking = 'thinking',
  MaxTokensLimit = 'max_tokens_limit',
  BanEdit = 'ban_edit',
  BanRegenerate = 'ban_regenerate',
}

export type MessageFeatureValue = boolean | string | number

export interface MessageFeatureItem {
  type: MessageFeatureType
  value: MessageFeatureValue
}

export interface FileAttachmentInfo {
  id: string
  name: string
  type: string
  size: number
  hash: string
  path: string
}

export interface MessageUsage {
  total_tokens: number
}

export interface Message {
  id: number
  parent_id: number | null
  role: MessageRole
  ts: number
  features?: MessageFeatureItem[]
  feedback?: MessageFeedback
  usage?: MessageUsage
  status: MessageStatus
  files: FileAttachmentInfo[]
  fragments: MessageFragment[]
  has_pending_fragment: boolean
}

export interface MessageContainer {
  name: string
  content: Message[]
}

export interface ConversationStatus {
  created_at: number
  updated_at: number
}

export interface Conversation {
  schemaVersion: SchemaVersion
  appid: string
  name: string
  stat: ConversationStatus
  history: MessageContainer[]
  content: MessageContainer
}

export interface WebSocketMessage {
  type: string
  content: unknown
}

export interface PatchOperation {
  p: string
  o: 'PUSH' | 'APPEND' | 'UPDATE' | 'DELETE'
  v: unknown
}
