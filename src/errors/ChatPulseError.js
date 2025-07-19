/**
 * ChatPulse - Custom Error Classes
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { ErrorTypes } = require('../types');

/**
 * Base ChatPulse Error class
 */
class ChatPulseError extends Error {
    constructor(message, type = ErrorTypes.UNKNOWN_ERROR, code = null, details = {}) {
        super(message);
        this.name = 'ChatPulseError';
        this.type = type;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
        
        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ChatPulseError);
        }
    }

    /**
     * Convert error to JSON
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            type: this.type,
            code: this.code,
            details: this.details,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }

    /**
     * Get error severity level
     */
    getSeverity() {
        const severityMap = {
            [ErrorTypes.CONNECTION_ERROR]: 'high',
            [ErrorTypes.AUTHENTICATION_ERROR]: 'high',
            [ErrorTypes.SESSION_ERROR]: 'high',
            [ErrorTypes.MESSAGE_ERROR]: 'medium',
            [ErrorTypes.MEDIA_ERROR]: 'medium',
            [ErrorTypes.VALIDATION_ERROR]: 'low',
            [ErrorTypes.RATE_LIMIT_ERROR]: 'medium',
            [ErrorTypes.NETWORK_ERROR]: 'high',
            [ErrorTypes.TIMEOUT_ERROR]: 'medium',
            [ErrorTypes.UNKNOWN_ERROR]: 'high'
        };
        
        return severityMap[this.type] || 'medium';
    }

    /**
     * Check if error is recoverable
     */
    isRecoverable() {
        const recoverableTypes = [
            ErrorTypes.NETWORK_ERROR,
            ErrorTypes.TIMEOUT_ERROR,
            ErrorTypes.RATE_LIMIT_ERROR
        ];
        
        return recoverableTypes.includes(this.type);
    }
}

/**
 * Connection related errors
 */
class ConnectionError extends ChatPulseError {
    constructor(message, code = null, details = {}) {
        super(message, ErrorTypes.CONNECTION_ERROR, code, details);
        this.name = 'ConnectionError';
    }
}

/**
 * Authentication related errors
 */
class AuthenticationError extends ChatPulseError {
    constructor(message, code = null, details = {}) {
        super(message, ErrorTypes.AUTHENTICATION_ERROR, code, details);
        this.name = 'AuthenticationError';
    }
}

/**
 * Message related errors
 */
class MessageError extends ChatPulseError {
    constructor(message, code = null, details = {}) {
        super(message, ErrorTypes.MESSAGE_ERROR, code, details);
        this.name = 'MessageError';
    }
}

/**
 * Media related errors
 */
class MediaError extends ChatPulseError {
    constructor(message, code = null, details = {}) {
        super(message, ErrorTypes.MEDIA_ERROR, code, details);
        this.name = 'MediaError';
    }
}

/**
 * Validation related errors
 */
class ValidationError extends ChatPulseError {
    constructor(message, code = null, details = {}) {
        super(message, ErrorTypes.VALIDATION_ERROR, code, details);
        this.name = 'ValidationError';
    }
}

/**
 * Rate limiting errors
 */
class RateLimitError extends ChatPulseError {
    constructor(message, code = null, details = {}) {
        super(message, ErrorTypes.RATE_LIMIT_ERROR, code, details);
        this.name = 'RateLimitError';
    }
}

/**
 * Session related errors
 */
class SessionError extends ChatPulseError {
    constructor(message, code = null, details = {}) {
        super(message, ErrorTypes.SESSION_ERROR, code, details);
        this.name = 'SessionError';
    }
}

/**
 * Network related errors
 */
class NetworkError extends ChatPulseError {
    constructor(message, code = null, details = {}) {
        super(message, ErrorTypes.NETWORK_ERROR, code, details);
        this.name = 'NetworkError';
    }
}

/**
 * Timeout related errors
 */
class TimeoutError extends ChatPulseError {
    constructor(message, code = null, details = {}) {
        super(message, ErrorTypes.TIMEOUT_ERROR, code, details);
        this.name = 'TimeoutError';
    }
}

module.exports = {
    ChatPulseError,
    ConnectionError,
    AuthenticationError,
    MessageError,
    MediaError,
    ValidationError,
    RateLimitError,
    SessionError,
    NetworkError,
    TimeoutError
};