/**
 * ChatPulse - Enhanced Event Emitter
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { EventEmitter: NodeEventEmitter } = require('events');
const pino = require('pino');

/**
 * Enhanced EventEmitter with better error handling and logging
 */
class EventEmitter extends NodeEventEmitter {
    constructor(options = {}) {
        super();
        
        this.logger = pino({ name: 'EventEmitter' });
        this.options = {
            maxListeners: 100,
            captureRejections: true,
            ...options
        };
        
        this.setMaxListeners(this.options.maxListeners);
        
        // Handle unhandled promise rejections
        if (this.options.captureRejections) {
            this.on('error', (error) => {
                this.logger.error('EventEmitter error:', error);
            });
        }
    }

    /**
     * Enhanced emit with error handling
     */
    emit(eventName, ...args) {
        try {
            this.logger.debug(`Emitting event: ${eventName}`);
            return super.emit(eventName, ...args);
        } catch (error) {
            this.logger.error(`Error emitting event ${eventName}:`, error);
            super.emit('error', error);
            return false;
        }
    }

    /**
     * Safe listener addition with error handling
     */
    on(eventName, listener) {
        try {
            return super.on(eventName, this._wrapListener(listener));
        } catch (error) {
            this.logger.error(`Error adding listener for ${eventName}:`, error);
            throw error;
        }
    }

    /**
     * Safe once listener with error handling
     */
    once(eventName, listener) {
        try {
            return super.once(eventName, this._wrapListener(listener));
        } catch (error) {
            this.logger.error(`Error adding once listener for ${eventName}:`, error);
            throw error;
        }
    }

    /**
     * Wrap listener with error handling
     */
    _wrapListener(listener) {
        return (...args) => {
            try {
                return listener(...args);
            } catch (error) {
                this.logger.error('Listener error:', error);
                this.emit('error', error);
            }
        };
    }

    /**
     * Get event statistics
     */
    getEventStats() {
        const eventNames = this.eventNames();
        const stats = {};
        
        for (const eventName of eventNames) {
            stats[eventName] = this.listenerCount(eventName);
        }
        
        return {
            totalEvents: eventNames.length,
            totalListeners: Object.values(stats).reduce((sum, count) => sum + count, 0),
            eventCounts: stats,
            maxListeners: this.getMaxListeners()
        };
    }
}

module.exports = { EventEmitter };