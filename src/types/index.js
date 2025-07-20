/**
 * ChatPulse - Type Definitions
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * © 2025 DarkSide Developer Team. All rights reserved.
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
    LIST: 'list'
};

const ChatTypes = {
    INDIVIDUAL: 'individual',
    GROUP: 'group',
    BROADCAST: 'broadcast'
};

const AuthStrategies = {
    QR: 'qr',
    PAIRING: 'pairing',
    PHONE_NUMBER: 'phone_number',
    EMAIL: 'email'
};

const ConnectionStates = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    READY: 'ready',
    RECONNECTING: 'reconnecting',
    FAILED: 'failed'
};

const ErrorTypes = {
    CONNECTION_ERROR: 'connection_error',
    AUTHENTICATION_ERROR: 'authentication_error',
    MESSAGE_ERROR: 'message_error',
    MEDIA_ERROR: 'media_error',
    SESSION_ERROR: 'session_error',
    NETWORK_ERROR: 'network_error',
    TIMEOUT_ERROR: 'timeout_error',
    VALIDATION_ERROR: 'validation_error',
    RATE_LIMIT_ERROR: 'rate_limit_error',
    UNKNOWN_ERROR: 'unknown_error'
};

const EventTypes = {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    RECONNECTING: 'reconnecting',
    READY: 'ready',
    QR_GENERATED: 'qr_generated',
    PAIRING_CODE: 'pairing_code',
    AUTHENTICATED: 'authenticated',
    MESSAGE: 'message',
    MESSAGE_SENT: 'message_sent',
    MESSAGE_REACTION: 'message_reaction',
    MESSAGE_DELETED: 'message_deleted',
    MESSAGE_EDITED: 'message_edited',
    MEDIA_SENT: 'media_sent',
    STICKER_SENT: 'sticker_sent',
    VOICE_SENT: 'voice_sent',
    POLL_UPDATE: 'poll_update',
    BUTTON_RESPONSE: 'button_response',
    LIST_RESPONSE: 'list_response',
    ERROR: 'error'
};

module.exports = {
    MessageTypes,
    ChatTypes,
    AuthStrategies,
    ConnectionStates,
    ErrorTypes,
    EventTypes
};