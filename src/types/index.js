/**
 * ChatPulse - Type Definitions
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

/**
 * Message types supported by WhatsApp
 */
const MessageTypes = {
    TEXT: 'text',
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    DOCUMENT: 'document',
    STICKER: 'sticker',
    LOCATION: 'location',
    CONTACT: 'contact',
    POLL: 'poll',
    BUTTON: 'button',
    LIST: 'list',
    TEMPLATE: 'template',
    INTERACTIVE: 'interactive',
    REACTION: 'reaction',
    EDIT: 'edit',
    REVOKE: 'revoke'
};

/**
 * Chat types
 */
const ChatTypes = {
    INDIVIDUAL: 'individual',
    GROUP: 'group',
    BROADCAST: 'broadcast',
    STATUS: 'status'
};

/**
 * Authentication strategies
 */
const AuthStrategies = {
    QR: 'qr',
    PAIRING: 'pairing',
    PHONE_NUMBER: 'phone_number',
    EMAIL: 'email',
    MULTI_DEVICE: 'multi_device',
    BACKUP_CODE: 'backup_code',
    BIOMETRIC: 'biometric',
    SESSION: 'session'
};

/**
 * Connection states
 */
const ConnectionStates = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    AUTHENTICATING: 'authenticating',
    READY: 'ready',
    RECONNECTING: 'reconnecting',
    FAILED: 'failed',
    CLOSING: 'closing'
};

/**
 * Error types
 */
const ErrorTypes = {
    CONNECTION_ERROR: 'connection_error',
    AUTHENTICATION_ERROR: 'authentication_error',
    MESSAGE_ERROR: 'message_error',
    MEDIA_ERROR: 'media_error',
    VALIDATION_ERROR: 'validation_error',
    RATE_LIMIT_ERROR: 'rate_limit_error',
    SESSION_ERROR: 'session_error',
    NETWORK_ERROR: 'network_error',
    TIMEOUT_ERROR: 'timeout_error',
    UNKNOWN_ERROR: 'unknown_error'
};

/**
 * Event types
 */
const EventTypes = {
    // Connection events
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    RECONNECTING: 'reconnecting',
    READY: 'ready',
    
    // Authentication events
    QR_GENERATED: 'qr_generated',
    QR_UPDATED: 'qr_updated',
    PAIRING_CODE: 'pairing_code',
    AUTHENTICATED: 'authenticated',
    AUTHENTICATION_FAILED: 'authentication_failed',
    
    // Message events
    MESSAGE: 'message',
    MESSAGE_SENT: 'message_sent',
    MESSAGE_RECEIVED: 'message_received',
    MESSAGE_ACK: 'message_ack',
    MESSAGE_EDITED: 'message_edited',
    MESSAGE_DELETED: 'message_deleted',
    MESSAGE_REACTION: 'message_reaction',
    
    // Interactive message events
    BUTTON_RESPONSE: 'button_response',
    LIST_RESPONSE: 'list_response',
    POLL_UPDATE: 'poll_update',
    
    // Media events
    MEDIA_SENT: 'media_sent',
    MEDIA_RECEIVED: 'media_received',
    STICKER_SENT: 'sticker_sent',
    VOICE_SENT: 'voice_sent',
    
    // Chat events
    CHAT_UPDATE: 'chat_update',
    PRESENCE_UPDATE: 'presence_update',
    TYPING: 'typing',
    RECORDING: 'recording',
    
    // Group events
    GROUP_JOIN: 'group_join',
    GROUP_LEAVE: 'group_leave',
    GROUP_UPDATE: 'group_update',
    GROUP_PARTICIPANTS_UPDATE: 'group_participants_update',
    
    // Call events
    CALL: 'call',
    CALL_OFFER: 'call_offer',
    CALL_ACCEPT: 'call_accept',
    CALL_REJECT: 'call_reject',
    CALL_END: 'call_end',
    
    // Error events
    ERROR: 'error',
    WARNING: 'warning'
};

/**
 * Message status types
 */
const MessageStatus = {
    PENDING: 'pending',
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    FAILED: 'failed',
    DELETED: 'deleted'
};

/**
 * Presence types
 */
const PresenceTypes = {
    UNAVAILABLE: 'unavailable',
    AVAILABLE: 'available',
    COMPOSING: 'composing',
    RECORDING: 'recording',
    PAUSED: 'paused'
};

/**
 * Media types
 */
const MediaTypes = {
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    DOCUMENT: 'document',
    STICKER: 'sticker',
    GIF: 'gif',
    VOICE: 'voice'
};

/**
 * Group roles
 */
const GroupRoles = {
    ADMIN: 'admin',
    MEMBER: 'member',
    SUPER_ADMIN: 'superadmin'
};

/**
 * Chat actions
 */
const ChatActions = {
    ARCHIVE: 'archive',
    UNARCHIVE: 'unarchive',
    PIN: 'pin',
    UNPIN: 'unpin',
    MUTE: 'mute',
    UNMUTE: 'unmute',
    BLOCK: 'block',
    UNBLOCK: 'unblock',
    DELETE: 'delete',
    CLEAR: 'clear'
};

/**
 * Authentication methods
 */
const AuthMethods = {
    QR_CODE: 'qr_code',
    PHONE_VERIFICATION: 'phone_verification',
    EMAIL_VERIFICATION: 'email_verification',
    BACKUP_CODES: 'backup_codes',
    BIOMETRIC: 'biometric',
    MULTI_DEVICE_PAIRING: 'multi_device_pairing',
    SESSION_RESTORE: 'session_restore'
};

module.exports = {
    MessageTypes,
    ChatTypes,
    AuthStrategies,
    ConnectionStates,
    ErrorTypes,
    EventTypes,
    MessageStatus,
    PresenceTypes,
    MediaTypes,
    GroupRoles,
    ChatActions,
    AuthMethods
};