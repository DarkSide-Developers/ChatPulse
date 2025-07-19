/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { Logger } = require('../utils/Logger');

/**
 * Enhanced EventEmitter with advanced features
 * Provides event handling with priorities, namespaces, and middleware support
 */
class EventEmitter {
    /**
     * Initialize EventEmitter
     */
    constructor() {
        this.events = new Map();
        this.middleware = [];
        this.maxListeners = 100;
        this.logger = new Logger('EventEmitter');
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} listener - Event listener function
     * @param {Object} options - Listener options
     * @param {number} options.priority - Listener priority (higher = earlier execution)
     * @param {boolean} options.once - Execute only once
     * @param {string} options.namespace - Event namespace
     * @returns {EventEmitter} This instance for chaining
     */
    on(event, listener, options = {}) {
        if (typeof listener !== 'function') {
            throw new TypeError('Listener must be a function');
        }

        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        const listeners = this.events.get(event);
        
        if (listeners.length >= this.maxListeners) {
            this.logger.warn(`Maximum listeners (${this.maxListeners}) exceeded for event: ${event}`);
        }

        const listenerData = {
            fn: listener,
            priority: options.priority || 0,
            once: options.once || false,
            namespace: options.namespace || null,
            id: this._generateListenerId()
        };

        listeners.push(listenerData);
        
        // Sort by priority (higher priority first)
        listeners.sort((a, b) => b.priority - a.priority);

        this.logger.debug(`Listener added for event: ${event} (priority: ${listenerData.priority})`);
        
        return this;
    }

    /**
     * Add one-time event listener
     * @param {string} event - Event name
     * @param {Function} listener - Event listener function
     * @param {Object} options - Listener options
     * @returns {EventEmitter} This instance for chaining
     */
    once(event, listener, options = {}) {
        return this.on(event, listener, { ...options, once: true });
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} listener - Event listener function to remove
     * @returns {EventEmitter} This instance for chaining
     */
    off(event, listener) {
        if (!this.events.has(event)) {
            return this;
        }

        const listeners = this.events.get(event);
        const index = listeners.findIndex(l => l.fn === listener);
        
        if (index !== -1) {
            listeners.splice(index, 1);
            this.logger.debug(`Listener removed for event: ${event}`);
            
            if (listeners.length === 0) {
                this.events.delete(event);
            }
        }

        return this;
    }

    /**
     * Remove all listeners for an event or namespace
     * @param {string} event - Event name (optional)
     * @param {string} namespace - Namespace to remove (optional)
     * @returns {EventEmitter} This instance for chaining
     */
    removeAllListeners(event = null, namespace = null) {
        if (event && namespace) {
            // Remove listeners for specific event and namespace
            if (this.events.has(event)) {
                const listeners = this.events.get(event);
                const filtered = listeners.filter(l => l.namespace !== namespace);
                
                if (filtered.length === 0) {
                    this.events.delete(event);
                } else {
                    this.events.set(event, filtered);
                }
            }
        } else if (event) {
            // Remove all listeners for specific event
            this.events.delete(event);
            this.logger.debug(`All listeners removed for event: ${event}`);
        } else if (namespace) {
            // Remove all listeners for specific namespace
            for (const [eventName, listeners] of this.events.entries()) {
                const filtered = listeners.filter(l => l.namespace !== namespace);
                
                if (filtered.length === 0) {
                    this.events.delete(eventName);
                } else {
                    this.events.set(eventName, filtered);
                }
            }
            this.logger.debug(`All listeners removed for namespace: ${namespace}`);
        } else {
            // Remove all listeners
            this.events.clear();
            this.logger.debug('All listeners removed');
        }

        return this;
    }

    /**
     * Emit event to all listeners
     * @param {string} event - Event name
     * @param {...*} args - Arguments to pass to listeners
     * @returns {boolean} True if event had listeners
     */
    emit(event, ...args) {
        if (!this.events.has(event)) {
            return false;
        }

        const listeners = this.events.get(event).slice(); // Copy array to avoid modification during iteration
        let hasListeners = listeners.length > 0;

        // Apply middleware
        const eventData = {
            event: event,
            args: args,
            timestamp: Date.now(),
            preventDefault: false
        };

        for (const middleware of this.middleware) {
            try {
                middleware(eventData);
                if (eventData.preventDefault) {
                    this.logger.debug(`Event prevented by middleware: ${event}`);
                    return hasListeners;
                }
            } catch (error) {
                this.logger.error('Middleware error:', error);
            }
        }

        // Execute listeners
        const toRemove = [];
        
        for (let i = 0; i < listeners.length; i++) {
            const listener = listeners[i];
            
            try {
                listener.fn.apply(this, eventData.args);
                
                if (listener.once) {
                    toRemove.push(listener);
                }
            } catch (error) {
                this.logger.error(`Error in event listener for ${event}:`, error);
            }
        }

        // Remove one-time listeners
        if (toRemove.length > 0) {
            const remainingListeners = this.events.get(event).filter(l => !toRemove.includes(l));
            
            if (remainingListeners.length === 0) {
                this.events.delete(event);
            } else {
                this.events.set(event, remainingListeners);
            }
        }

        this.logger.debug(`Event emitted: ${event} (${listeners.length} listeners)`);
        
        return hasListeners;
    }

    /**
     * Add middleware function
     * @param {Function} middleware - Middleware function
     * @returns {EventEmitter} This instance for chaining
     */
    use(middleware) {
        if (typeof middleware !== 'function') {
            throw new TypeError('Middleware must be a function');
        }

        this.middleware.push(middleware);
        this.logger.debug('Middleware added');
        
        return this;
    }

    /**
     * Get listener count for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    listenerCount(event) {
        return this.events.has(event) ? this.events.get(event).length : 0;
    }

    /**
     * Get all event names
     * @returns {Array} Array of event names
     */
    eventNames() {
        return Array.from(this.events.keys());
    }

    /**
     * Get listeners for an event
     * @param {string} event - Event name
     * @returns {Array} Array of listener functions
     */
    listeners(event) {
        if (!this.events.has(event)) {
            return [];
        }

        return this.events.get(event).map(l => l.fn);
    }

    /**
     * Set maximum number of listeners per event
     * @param {number} max - Maximum number of listeners
     * @returns {EventEmitter} This instance for chaining
     */
    setMaxListeners(max) {
        if (typeof max !== 'number' || max < 0) {
            throw new TypeError('Max listeners must be a non-negative number');
        }

        this.maxListeners = max;
        return this;
    }

    /**
     * Get maximum number of listeners
     * @returns {number} Maximum number of listeners
     */
    getMaxListeners() {
        return this.maxListeners;
    }

    /**
     * Create a promise that resolves when an event is emitted
     * @param {string} event - Event name
     * @param {number} timeout - Timeout in milliseconds (optional)
     * @returns {Promise} Promise that resolves with event arguments
     */
    waitFor(event, timeout = null) {
        return new Promise((resolve, reject) => {
            let timeoutId = null;
            
            const listener = (...args) => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                resolve(args);
            };

            this.once(event, listener);

            if (timeout) {
                timeoutId = setTimeout(() => {
                    this.off(event, listener);
                    reject(new Error(`Event timeout: ${event}`));
                }, timeout);
            }
        });
    }

    /**
     * Generate unique listener ID
     * @returns {string} Unique ID
     * @private
     */
    _generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

module.exports = { EventEmitter };