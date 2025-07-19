/**
 * ChatPulse - Rate Limiting Middleware
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { RateLimitError } = require('../errors/ChatPulseError');
const { Logger } = require('../utils/Logger');

/**
 * Advanced rate limiting system
 */
class RateLimiter {
    constructor(options = {}) {
        this.options = {
            perMinute: 60,
            perHour: 1000,
            perDay: 10000,
            burstLimit: 10,
            windowSize: 60000, // 1 minute
            cleanupInterval: 300000, // 5 minutes
            ...options
        };

        this.logger = new Logger('RateLimiter');
        this.windows = new Map();
        this.burstCounters = new Map();
        this.globalStats = {
            totalRequests: 0,
            blockedRequests: 0,
            startTime: Date.now()
        };

        this._startCleanupTimer();
    }

    /**
     * Check if request is allowed
     */
    checkLimit(identifier, action = 'default') {
        const now = Date.now();
        const key = `${identifier}:${action}`;
        
        // Check burst limit
        if (!this._checkBurstLimit(key, now)) {
            this.globalStats.blockedRequests++;
            throw new RateLimitError('Burst limit exceeded', 'BURST_LIMIT', {
                identifier,
                action,
                limit: this.options.burstLimit,
                retryAfter: 1000
            });
        }

        // Check time-based limits
        const limits = [
            { window: 60000, limit: this.options.perMinute, name: 'minute' },
            { window: 3600000, limit: this.options.perHour, name: 'hour' },
            { window: 86400000, limit: this.options.perDay, name: 'day' }
        ];

        for (const { window, limit, name } of limits) {
            if (!this._checkTimeWindow(key, now, window, limit)) {
                this.globalStats.blockedRequests++;
                throw new RateLimitError(`Rate limit exceeded for ${name}`, 'TIME_LIMIT', {
                    identifier,
                    action,
                    window: name,
                    limit,
                    retryAfter: this._calculateRetryAfter(key, window)
                });
            }
        }

        // Record successful request
        this._recordRequest(key, now);
        this.globalStats.totalRequests++;
        
        return true;
    }

    /**
     * Get current usage for identifier
     */
    getUsage(identifier, action = 'default') {
        const key = `${identifier}:${action}`;
        const now = Date.now();
        
        return {
            minute: this._getWindowCount(key, now, 60000),
            hour: this._getWindowCount(key, now, 3600000),
            day: this._getWindowCount(key, now, 86400000),
            burst: this._getBurstCount(key, now)
        };
    }

    /**
     * Get remaining requests for identifier
     */
    getRemaining(identifier, action = 'default') {
        const usage = this.getUsage(identifier, action);
        
        return {
            minute: Math.max(0, this.options.perMinute - usage.minute),
            hour: Math.max(0, this.options.perHour - usage.hour),
            day: Math.max(0, this.options.perDay - usage.day),
            burst: Math.max(0, this.options.burstLimit - usage.burst)
        };
    }

    /**
     * Reset limits for identifier
     */
    resetLimits(identifier, action = 'default') {
        const key = `${identifier}:${action}`;
        this.windows.delete(key);
        this.burstCounters.delete(key);
        this.logger.info(`Rate limits reset for ${key}`);
    }

    /**
     * Get global statistics
     */
    getGlobalStats() {
        const uptime = Date.now() - this.globalStats.startTime;
        const requestsPerSecond = this.globalStats.totalRequests / (uptime / 1000);
        const blockRate = this.globalStats.blockedRequests / this.globalStats.totalRequests;
        
        return {
            ...this.globalStats,
            uptime,
            requestsPerSecond: parseFloat(requestsPerSecond.toFixed(2)),
            blockRate: parseFloat((blockRate || 0).toFixed(4)),
            activeWindows: this.windows.size,
            activeBurstCounters: this.burstCounters.size
        };
    }

    /**
     * Check burst limit
     */
    _checkBurstLimit(key, now) {
        const burstWindow = 1000; // 1 second
        const burstKey = `${key}:burst`;
        
        if (!this.burstCounters.has(burstKey)) {
            this.burstCounters.set(burstKey, []);
        }
        
        const timestamps = this.burstCounters.get(burstKey);
        
        // Remove old timestamps
        const cutoff = now - burstWindow;
        while (timestamps.length > 0 && timestamps[0] < cutoff) {
            timestamps.shift();
        }
        
        return timestamps.length < this.options.burstLimit;
    }

