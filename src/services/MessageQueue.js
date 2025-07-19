/**
 * ChatPulse - Message Queue Service
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { Logger } = require('../utils/Logger');
const { MessageError } = require('../errors/ChatPulseError');

/**
 * Advanced message queue with priority and retry logic
 */
class MessageQueue {
    constructor(client, options = {}) {
        this.client = client;
        this.options = {
            maxSize: 1000,
            processingInterval: 100,
            maxRetries: 3,
            retryDelay: 1000,
            priorityLevels: 5,
            batchSize: 5,
            ...options
        };

        this.logger = new Logger('MessageQueue');
        this.queues = new Map(); // Priority-based queues
        this.processing = false;
        this.stats = {
            processed: 0,
            failed: 0,
            retried: 0,
            dropped: 0
        };

        this._initializeQueues();
        this._startProcessing();
    }

    /**
     * Add message to queue
     */
    enqueue(message, priority = 3) {
        if (this._getTotalSize() >= this.options.maxSize) {
            this.stats.dropped++;
            throw new MessageError('Message queue is full', 'QUEUE_FULL');
        }

        const queueItem = {
            id: this._generateId(),
            message,
            priority,
            attempts: 0,
            createdAt: Date.now(),
            scheduledAt: message.scheduledAt || Date.now()
        };

        const queue = this.queues.get(priority);
        queue.push(queueItem);

        this.logger.debug(`Message queued with priority ${priority}: ${queueItem.id}`);
        this.client.emit('message_queued', queueItem);

        return queueItem.id;
    }

    /**
     * Schedule message for future delivery
     */
    schedule(message, deliveryTime, priority = 3) {
        const scheduledMessage = {
            ...message,
            scheduledAt: new Date(deliveryTime).getTime()
        };

        return this.enqueue(scheduledMessage, priority);
    }

    /**
     * Remove message from queue
     */
    dequeue(messageId) {
        for (const [priority, queue] of this.queues.entries()) {
            const index = queue.findIndex(item => item.id === messageId);
            if (index !== -1) {
                const removed = queue.splice(index, 1)[0];
                this.logger.debug(`Message dequeued: ${messageId}`);
                return removed;
            }
        }
        return null;
    }

    /**
     * Get queue statistics
     */
    getStats() {
        const queueSizes = {};
        let totalSize = 0;

        for (const [priority, queue] of this.queues.entries()) {
            queueSizes[`priority_${priority}`] = queue.length;
            totalSize += queue.length;
        }

        return {
            ...this.stats,
            queueSizes,
            totalSize,
            processing: this.processing,
            maxSize: this.options.maxSize
        };
    }

    /**
     * Clear all queues
     */
    clear() {
        for (const queue of this.queues.values()) {
            queue.length = 0;
        }
        this.logger.info('All message queues cleared');
    }

    /**
     * Pause queue processing
     */
    pause() {
        this.processing = false;
        this.logger.info('Message queue processing paused');
    }

    /**
     * Resume queue processing
     */
    resume() {
        this.processing = true;
        this.logger.info('Message queue processing resumed');
    }

    /**
     * Initialize priority queues
     */
    _initializeQueues() {
        for (let i = 1; i <= this.options.priorityLevels; i++) {
            this.queues.set(i, []);
        }
    }

    /**
     * Start queue processing
     */
    _startProcessing() {
        this.processing = true;
        
        setInterval(async () => {
            if (this.processing) {
                await this._processQueues();
            }
        }, this.options.processingInterval);
    }

    /**
     * Process queues by priority
     */
    async _processQueues() {
        const now = Date.now();
        let processed = 0;

        // Process queues from highest to lowest priority
        for (let priority = 1; priority <= this.options.priorityLevels; priority++) {
            const queue = this.queues.get(priority);
            
            while (queue.length > 0 && processed < this.options.batchSize) {
                const item = queue[0];
                
                // Check if message is scheduled for future delivery
                if (item.scheduledAt > now) {
                    break;
                }

                // Remove from queue
                queue.shift();
                
                try {
                    await this._processMessage(item);
                    this.stats.processed++;
                    processed++;
                } catch (error) {
                    await this._handleMessageError(item, error);
                }
            }

            if (processed >= this.options.batchSize) {
                break;
            }
        }
    }

    /**
     * Process individual message
     */
    async _processMessage(item) {
        const { message } = item;
        
        this.logger.debug(`Processing message: ${item.id}`);
        
        // Determine message type and call appropriate handler
        switch (message.type) {
            case 'text':
                await this.client.sendMessage(message.chatId, message.text, message.options);
                break;
            case 'media':
                await this.client.sendMedia(message.chatId, message.media, message.options);
                break;
            case 'button':
                await this.client.sendButtonMessage(message.chatId, message.text, message.buttons, message.options);
                break;
            case 'list':
                await this.client.sendListMessage(message.chatId, message.text, message.buttonText, message.sections, message.options);
                break;
            case 'contact':
                await this.client.sendContact(message.chatId, message.contact, message.options);
                break;
            case 'location':
                await this.client.sendLocation(message.chatId, message.latitude, message.longitude, message.description, message.options);
                break;
            case 'poll':
                await this.client.sendPoll(message.chatId, message.question, message.options, message.settings);
                break;
            default:
                throw new MessageError(`Unknown message type: ${message.type}`);
        }

        this.client.emit('message_processed', item);
    }

    /**
     * Handle message processing error
     */
    async _handleMessageError(item, error) {
        item.attempts++;
        
        this.logger.warn(`Message processing failed (attempt ${item.attempts}): ${error.message}`);
        
        if (item.attempts < this.options.maxRetries) {
            // Retry with exponential backoff
            const delay = this.options.retryDelay * Math.pow(2, item.attempts - 1);
            
            setTimeout(() => {
                const queue = this.queues.get(item.priority);
                queue.unshift(item); // Add back to front of queue
            }, delay);
            
            this.stats.retried++;
            this.client.emit('message_retry', item, error);
        } else {
            this.stats.failed++;
            this.client.emit('message_failed', item, error);
            this.logger.error(`Message failed permanently: ${item.id}`);
        }
    }

    /**
     * Get total queue size
     */
    _getTotalSize() {
        let total = 0;
        for (const queue of this.queues.values()) {
            total += queue.length;
        }
        return total;
    }

    /**
     * Generate unique ID
     */
    _generateId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

module.exports = { MessageQueue };