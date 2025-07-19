/**
 * ChatPulse - Default Configuration
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const path = require('path');
const { AuthStrategies } = require('../types');

/**
 * Default configuration for ChatPulse
 */
const DefaultConfig = {
    // Session configuration
    sessionName: 'default',
    userDataDir: './sessions',
    restoreSession: true,
    
    // Authentication configuration
    authStrategy: AuthStrategies.QR,
    authTimeout: 120000, // 2 minutes
    pairingNumber: null,
    email: null,
    phoneNumber: null,
    deviceInfo: null,
    
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
    burstLimit: 10,
    enableDistributedRateLimit: false,
    
    // Message queue
    queueMaxSize: 1000,
    queueProcessingInterval: 100,
    enableQueuePersistence: false,
    
    // QR code options
    qrCodeOptions: {
        terminal: true,
        save: true,
        format: 'png',
        size: 'medium',
        autoRefresh: true,
        refreshInterval: 30000
    },
    
    // Logging
    logLevel: 'info',
    enableFileLogging: false,
    logDir: './logs',
    
    // Security
    enableEncryption: true,
    encryptionAlgorithm: 'aes-256-gcm',
    enableInputValidation: true,
    enableRateLimiting: true,
    
    // Performance
    enableMessageQueue: true,
    enableCaching: true,
    cacheSize: 1000,
    enableCompression: true,
    
    // Features
    enablePresenceUpdates: true,
    enableReadReceipts: true,
    enableTypingIndicator: true,
    enableMediaDownload: true,
    enableGroupManagement: true,
    
    // Advanced features
    enableAdvancedAuth: true,
    enableMultiDevice: true,
    enableBiometric: false,
    enableBackupCodes: true,
    
    // WebSocket configuration
    wsOptions: {
        handshakeTimeout: 30000,
        perMessageDeflate: true,
        maxPayload: 100 * 1024 * 1024, // 100MB
        clientTracking: false
    },
    
    // Media configuration
    mediaOptions: {
        maxFileSize: 64 * 1024 * 1024, // 64MB
        enableThumbnails: true,
        enableCompression: true,
        supportedFormats: {
            image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            video: ['mp4', 'avi', 'mov', 'mkv', 'webm'],
            audio: ['mp3', 'wav', 'ogg', 'aac', 'm4a'],
            document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt']
        }
    },
    
    // Error handling
    errorHandling: {
        enableAutoRecovery: true,
        maxErrorQueueSize: 100,
        errorRetryAttempts: 3,
        errorRetryDelay: 1000
    },
    
    // Development options
    development: {
        enableDebugMode: false,
        enableVerboseLogging: false,
        enablePerformanceMonitoring: false,
        enableMemoryMonitoring: false
    }
};

/**
 * Environment-specific configurations
 */
const EnvironmentConfigs = {
    development: {
        logLevel: 'debug',
        enableFileLogging: true,
        development: {
            enableDebugMode: true,
            enableVerboseLogging: true,
            enablePerformanceMonitoring: true,
            enableMemoryMonitoring: true
        }
    },
    
    production: {
        logLevel: 'warn',
        enableFileLogging: true,
        autoReconnect: true,
        maxReconnectAttempts: 20,
        errorHandling: {
            enableAutoRecovery: true,
            maxErrorQueueSize: 500,
            errorRetryAttempts: 5,
            errorRetryDelay: 2000
        }
    },
    
    testing: {
        logLevel: 'error',
        enableFileLogging: false,
        autoReconnect: false,
        authTimeout: 10000,
        connectionTimeout: 10000
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
        
        // Deep merge nested objects
        qrCodeOptions: {
            ...DefaultConfig.qrCodeOptions,
            ...envConfig.qrCodeOptions,
            ...userConfig.qrCodeOptions
        },
        
        wsOptions: {
            ...DefaultConfig.wsOptions,
            ...envConfig.wsOptions,
            ...userConfig.wsOptions
        },
        
        mediaOptions: {
            ...DefaultConfig.mediaOptions,
            ...envConfig.mediaOptions,
            ...userConfig.mediaOptions,
            supportedFormats: {
                ...DefaultConfig.mediaOptions.supportedFormats,
                ...envConfig.mediaOptions?.supportedFormats,
                ...userConfig.mediaOptions?.supportedFormats
            }
        },
        
        errorHandling: {
            ...DefaultConfig.errorHandling,
            ...envConfig.errorHandling,
            ...userConfig.errorHandling
        },
        
        development: {
            ...DefaultConfig.development,
            ...envConfig.development,
            ...userConfig.development
        }
    };
}

