/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const ChatPulse = require('./core/ChatPulse');
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

module.exports = {
    ChatPulse,
    ChatPulseError,
    ConnectionError,
    AuthenticationError,
    MessageError,
    ValidationError,
    MessageTypes,
    ChatTypes,
    AuthStrategies,
    ConnectionStates,
    EventTypes
};

// Default export for easier importing
module.exports.default = ChatPulse;