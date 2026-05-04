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

export enum MessageFragmentType {
  TextFragment = 'text',
}

export enum MessageContentType {
  Text = 'text',
}

export interface MessageFragment {
  id: number
  type: MessageFragmentType
  ts: number
  contentType: MessageContentType
  content: string
}

export interface Message {
  id: number
  parent_id: number | null
  role: MessageRole
  ts: number
  status: MessageStatus
  files: Array<{ id: string; name: string; type: string; size: number; hash: string; path: string }>
  fragments: MessageFragment[]
  has_pending_fragment: boolean
}

export interface MessageContainer {
  name: string
  content: Message[]
}

export interface Conversation {
  schemaVersion: SchemaVersion
  appid: string
  name: string
  stat: { created_at: number; updated_at: number }
  history: MessageContainer[]
  content: MessageContainer
}
