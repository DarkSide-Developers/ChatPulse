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
 * Message types and interfaces
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
    BUTTON: 'buttons',
    LIST: 'list',
    TEMPLATE: 'template',
    CAROUSEL: 'carousel',
    INTERACTIVE: 'interactive'
};

/**
 * Chat types
 */
const ChatTypes = {
    INDIVIDUAL: 'individual',
    GROUP: 'group',
    BROADCAST: 'broadcast'
};

/**
 * Authentication strategies
 */
const AuthStrategies = {
    QR: 'qr',
    PAIRING: 'pairing',
    SESSION: 'session'
};

/**
 * Connection states
 */
const ConnectionStates = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    READY: 'ready',
    RECONNECTING: 'reconnecting',
    FAILED: 'failed'
};

/**
 * Error types
 */
const ErrorTypes = {
    CONNECTION_ERROR: 'CONNECTION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    MESSAGE_ERROR: 'MESSAGE_ERROR',
    MEDIA_ERROR: 'MEDIA_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    SESSION_ERROR: 'SESSION_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Event types
 */
const EventTypes = {
    // Connection events
    READY: 'ready',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    RECONNECTING: 'reconnecting',
    
    // Authentication events
    QR_GENERATED: 'qr_generated',
    QR_UPDATED: 'qr_updated',
    QR_CLEARED: 'qr_cleared',
    PAIRING_CODE: 'pairing_code',
    AUTHENTICATED: 'authenticated',
    
    // Message events
    MESSAGE: 'message',
    MESSAGE_SENT: 'message_sent',
    MESSAGE_FAILED: 'message_failed',
    MESSAGE_ACK: 'message_ack',
    MESSAGE_EDITED: 'message_edited',
    MESSAGE_DELETED: 'message_deleted',
    MESSAGE_REACTION: 'message_reaction',
    
    // Interactive events
    BUTTON_RESPONSE: 'button_response',
    LIST_RESPONSE: 'list_response',
    POLL_UPDATE: 'poll_update',
    
    // Media events
    MEDIA_SENT: 'media_sent',
    MEDIA_FAILED: 'media_failed',
    STICKER_SENT: 'sticker_sent',
    VOICE_SENT: 'voice_sent',
    
    // Chat events
    CHAT_UPDATE: 'chat_update',
    PRESENCE_UPDATE: 'presence_update',
    TYPING: 'typing',
    
    // Group events
    GROUP_JOIN: 'group_join',
    GROUP_LEAVE: 'group_leave',
    GROUP_UPDATE: 'group_update',
    GROUP_ADMIN_CHANGED: 'group_admin_changed',
    
    // Call events
    CALL: 'call',
    CALL_ACCEPTED: 'call_accepted',
    CALL_REJECTED: 'call_rejected',
    
    // Status events
    STATUS_UPDATE: 'status_update',
    
    // Error events
    ERROR: 'error',
    WARNING: 'warning'
};

module.exports = {
    MessageTypes,
    ChatTypes,
    AuthStrategies,
    ConnectionStates,
    ErrorTypes,
    EventTypes
};