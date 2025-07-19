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

// WhatsApp Web Client
const { WhatsAppWebClient } = require('./core/WhatsAppWebClient');

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

// Example bot for quick start
const exampleBot = async () => {
    console.log('🚀 Starting ChatPulse Example Bot...');
    
    const client = new ChatPulse({
        sessionName: 'example-bot',
        autoReconnect: true,
        authStrategy: 'qr'
    });
    
    client.on('ready', () => {
        console.log('✅ ChatPulse Bot is ready!');
    });
    
    client.on('qr_generated', (qrInfo) => {
        console.log('📱 Scan the QR code with your WhatsApp mobile app');
    });
    
    client.on('message', async (message) => {
        if (message.body === '!ping') {
            await client.sendMessage(message.from, 'Pong! 🏓');
        }
    });
    
    await client.initialize();
};

module.exports = {
    // Main class
    ChatPulse,
    
    // Handlers
    MessageHandler,
    MediaHandler,
    QRHandler,
    
    // Managers
    SessionManager,
    
    // WhatsApp Web Client
    WhatsAppWebClient,
    
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
    EventEmitter,
    
    // Quick start example
    exampleBot
};

// If this file is run directly, start the example bot
if (require.main === module) {
    exampleBot().catch(console.error);
}