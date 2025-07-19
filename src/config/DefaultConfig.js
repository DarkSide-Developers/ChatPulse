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
    // Session configuration
    sessionName: 'chatpulse-session',
    userDataDir: './sessions',
    restoreSession: true,
    
    // Authentication configuration
    authStrategy: AuthStrategies.QR,
    authTimeout: 120000, // 2 minutes
    pairingNumber: null,
    
    // Connection configuration
    autoReconnect: true,
    maxReconnectAttempts: 10,
    reconnectInterval: 5000,
    connectionTimeout: 30000,
    heartbeatInterval: 30000,
    
    // Rate limiting
    rateLimitPerMinute: 60,
    rateLimitPerHour: 1000,
    rateLimitPerDay: 10000,
    
    // Logging configuration
    logLevel: 'info',
    logToFile: false,
    logDir: './logs',
    
    // WhatsApp Web configuration
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    whatsappVersion: '2.2412.54',
    baseUrl: 'https://web.whatsapp.com',
    
    // QR code configuration
    qrCodeOptions: {
        terminal: true,
        save: true,
        format: 'png',
        size: 'medium',
        autoRefresh: true,
        refreshInterval: 30000
    },
    
    // Message configuration
    messageRetries: 3,
    messageTimeout: 10000,
    enableMessageQueue: true,
    queueMaxSize: 1000,
    
    // Media configuration
    maxFileSize: 64 * 1024 * 1024, // 64MB
    downloadDir: './downloads',
    tempDir: './temp',
    
    // Advanced features
    enableE2E: false,
    enablePresenceUpdates: true,
    enableReadReceipts: true,
    enableTypingIndicator: true,
    
    // Error handling
    enableErrorRecovery: true,
    errorRetryAttempts: 3,
    errorRetryDelay: 1000,
    
    // Development options
    debug: false,
    verbose: false
};

/**
 * Environment-specific configurations
 */
const EnvironmentConfigs = {
    development: {
        logLevel: 'debug',
        debug: true,
        verbose: true,
        autoReconnect: true,
        qrCodeOptions: {
            ...DefaultConfig.qrCodeOptions,
            terminal: true,
            save: true
        }
    },
    
    production: {
        logLevel: 'info',
        debug: false,
        verbose: false,
        logToFile: true,
        qrCodeOptions: {
            ...DefaultConfig.qrCodeOptions,
            terminal: false,
            save: true
        }
    },
    
    testing: {
        logLevel: 'warn',
        debug: false,
        verbose: false,
        autoReconnect: false,
        authTimeout: 30000,
        qrCodeOptions: {
            ...DefaultConfig.qrCodeOptions,
            terminal: false,
            save: false
        }
    }
};

/**
 * Merge configuration with environment-specific overrides
 */
function mergeConfig(userConfig = {}, environment = 'production') {
    const envConfig = EnvironmentConfigs[environment] || {};
    
    return {
        ...DefaultConfig,
        ...envConfig,
        ...userConfig,
        // Deep merge for nested objects
        qrCodeOptions: {
            ...DefaultConfig.qrCodeOptions,
            ...envConfig.qrCodeOptions,
            ...userConfig.qrCodeOptions
        }
    };
}

/**
 * Validate configuration
 */
function validateConfig(config) {
    const errors = [];
    
    // Required fields
    if (!config.sessionName) {
        errors.push('sessionName is required');
    }
    
    if (!Object.values(AuthStrategies).includes(config.authStrategy)) {
        errors.push(`Invalid authStrategy: ${config.authStrategy}`);
    }
    
    if (config.authStrategy === AuthStrategies.PAIRING && !config.pairingNumber) {
        errors.push('pairingNumber is required for pairing authentication');
    }
    
    // Numeric validations
    if (config.authTimeout < 10000) {
        errors.push('authTimeout must be at least 10 seconds');
    }
    
    if (config.maxReconnectAttempts < 1) {
        errors.push('maxReconnectAttempts must be at least 1');
    }
    
    if (config.reconnectInterval < 1000) {
        errors.push('reconnectInterval must be at least 1 second');
    }
    
    // Rate limiting validations
    if (config.rateLimitPerMinute < 1) {
        errors.push('rateLimitPerMinute must be at least 1');
    }
    
    if (config.rateLimitPerHour < config.rateLimitPerMinute) {
        errors.push('rateLimitPerHour must be greater than rateLimitPerMinute');
    }
    
    if (config.rateLimitPerDay < config.rateLimitPerHour) {
        errors.push('rateLimitPerDay must be greater than rateLimitPerHour');
    }
    
    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
    
    return true;
}

/**
 * Get configuration for specific use case
 */
function getConfigForUseCase(useCase, baseConfig = {}) {
    const useCaseConfigs = {
        'chatbot': {
            enableMessageQueue: true,
            enablePresenceUpdates: false,
            enableReadReceipts: false,
            rateLimitPerMinute: 30,
            qrCodeOptions: {
                terminal: true,
                save: true,
                autoRefresh: true
            }
        },
        
        'business': {
            enableMessageQueue: true,
            enablePresenceUpdates: true,
            enableReadReceipts: true,
            rateLimitPerMinute: 100,
            logToFile: true,
            qrCodeOptions: {
                terminal: false,
                save: true,
                format: 'png'
            }
        },
        
        'automation': {
            enableMessageQueue: true,
            enablePresenceUpdates: false,
            enableReadReceipts: false,
            enableTypingIndicator: false,
            rateLimitPerMinute: 20,
            qrCodeOptions: {
                terminal: false,
                save: true,
                autoRefresh: true
            }
        },
        
        'development': {
            ...EnvironmentConfigs.development,
            enableMessageQueue: false,
            rateLimitPerMinute: 10
        }
    };
    
    const useCaseConfig = useCaseConfigs[useCase] || {};
    
    return mergeConfig({
        ...baseConfig,
        ...useCaseConfig
    });
}

module.exports = {
    DefaultConfig,
    EnvironmentConfigs,
    mergeConfig,
    validateConfig,
    getConfigForUseCase
};