    /**
     * Check time window limit
     */
    _checkTimeWindow(key, now, windowSize, limit) {
        const windowKey = `${key}:${windowSize}`;
        
        if (!this.windows.has(windowKey)) {
            this.windows.set(windowKey, []);
        }
        
        const timestamps = this.windows.get(windowKey);
        
        // Remove old timestamps
        const cutoff = now - windowSize;
        while (timestamps.length > 0 && timestamps[0] < cutoff) {
            timestamps.shift();
        }
        
        return timestamps.length < limit;
    }

    /**
     * Record a request
     */
    _recordRequest(key, now) {
        // Record in burst counter
        const burstKey = `${key}:burst`;
        if (!this.burstCounters.has(burstKey)) {
            this.burstCounters.set(burstKey, []);
        }
        this.burstCounters.get(burstKey).push(now);
        
        // Record in time windows
        const windows = [60000, 3600000, 86400000];
        for (const windowSize of windows) {
            const windowKey = `${key}:${windowSize}`;
            if (!this.windows.has(windowKey)) {
                this.windows.set(windowKey, []);
            }
            this.windows.get(windowKey).push(now);
        }
    }

    /**
     * Get count for time window
     */
    _getWindowCount(key, now, windowSize) {
        const windowKey = `${key}:${windowSize}`;
        
        if (!this.windows.has(windowKey)) {
            return 0;
        }
        
        const timestamps = this.windows.get(windowKey);
        const cutoff = now - windowSize;
        
        return timestamps.filter(timestamp => timestamp > cutoff).length;
    }

    /**
     * Get burst count
     */
    _getBurstCount(key, now) {
        const burstKey = `${key}:burst`;
        
        if (!this.burstCounters.has(burstKey)) {
            return 0;
        }
        
        const timestamps = this.burstCounters.get(burstKey);
        const cutoff = now - 1000; // 1 second
        
        return timestamps.filter(timestamp => timestamp > cutoff).length;
    }

    /**
     * Calculate retry after time
     */
    _calculateRetryAfter(key, windowSize) {
        const windowKey = `${key}:${windowSize}`;
        
        if (!this.windows.has(windowKey)) {
            return 1000;
        }
        
        const timestamps = this.windows.get(windowKey);
        if (timestamps.length === 0) {
            return 1000;
        }
        
        const oldestTimestamp = timestamps[0];
        const retryAfter = windowSize - (Date.now() - oldestTimestamp);
        
        return Math.max(1000, retryAfter);
    }

    /**
     * Start cleanup timer
     */
    _startCleanupTimer() {
        setInterval(() => {
            this._cleanup();
        }, this.options.cleanupInterval);
    }

    /**
     * Cleanup old data
     */
    _cleanup() {
        const now = Date.now();
        let cleanedWindows = 0;
        let cleanedBursts = 0;
        
        // Cleanup time windows
        for (const [key, timestamps] of this.windows.entries()) {
            const windowSize = parseInt(key.split(':').pop());
            const cutoff = now - windowSize;
            
            const filteredTimestamps = timestamps.filter(timestamp => timestamp > cutoff);
            
            if (filteredTimestamps.length === 0) {
                this.windows.delete(key);
                cleanedWindows++;
            } else {
                this.windows.set(key, filteredTimestamps);
            }
        }
        
        // Cleanup burst counters
        for (const [key, timestamps] of this.burstCounters.entries()) {
            const cutoff = now - 1000; // 1 second
            
            const filteredTimestamps = timestamps.filter(timestamp => timestamp > cutoff);
            
            if (filteredTimestamps.length === 0) {
                this.burstCounters.delete(key);
                cleanedBursts++;
            } else {
                this.burstCounters.set(key, filteredTimestamps);
            }
        }
        
        if (cleanedWindows > 0 || cleanedBursts > 0) {
            this.logger.debug(`Cleanup completed: ${cleanedWindows} windows, ${cleanedBursts} burst counters`);
        }
    }
}

module.exports = { RateLimiter };