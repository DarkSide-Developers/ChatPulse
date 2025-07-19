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
 * Business Handler for WhatsApp Business features
 * Provides catalog, product, and business messaging capabilities
 */
class BusinessHandler {
    /**
     * Initialize BusinessHandler
     * @param {ChatPulse} client - ChatPulse client instance
     */
    constructor(client) {
        this.client = client;
        this.logger = new Logger('BusinessHandler');
    }

    /**
     * Get business profile
     * @param {string} businessId - Business ID
     * @returns {Promise<Object>} Business profile
     */
    async getBusinessProfile(businessId) {
        try {
            const profile = await this.client.page.evaluate(async (bId) => {
                const business = window.Store.BusinessProfile.get(bId);
                if (!business) {
                    throw new Error('Business profile not found');
                }

                return {
                    id: business.id,
                    name: business.name,
                    category: business.category,
                    description: business.description,
                    email: business.email,
                    website: business.website,
                    address: business.address,
                    hours: business.hours,
                    profilePicture: business.profilePicture
                };
            }, businessId);

            return profile;

        } catch (error) {
            this.logger.error('Failed to get business profile:', error);
            throw error;
        }
    }

    /**
     * Get business catalog
     * @param {string} businessId - Business ID
     * @returns {Promise<Object>} Business catalog
     */
    async getBusinessCatalog(businessId) {
        try {
            const catalog = await this.client.page.evaluate(async (bId) => {
                const catalogData = await window.Store.Catalog.getCatalog(bId);
                
                return {
                    id: catalogData.id,
                    products: catalogData.products.map(product => ({
                        id: product.id,
                        name: product.name,
                        description: product.description,
                        price: product.price,
                        currency: product.currency,
                        images: product.images,
                        availability: product.availability,
                        category: product.category
                    })),
                    collections: catalogData.collections || []
                };
            }, businessId);

            return catalog;

        } catch (error) {
            this.logger.error('Failed to get business catalog:', error);
            throw error;
        }
    }

    /**
     * Get product details
     * @param {string} productId - Product ID
     * @param {string} businessId - Business ID
     * @returns {Promise<Object>} Product details
     */
    async getProduct(productId, businessId) {
        try {
            const product = await this.client.page.evaluate(async (pId, bId) => {
                const productData = await window.Store.Catalog.getProduct(pId, bId);
                
                return {
                    id: productData.id,
                    name: productData.name,
                    description: productData.description,
                    price: productData.price,
                    currency: productData.currency,
                    images: productData.images,
                    availability: productData.availability,
                    category: productData.category,
                    retailerId: productData.retailerId,
                    url: productData.url
                };
            }, productId, businessId);

            return product;

        } catch (error) {
            this.logger.error('Failed to get product:', error);
            throw error;
        }
    }

