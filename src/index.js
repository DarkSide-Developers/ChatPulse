/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

// Core exports
const ChatPulse = require('./core/ChatPulse');

// Handler exports
const { MessageHandler } = require('./handlers/MessageHandler');
const { MediaHandler } = require('./handlers/MediaHandler');
const { QRHandler } = require('./handlers/QRHandler');

// Manager exports
const { SessionManager } = require('./managers/SessionManager');

// Utility exports
const { Logger } = require('./utils/Logger');
const { InputValidator } = require('./validators/InputValidator');

// Error exports
const {
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
} = require('./errors/ChatPulseError');

// Type exports
const {
    MessageTypes,
    ChatTypes,
    AuthStrategies,
    ConnectionStates,
    ErrorTypes,
    EventTypes
} = require('./types');

// Configuration exports
const { DefaultConfig, mergeConfig } = require('./config/DefaultConfig');

// Service exports
const { MessageQueue } = require('./services/MessageQueue');

// Middleware exports
const { RateLimiter } = require('./middleware/RateLimiter');

// Event system exports
const { EventEmitter } = require('../lib/events/EventEmitter');

module.exports = {
    // Main class
    ChatPulse,
    
    // Handlers
    MessageHandler,
    MediaHandler,
    QRHandler,
    
    // Managers
    SessionManager,
    
    // Utilities
    Logger,
    InputValidator,
    
    // Errors
    ChatPulseError,
    ConnectionError,
    AuthenticationError,
    MessageError,
    MediaError,
    ValidationError,
    RateLimitError,
    SessionError,
    NetworkError,
    TimeoutError,
    
    // Types
    MessageTypes,
    ChatTypes,
    AuthStrategies,
    ConnectionStates,
    ErrorTypes,
    EventTypes,
    
    // Configuration
    DefaultConfig,
    mergeConfig,
    
    // Services
    MessageQueue,
    
    // Middleware
    RateLimiter,
    
    // Event system
    EventEmitter
};