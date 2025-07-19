/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const ChatPulse = require('./core/ChatPulse');
const { MessageHandler } = require('./handlers/MessageHandler');
const { PluginManager } = require('./plugins/PluginManager');
const { SessionManager } = require('./session/SessionManager');
const { MediaHandler } = require('./media/MediaHandler');
const { EventEmitter } = require('./events/EventEmitter');
const Utils = require('./utils');

module.exports = {
    ChatPulse,
    MessageHandler,
    PluginManager,
    SessionManager,
    MediaHandler,
    EventEmitter,
    Utils
};