    /**
     * Send catalog message
     * @param {string} chatId - Target chat ID
     * @param {Object} catalog - Catalog information
     * @param {Object} options - Catalog options
     * @returns {Promise<Object>} Message result
     */
    async sendCatalog(chatId, catalog, options = {}) {
        try {
            const catalogData = {
                chatId: this._formatChatId(chatId),
                catalog: {
                    name: catalog.name,
                    products: catalog.products,
                    businessId: catalog.businessId
                },
                options: {
                    caption: options.caption || '',
                    footer: options.footer || ''
                }
            };

            const result = await this.client.page.evaluate(async (data) => {
                const chat = window.Store.Chat.get(data.chatId);
                if (!chat) {
                    throw new Error(`Chat not found: ${data.chatId}`);
                }

                const catalogMessage = {
                    type: 'catalog',
                    catalog: data.catalog,
                    caption: data.options.caption,
                    footer: data.options.footer
                };

                const message = await window.Store.sendMessage(chat, catalogMessage);
                
                return {
                    id: message.id._serialized,
                    timestamp: message.t,
                    type: 'catalog'
                };
            }, catalogData);

            this.logger.info(`Catalog sent to ${chatId}`);
            this.client.emit('catalog_sent', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to send catalog:', error);
            throw error;
        }
    }

    /**
     * Send product list message
     * @param {string} chatId - Target chat ID
     * @param {Object} productList - Product list information
     * @param {Object} options - Product list options
     * @returns {Promise<Object>} Message result
     */
    async sendProductList(chatId, productList, options = {}) {
        try {
            const listData = {
                chatId: this._formatChatId(chatId),
                productList: {
                    header: productList.header,
                    body: productList.body,
                    footer: productList.footer,
                    buttonText: productList.buttonText,
                    products: productList.products,
                    businessId: productList.businessId
                },
                options: options
            };

            const result = await this.client.page.evaluate(async (data) => {
                const chat = window.Store.Chat.get(data.chatId);
                if (!chat) {
                    throw new Error(`Chat not found: ${data.chatId}`);
                }

                const productListMessage = {
                    type: 'product_list',
                    header: data.productList.header,
                    body: data.productList.body,
                    footer: data.productList.footer,
                    buttonText: data.productList.buttonText,
                    products: data.productList.products,
                    businessId: data.productList.businessId
                };

                const message = await window.Store.sendMessage(chat, productListMessage);
                
                return {
                    id: message.id._serialized,
                    timestamp: message.t,
                    type: 'product_list'
                };
            }, listData);

            this.logger.info(`Product list sent to ${chatId}`);
            this.client.emit('product_list_sent', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to send product list:', error);
            throw error;
        }
    }

    /**
     * Send order message
     * @param {string} chatId - Target chat ID
     * @param {Object} order - Order information
     * @param {Object} options - Order options
     * @returns {Promise<Object>} Message result
     */
    async sendOrder(chatId, order, options = {}) {
        try {
            const orderData = {
                chatId: this._formatChatId(chatId),
                order: {
                    orderId: order.id,
                    items: order.items,
                    subtotal: order.subtotal,
                    tax: order.tax || 0,
                    shipping: order.shipping || 0,
                    total: order.total,
                    currency: order.currency,
                    status: order.status || 'pending',
                    businessId: order.businessId
                },
                options: options
            };

            const result = await this.client.page.evaluate(async (data) => {
                const chat = window.Store.Chat.get(data.chatId);
                if (!chat) {
                    throw new Error(`Chat not found: ${data.chatId}`);
                }

                const orderMessage = {
                    type: 'order',
                    order: data.order
                };

                const message = await window.Store.sendMessage(chat, orderMessage);
                
                return {
                    id: message.id._serialized,
                    timestamp: message.t,
                    type: 'order',
                    orderId: data.order.orderId
                };
            }, orderData);

            this.logger.info(`Order sent to ${chatId}: ${order.id}`);
            this.client.emit('order_sent', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to send order:', error);
            throw error;
        }
    }

    /**
     * Update order status
     * @param {string} orderId - Order ID
     * @param {string} status - New order status
     * @param {Object} options - Update options
     * @returns {Promise<Object>} Update result
     */
    async updateOrderStatus(orderId, status, options = {}) {
        try {
            const result = await this.client.page.evaluate(async (oId, newStatus, opts) => {
                const updateResult = await window.Store.Order.updateStatus(oId, newStatus, opts);
                
                return {
                    orderId: oId,
                    status: newStatus,
                    updatedAt: Date.now(),
                    success: updateResult.success
                };
            }, orderId, status, options);

            this.logger.info(`Order status updated: ${orderId} -> ${status}`);
            this.client.emit('order_status_updated', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to update order status:', error);
            throw error;
        }
    }

    /**
     * Send payment request
     * @param {string} chatId - Target chat ID
     * @param {Object} payment - Payment information
     * @param {Object} options - Payment options
     * @returns {Promise<Object>} Message result
     */
    async sendPaymentRequest(chatId, payment, options = {}) {
        try {
            const paymentData = {
                chatId: this._formatChatId(chatId),
                payment: {
                    amount: payment.amount,
                    currency: payment.currency,
                    note: payment.note || '',
                    requestFrom: payment.requestFrom,
                    expiresAt: payment.expiresAt || null
                },
                options: options
            };

            const result = await this.client.page.evaluate(async (data) => {
                const chat = window.Store.Chat.get(data.chatId);
                if (!chat) {
                    throw new Error(`Chat not found: ${data.chatId}`);
                }

                const paymentMessage = {
                    type: 'payment_request',
                    amount: data.payment.amount,
                    currency: data.payment.currency,
                    note: data.payment.note,
                    requestFrom: data.payment.requestFrom,
                    expiresAt: data.payment.expiresAt
                };

                const message = await window.Store.sendMessage(chat, paymentMessage);
                
                return {
                    id: message.id._serialized,
                    timestamp: message.t,
                    type: 'payment_request',
                    amount: data.payment.amount,
                    currency: data.payment.currency
                };
            }, paymentData);

            this.logger.info(`Payment request sent to ${chatId}: ${payment.amount} ${payment.currency}`);
            this.client.emit('payment_request_sent', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to send payment request:', error);
            throw error;
        }
    }

    /**
     * Get business analytics
     * @param {string} businessId - Business ID
     * @param {Object} options - Analytics options
     * @returns {Promise<Object>} Analytics data
     */
    async getBusinessAnalytics(businessId, options = {}) {
        try {
            const analytics = await this.client.page.evaluate(async (bId, opts) => {
                const analyticsData = await window.Store.BusinessAnalytics.getAnalytics(bId, opts);
                
                return {
                    businessId: bId,
                    period: opts.period || '30d',
                    metrics: {
                        messagesSent: analyticsData.messagesSent || 0,
                        messagesReceived: analyticsData.messagesReceived || 0,
                        catalogViews: analyticsData.catalogViews || 0,
                        productViews: analyticsData.productViews || 0,
                        orders: analyticsData.orders || 0,
                        revenue: analyticsData.revenue || 0
                    },
                    topProducts: analyticsData.topProducts || [],
                    customerInsights: analyticsData.customerInsights || {}
                };
            }, businessId, options);

            return analytics;

        } catch (error) {
            this.logger.error('Failed to get business analytics:', error);
            throw error;
        }
    }

    /**
     * Set business hours
     * @param {string} businessId - Business ID
     * @param {Object} hours - Business hours
     * @returns {Promise<boolean>} Update success
     */
    async setBusinessHours(businessId, hours) {
        try {
            const result = await this.client.page.evaluate(async (bId, businessHours) => {
                await window.Store.BusinessProfile.setBusinessHours(bId, businessHours);
                return true;
            }, businessId, hours);

            this.logger.info(`Business hours updated: ${businessId}`);
            this.client.emit('business_hours_updated', { businessId, hours });
            
            return result;

        } catch (error) {
            this.logger.error('Failed to set business hours:', error);
            return false;
        }
    }

    /**
     * Set away message
     * @param {string} businessId - Business ID
     * @param {string} message - Away message
     * @param {Object} options - Away message options
     * @returns {Promise<boolean>} Update success
     */
    async setAwayMessage(businessId, message, options = {}) {
        try {
            const result = await this.client.page.evaluate(async (bId, awayMsg, opts) => {
                await window.Store.BusinessProfile.setAwayMessage(bId, awayMsg, opts);
                return true;
            }, businessId, message, options);

            this.logger.info(`Away message set: ${businessId}`);
            this.client.emit('away_message_set', { businessId, message });
            
            return result;

        } catch (error) {
            this.logger.error('Failed to set away message:', error);
            return false;
        }
    }

    /**
     * Format chat ID
     * @param {string} chatId - Raw chat ID
     * @returns {string} Formatted chat ID
     * @private
     */
    _formatChatId(chatId) {
        let formatted = chatId.replace(/[^\d@-]/g, '');
        
        if (!formatted.includes('@')) {
            if (formatted.includes('-')) {
                formatted += '@g.us';
            } else {
                formatted += '@c.us';
            }
        }
        
        return formatted;
    }
}

module.exports = { BusinessHandler };