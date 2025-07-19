/**
 * ChatPulse - Default Configuration
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { AuthStrategies } = require('../types');

const DefaultConfig = {
    // Session configuration
    sessionName: 'default',
    userDataDir: './sessions',
    restoreSession: true,
    
    // Authentication configuration
    authStrategy: AuthStrategies.QR,
    authTimeout: 120000,
    pairingNumber: null,
    
    // Connection configuration
    autoReconnect: true,
    maxReconnectAttempts: 10,
    reconnectInterval: 5000,
    connectionTimeout: 30000,
    
    // Rate limiting
    rateLimitPerMinute: 60,
    rateLimitPerHour: 1000,
    
    // QR code options
    qrCodeOptions: {
        terminal: true,
        save: true,
        format: 'png',
        size: 'medium'
    },
    
    // Logging
    logLevel: 'info',
    
    // Features
    enablePresenceUpdates: true,
    enableReadReceipts: true,
    enableTypingIndicator: true
};

module.exports = { DefaultConfig };