/**
 * Validate configuration
 */
function validateConfig(config) {
    const errors = [];
    
    // Required fields
    if (!config.sessionName || typeof config.sessionName !== 'string') {
        errors.push('sessionName must be a non-empty string');
    }
    
    if (!config.userDataDir || typeof config.userDataDir !== 'string') {
        errors.push('userDataDir must be a non-empty string');
    }
    
    // Validate auth strategy
    const validAuthStrategies = Object.values(AuthStrategies);
    if (!validAuthStrategies.includes(config.authStrategy)) {
        errors.push(`authStrategy must be one of: ${validAuthStrategies.join(', ')}`);
    }
    
    // Validate timeouts
    if (config.authTimeout && (typeof config.authTimeout !== 'number' || config.authTimeout < 1000)) {
        errors.push('authTimeout must be a number >= 1000');
    }
    
    if (config.connectionTimeout && (typeof config.connectionTimeout !== 'number' || config.connectionTimeout < 1000)) {
        errors.push('connectionTimeout must be a number >= 1000');
    }
    
    // Validate rate limits
    if (config.rateLimitPerMinute && (typeof config.rateLimitPerMinute !== 'number' || config.rateLimitPerMinute < 1)) {
        errors.push('rateLimitPerMinute must be a positive number');
    }
    
    // Validate log level
    const validLogLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    if (config.logLevel && !validLogLevels.includes(config.logLevel)) {
        errors.push(`logLevel must be one of: ${validLogLevels.join(', ')}`);
    }
    
    // Validate QR options
    if (config.qrCodeOptions) {
        const validFormats = ['png', 'jpg', 'jpeg', 'svg'];
        if (config.qrCodeOptions.format && !validFormats.includes(config.qrCodeOptions.format)) {
            errors.push(`qrCodeOptions.format must be one of: ${validFormats.join(', ')}`);
        }
        
        const validSizes = ['small', 'medium', 'large', 'xlarge'];
        if (config.qrCodeOptions.size && !validSizes.includes(config.qrCodeOptions.size)) {
            errors.push(`qrCodeOptions.size must be one of: ${validSizes.join(', ')}`);
        }
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
        chatbot: {
            enablePresenceUpdates: false,
            enableReadReceipts: false,
            enableTypingIndicator: true,
            rateLimitPerMinute: 30,
            qrCodeOptions: {
                terminal: true,
                save: false
            }
        },
        
        business: {
            enablePresenceUpdates: true,
            enableReadReceipts: true,
            enableGroupManagement: true,
            rateLimitPerMinute: 100,
            enableAdvancedAuth: true,
            enableMultiDevice: true
        },
        
        automation: {
            enablePresenceUpdates: false,
            enableReadReceipts: false,
            enableTypingIndicator: false,
            autoReconnect: true,
            maxReconnectAttempts: 50,
            enableQueuePersistence: true
        },
        
        development: {
            logLevel: 'debug',
            enableFileLogging: true,
            development: {
                enableDebugMode: true,
                enableVerboseLogging: true,
                enablePerformanceMonitoring: true
            }
        }
    };
    
    const useCaseConfig = useCaseConfigs[useCase] || {};
    return mergeConfig({ ...baseConfig, ...useCaseConfig });
}

module.exports = {
    DefaultConfig,
    EnvironmentConfigs,
    mergeConfig,
    validateConfig,
    getConfigForUseCase
};