/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const ChatPulse = require('./core/ChatPulse');
const { MessageHandler } = require('./handlers/MessageHandler');
const { MediaHandler } = require('./handlers/MediaHandler');
const { QRHandler } = require('./handlers/QRHandler');
const { SessionManager } = require('./managers/SessionManager');
const { WhatsAppWebClient } = require('./core/WhatsAppWebClient');
const { Logger } = require('./utils/Logger');
const { InputValidator } = require('./validators/InputValidator');
const { 
    ChatPulseError,
    ConnectionError,
    AuthenticationError,
    MessageError,
    ValidationError
} = require('./errors/ChatPulseError');
const {
    MessageTypes,
    ChatTypes,
    AuthStrategies,
    ConnectionStates,
    EventTypes
} = require('./types');
const { DefaultConfig } = require('./config/DefaultConfig');

module.exports = {
    ChatPulse,
    MessageHandler,
    MediaHandler,
    QRHandler,
    SessionManager,
    WhatsAppWebClient,
    Logger,
    InputValidator,
    ChatPulseError,
    ConnectionError,
    AuthenticationError,
    MessageError,
    ValidationError,
    MessageTypes,
    ChatTypes,
    AuthStrategies,
    ConnectionStates,
    EventTypes,
    DefaultConfig
};

if (require.main === module) {
    console.log('🚀 ChatPulse v2.0.0 - Advanced WhatsApp Web API');
    console.log('📖 Usage: const { ChatPulse } = require("chatpulse");');
}