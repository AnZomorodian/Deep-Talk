export interface Device {
  deviceId: string;
  deviceName: string;
  lastActive: number;
}

export interface UserProfile {
  id: string; // The user ID (typically a public-key hash or custom readable username)
  username: string; // Unique username (e.g. @username)
  displayName: string;
  publicKey: string; // Base64 encoded RSA-OAEP public key
  password?: string; // Optional user password
  encryptedPrivateKey?: string; // Encrypted with PBKDF2 master recovery password
  privateKeySalt?: string; // Salt for PBKDF2
  avatarUrl: string;
  createdAt: number;
  devices: Device[];
  disableReadReceipts?: boolean;
  email?: string;
  bio?: string;
  phone?: string;
}

export interface Reaction {
  userId: string;
  username: string;
  emoji: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string; // Encrypted in E2EE mode, plain text in group mode
  isEncrypted: boolean;
  type: 'text' | 'file' | 'location' | 'card' | 'transfer';
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  fileUrl?: string;
  timestamp: number;
  selfDestructDuration?: number; // in seconds, set when sending, 0 means none
  selfDestructAt?: number; // calculated death timestamp once read by recipient
  viewedBy: string[]; // userIds who viewed the message
  recalled: boolean;
  recalledAt?: number;
  reactions: Reaction[];
  replyToId?: string;
  isForwarded?: boolean;
  forwardedFromName?: string;
}

export interface Chat {
  id: string; // unique conversation ID
  type: 'direct' | 'group' | 'saved';
  name?: string; // used for group chats
  participants: string[]; // array of user IDs
  sharedNotes: string; // Markdown / collaborative draft
  sharedNotesLastModified: number;
  sharedNotesModifiedBy?: string;
  pinned?: boolean;
  pinnedMessageId?: string | null; // ID of the pinned message in this chat
}

export interface CallState {
  roomId: string;
  chatId: string;
  callerId: string;
  callerName: string;
  receiverId: string;
  type: 'voice' | 'video';
  status: 'idle' | 'outgoing' | 'incoming' | 'connected' | 'rejected' | 'ended';
  timestamp: number;
}

// REST & Sync API Payload Types
export interface SyncEvent {
  type: 'message' | 'message_deleted' | 'message_recalled' | 'message_viewed' | 'message_viewed_suppressed' | 'reaction' | 'note_update' | 'call_event' | 'chat_updated' | 'chat_deleted' | 'typing_event' | 'user_registered' | 'user_deleted' | 'user_settings_updated';
  payload: any;
  timestamp: number;
}
