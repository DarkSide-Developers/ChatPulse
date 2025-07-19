/**
 * ChatPulse - Default Configuration
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { AuthStrategies } = require('../types');

/**
 * Default configuration for ChatPulse
 */
const DefaultConfig = {
    // Core settings
    sessionName: 'default',
    userDataDir: './sessions',
    
    // Connection settings
    autoReconnect: true,
    reconnectInterval: 30000,
    maxReconnectAttempts: 10,
    connectionTimeout: 60000,
    heartbeatInterval: 30000,
    
    // Authentication settings
    authStrategy: AuthStrategies.QR,
    pairingNumber: null,
    authTimeout: 120000,
    qrRefreshInterval: 30000,
    
    // WebSocket settings
    useWebSocket: true,
    wsEndpoint: 'wss://web.whatsapp.com/ws/chat',
    wsReconnectInterval: 5000,
    wsMaxReconnectAttempts: 5,
    
    // HTTP settings
    baseUrl: 'https://web.whatsapp.com',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    requestTimeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    
    // Feature flags
    enableMultiDevice: true,
    enableE2E: true,
    enableGroupEvents: true,
    enablePresenceUpdates: true,
    enableCallHandling: true,
    enableStatusUpdates: true,
    enableBusinessFeatures: true,
    enableAdvancedMedia: true,
    enableBulkMessaging: false,
    enableScheduledMessages: false,
    enableAutoReply: false,
    enableChatBackup: false,
    enableAnalytics: false,
    enableMessageQueue: true,
    enableRateLimiting: true,
    enableErrorRecovery: true,
    
    // Rate limiting
    rateLimitPerMinute: 60,
    rateLimitPerHour: 1000,
    rateLimitPerDay: 10000,
    burstLimit: 10,
    
    // Message settings
    messageTimeout: 30000,
    messageRetries: 3,
    messageQueueSize: 1000,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    
    // Media settings
    maxFileSize: 64 * 1024 * 1024, // 64MB
    supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    supportedVideoFormats: ['mp4', 'avi', 'mov', 'mkv', 'webm'],
    supportedAudioFormats: ['mp3', 'wav', 'ogg', 'aac', 'm4a'],
    mediaDownloadPath: './downloads',
    mediaTempPath: './temp',
    
    // Session settings
    sessionEncryption: true,
    sessionBackup: true,
    sessionCleanup: true,
    sessionMaxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    
    // Logging settings
    logLevel: 'info',
    logToFile: false,
    logDir: './logs',
    logMaxFileSize: 10 * 1024 * 1024, // 10MB
    logMaxFiles: 5,
    logRotation: true,
    
    // Performance settings
    maxListeners: 100,
    eventQueueSize: 1000,
    memoryThreshold: 512 * 1024 * 1024, // 512MB
    cpuThreshold: 80, // 80%
    
    // Security settings
    validateInputs: true,
    sanitizeOutputs: true,
    enableCORS: false,
    allowedOrigins: [],
    encryptionKey: null,
    
    // Auto-reply settings
    autoReply: {
        enabled: false,
        message: 'Thank you for your message. I will get back to you soon.',
        conditions: {
            keywords: [],
            excludeGroups: false,
            businessHours: null,
            maxRepliesPerDay: 10,
            cooldownPeriod: 3600000 // 1 hour
        }
    },
    
    // Bulk messaging settings
    bulkMessaging: {
        enabled: false,
        batchSize: 10,
        batchDelay: 5000,
        maxConcurrent: 3,
        retryFailedMessages: true
    },
    
    // Analytics settings
    analytics: {
        enabled: false,
        trackMessages: true,
        trackPresence: false,
        trackCalls: false,
        retentionPeriod: 90 * 24 * 60 * 60 * 1000, // 90 days
        exportFormat: 'json'
    },
    
    // Backup settings
    backup: {
        enabled: false,
        interval: 24 * 60 * 60 * 1000, // 24 hours
        maxBackups: 7,
        compression: true,
        encryption: true
    },
    
    // Webhook settings
    webhook: {
        enabled: false,
        url: null,
        secret: null,
        events: [],
        retries: 3,
        timeout: 10000
    },
    
    // Plugin settings
    plugins: {
        enabled: false,
        directory: './plugins',
        autoLoad: true,
        whitelist: [],
        blacklist: []
    }
};

/**
 * Environment-specific configurations
 */
const EnvironmentConfigs = {
    development: {
        logLevel: 'debug',
        logToFile: true,
        enableAnalytics: true,
        rateLimitPerMinute: 120
    },
    
    production: {
        logLevel: 'warn',
        logToFile: true,
        enableAnalytics: true,
        enableErrorRecovery: true,
        sessionEncryption: true,
        validateInputs: true
    },
    
    testing: {
        logLevel: 'error',
        autoReconnect: false,
        enableAnalytics: false,
        sessionEncryption: false
    }
};

/**
 * Merge configurations
 */
function mergeConfig(userConfig = {}, environment = 'production') {
    const envConfig = EnvironmentConfigs[environment] || {};
    
    return {
        ...DefaultConfig,
        ...envConfig,
        ...userConfig,
        // Deep merge nested objects
        autoReply: {
            ...DefaultConfig.autoReply,
            ...envConfig.autoReply,
            ...userConfig.autoReply
        },
        bulkMessaging: {
            ...DefaultConfig.bulkMessaging,
            ...envConfig.bulkMessaging,
            ...userConfig.bulkMessaging
        },
        analytics: {
            ...DefaultConfig.analytics,
            ...envConfig.analytics,
            ...userConfig.analytics
        },
        backup: {
            ...DefaultConfig.backup,
            ...envConfig.backup,
            ...userConfig.backup
        },
        webhook: {
            ...DefaultConfig.webhook,
            ...envConfig.webhook,
            ...userConfig.webhook
        },
        plugins: {
            ...DefaultConfig.plugins,
            ...envConfig.plugins,
            ...userConfig.plugins
        }
    };
}

module.exports = {
    DefaultConfig,
    EnvironmentConfigs,
    mergeConfig
};