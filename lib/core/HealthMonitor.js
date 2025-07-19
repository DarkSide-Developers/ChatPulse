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
const { TimeUtils } = require('../utils/TimeUtils');

/**
 * Health monitoring system for ChatPulse
 * Monitors system health, performance, and connection status
 */
class HealthMonitor {
    /**
     * Health check types and their configurations
     */
    static healthChecks = {
        connection: {
            name: 'Connection Status',
            interval: 30000, // 30 seconds
            timeout: 10000,  // 10 seconds
            critical: true
        },
        memory: {
            name: 'Memory Usage',
            interval: 60000, // 1 minute
            timeout: 5000,   // 5 seconds
            critical: false
        },
        websocket: {
            name: 'WebSocket Status',
            interval: 30000, // 30 seconds
            timeout: 5000,   // 5 seconds
            critical: false
        },
        session: {
            name: 'Session Health',
            interval: 120000, // 2 minutes
            timeout: 10000,   // 10 seconds
            critical: true
        },
        performance: {
            name: 'Performance Metrics',
            interval: 60000, // 1 minute
            timeout: 5000,   // 5 seconds
            critical: false
        }
    };

    /**
     * Initialize HealthMonitor
     * @param {ChatPulse} client - ChatPulse client instance
     * @param {Object} options - Monitor options
     */
    constructor(client, options = {}) {
        this.client = client;
        this.logger = new Logger('HealthMonitor');
        this.options = {
            enabled: true,
            alertThresholds: {
                memoryUsage: 80, // 80% memory usage
                responseTime: 5000, // 5 seconds
                errorRate: 10 // 10% error rate
            },
            ...options
        };

        this.healthStatus = {
            overall: 'unknown',
            lastCheck: null,
            checks: new Map(),
            metrics: {
                uptime: 0,
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                averageResponseTime: 0,
                memoryUsage: 0,
                cpuUsage: 0
            },
            alerts: []
        };

        this.intervals = new Map();
        this.startTime = Date.now();
        this.requestHistory = [];
        this.responseTimeHistory = [];

        if (this.options.enabled) {
            this._startMonitoring();
        }
    }

    /**
     * Start health monitoring
     */
    start() {
        if (!this.options.enabled) {
            this.options.enabled = true;
            this._startMonitoring();
            this.logger.info('Health monitoring started');
        }
    }

    /**
     * Stop health monitoring
     */
    stop() {
        this.options.enabled = false;
        this._stopMonitoring();
        this.logger.info('Health monitoring stopped');
    }

    /**
     * Get current health status
     * @returns {Object} Health status
     */
    getHealthStatus() {
        this._updateMetrics();
        return {
            ...this.healthStatus,
            uptime: Date.now() - this.startTime,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Perform immediate health check
     * @param {string} checkType - Specific check type (optional)
     * @returns {Promise<Object>} Health check result
     */
    async performHealthCheck(checkType = null) {
        if (checkType) {
            return await this._runHealthCheck(checkType);
        }

        const results = {};
        for (const type of Object.keys(HealthMonitor.healthChecks)) {
            results[type] = await this._runHealthCheck(type);
        }

        this._updateOverallHealth(results);
        return results;
    }

    /**
     * Record request metrics
     * @param {Object} request - Request information
     */
    recordRequest(request) {
        this.healthStatus.metrics.totalRequests++;
        
        if (request.success) {
            this.healthStatus.metrics.successfulRequests++;
        } else {
            this.healthStatus.metrics.failedRequests++;
        }

        // Record response time
        if (request.responseTime) {
            this.responseTimeHistory.push({
                time: Date.now(),
                responseTime: request.responseTime
            });

            // Keep only last 100 response times
            if (this.responseTimeHistory.length > 100) {
                this.responseTimeHistory.shift();
            }

            this._updateAverageResponseTime();
        }

        // Record request history
        this.requestHistory.push({
            timestamp: Date.now(),
            success: request.success,
            operation: request.operation || 'unknown'
        });

        // Keep only last 1000 requests
        if (this.requestHistory.length > 1000) {
            this.requestHistory.shift();
        }
    }

    /**
     * Add custom health check
     * @param {string} name - Check name
     * @param {Function} checkFunction - Check function
     * @param {Object} config - Check configuration
     */
    addHealthCheck(name, checkFunction, config = {}) {
        HealthMonitor.healthChecks[name] = {
            name: config.displayName || name,
            interval: config.interval || 60000,
            timeout: config.timeout || 10000,
            critical: config.critical || false,
            customCheck: checkFunction
        };

        if (this.options.enabled) {
            this._startHealthCheck(name);
        }

        this.logger.info(`Custom health check added: ${name}`);
    }

    /**
     * Remove health check
     * @param {string} name - Check name
     */
    removeHealthCheck(name) {
        if (this.intervals.has(name)) {
            clearInterval(this.intervals.get(name));
            this.intervals.delete(name);
        }

        delete HealthMonitor.healthChecks[name];
        this.healthStatus.checks.delete(name);

        this.logger.info(`Health check removed: ${name}`);
    }

    /**
     * Get performance metrics
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics() {
        const now = Date.now();
        const last24h = now - (24 * 60 * 60 * 1000);
        
        const recent24h = this.requestHistory.filter(req => req.timestamp > last24h);
        const successful24h = recent24h.filter(req => req.success);
        
        return {
            uptime: now - this.startTime,
            totalRequests: this.healthStatus.metrics.totalRequests,
            successRate: this.healthStatus.metrics.totalRequests > 0 
                ? (this.healthStatus.metrics.successfulRequests / this.healthStatus.metrics.totalRequests) * 100 
                : 0,
            averageResponseTime: this.healthStatus.metrics.averageResponseTime,
            requests24h: recent24h.length,
            successRate24h: recent24h.length > 0 ? (successful24h.length / recent24h.length) * 100 : 0,
            memoryUsage: this.healthStatus.metrics.memoryUsage,
            cpuUsage: this.healthStatus.metrics.cpuUsage
        };
    }

    /**
     * Get active alerts
     * @returns {Array} Active alerts
     */
    getActiveAlerts() {
        return this.healthStatus.alerts.filter(alert => alert.active);
    }

    /**
     * Start monitoring all health checks
     * @private
     */
    _startMonitoring() {
        for (const checkType of Object.keys(HealthMonitor.healthChecks)) {
            this._startHealthCheck(checkType);
        }
        this.logger.info('Health monitoring started for all checks');
    }

    /**
     * Stop monitoring all health checks
     * @private
     */
    _stopMonitoring() {
        for (const interval of this.intervals.values()) {
            clearInterval(interval);
        }
        this.intervals.clear();
    }

    /**
     * Start individual health check
     * @param {string} checkType - Check type
     * @private
     */
    _startHealthCheck(checkType) {
        const config = HealthMonitor.healthChecks[checkType];
        if (!config) return;

        const interval = setInterval(async () => {
            await this._runHealthCheck(checkType);
        }, config.interval);

        this.intervals.set(checkType, interval);

        // Run initial check
        setTimeout(() => this._runHealthCheck(checkType), 1000);
    }

    /**
     * Run individual health check
     * @param {string} checkType - Check type
     * @returns {Promise<Object>} Check result
     * @private
     */
    async _runHealthCheck(checkType) {
        const config = HealthMonitor.healthChecks[checkType];
        if (!config) return null;

        const startTime = Date.now();
        let result = {
            type: checkType,
            name: config.name,
            status: 'unknown',
            message: '',
            responseTime: 0,
            timestamp: new Date().toISOString(),
            critical: config.critical
        };

        try {
            // Run check with timeout
            const checkPromise = config.customCheck 
                ? config.customCheck(this.client)
                : this._runBuiltinCheck(checkType);

            const timeoutPromise = TimeUtils.timeout(config.timeout, `Health check timeout: ${checkType}`);
            
            const checkResult = await Promise.race([checkPromise, timeoutPromise]);
            
            result = { ...result, ...checkResult };
            result.status = result.status || 'healthy';
            
        } catch (error) {
            result.status = 'unhealthy';
            result.message = error.message;
            result.error = error;
        }

        result.responseTime = Date.now() - startTime;
        this.healthStatus.checks.set(checkType, result);

        // Check for alerts
        this._checkAlerts(result);

        // Update overall health
        this._updateOverallHealth();

        return result;
    }

    /**
     * Run built-in health check
     * @param {string} checkType - Check type
     * @returns {Promise<Object>} Check result
     * @private
     */
    async _runBuiltinCheck(checkType) {
        switch (checkType) {
            case 'connection':
                return await this._checkConnection();
            case 'memory':
                return await this._checkMemory();
            case 'websocket':
                return await this._checkWebSocket();
            case 'session':
                return await this._checkSession();
            case 'performance':
                return await this._checkPerformance();
            default:
                throw new Error(`Unknown health check type: ${checkType}`);
        }
    }

    /**
     * Check connection health
     * @returns {Promise<Object>} Check result
     * @private
     */
    async _checkConnection() {
        if (!this.client.isConnected) {
            return {
                status: 'unhealthy',
                message: 'Not connected to WhatsApp Web'
            };
        }

        // Try to get chat list to verify connection
        try {
            await this.client.page.evaluate(() => {
                return window.Store && window.Store.Chat;
            });

            return {
                status: 'healthy',
                message: 'Connected to WhatsApp Web'
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                message: 'Connection verification failed'
            };
        }
    }

    /**
     * Check memory usage
     * @returns {Promise<Object>} Check result
     * @private
     */
    async _checkMemory() {
        const memoryUsage = process.memoryUsage();
        const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
        const usagePercent = (usedMB / totalMB) * 100;

        this.healthStatus.metrics.memoryUsage = usagePercent;

        const status = usagePercent > this.options.alertThresholds.memoryUsage ? 'warning' : 'healthy';

        return {
            status: status,
            message: `Memory usage: ${usedMB}MB / ${totalMB}MB (${usagePercent.toFixed(1)}%)`,
            metrics: {
                usedMB: usedMB,
                totalMB: totalMB,
                usagePercent: usagePercent
            }
        };
    }

    /**
     * Check WebSocket health
     * @returns {Promise<Object>} Check result
     * @private
     */
    async _checkWebSocket() {
        if (!this.client.wsHandler) {
            return {
                status: 'warning',
                message: 'WebSocket handler not initialized'
            };
        }

        const wsStatus = this.client.wsHandler.getStatus();
        
        if (wsStatus.connected) {
            return {
                status: 'healthy',
                message: 'WebSocket connected',
                metrics: wsStatus
            };
        } else {
            return {
                status: 'warning',
                message: 'WebSocket disconnected',
                metrics: wsStatus
            };
        }
    }

    /**
     * Check session health
     * @returns {Promise<Object>} Check result
     * @private
     */
    async _checkSession() {
        try {
            const sessionExists = await this.client.sessionManager.sessionExists();
            
            if (sessionExists) {
                const metadata = await this.client.sessionManager.getSessionMetadata();
                return {
                    status: 'healthy',
                    message: 'Session is healthy',
                    metrics: {
                        sessionAge: Date.now() - new Date(metadata.createdAt).getTime()
                    }
                };
            } else {
                return {
                    status: 'warning',
                    message: 'No active session'
                };
            }
        } catch (error) {
            return {
                status: 'unhealthy',
                message: 'Session check failed'
            };
        }
    }

    /**
     * Check performance metrics
     * @returns {Promise<Object>} Check result
     * @private
     */
    async _checkPerformance() {
        const metrics = this.getPerformanceMetrics();
        
        let status = 'healthy';
        let message = 'Performance is good';
        
        if (metrics.averageResponseTime > this.options.alertThresholds.responseTime) {
            status = 'warning';
            message = 'High response times detected';
        }
        
        if (metrics.successRate < (100 - this.options.alertThresholds.errorRate)) {
            status = 'unhealthy';
            message = 'High error rate detected';
        }

        return {
            status: status,
            message: message,
            metrics: metrics
        };
    }

    /**
     * Update overall health status
     * @param {Object} results - Health check results (optional)
     * @private
     */
    _updateOverallHealth(results = null) {
        const checks = results || Object.fromEntries(this.healthStatus.checks);
        
        let overallStatus = 'healthy';
        let criticalIssues = 0;
        let warnings = 0;

        for (const check of Object.values(checks)) {
            if (check.status === 'unhealthy') {
                if (check.critical) {
                    criticalIssues++;
                } else {
                    warnings++;
                }
            } else if (check.status === 'warning') {
                warnings++;
            }
        }

        if (criticalIssues > 0) {
            overallStatus = 'unhealthy';
        } else if (warnings > 0) {
            overallStatus = 'warning';
        }

        this.healthStatus.overall = overallStatus;
        this.healthStatus.lastCheck = new Date().toISOString();
    }

    /**
     * Check for alerts based on health check results
     * @param {Object} result - Health check result
     * @private
     */
    _checkAlerts(result) {
        const alertId = `${result.type}_${result.status}`;
        const existingAlert = this.healthStatus.alerts.find(alert => alert.id === alertId);

        if (result.status === 'unhealthy' || result.status === 'warning') {
            if (!existingAlert) {
                const alert = {
                    id: alertId,
                    type: result.type,
                    severity: result.status,
                    message: result.message,
                    timestamp: result.timestamp,
                    active: true,
                    count: 1
                };

                this.healthStatus.alerts.push(alert);
                this.client.emit('health_alert', alert);
                this.logger.warn(`Health alert: ${alert.message}`);
            } else {
                existingAlert.count++;
                existingAlert.timestamp = result.timestamp;
            }
        } else if (existingAlert && existingAlert.active) {
            // Clear alert if health check is now healthy
            existingAlert.active = false;
            existingAlert.resolvedAt = result.timestamp;
            this.client.emit('health_alert_resolved', existingAlert);
            this.logger.info(`Health alert resolved: ${existingAlert.message}`);
        }
    }

    /**
     * Update metrics
     * @private
     */
    _updateMetrics() {
        this.healthStatus.metrics.uptime = Date.now() - this.startTime;
    }

    /**
     * Update average response time
     * @private
     */
    _updateAverageResponseTime() {
        if (this.responseTimeHistory.length === 0) return;

        const total = this.responseTimeHistory.reduce((sum, entry) => sum + entry.responseTime, 0);
        this.healthStatus.metrics.averageResponseTime = total / this.responseTimeHistory.length;
    }

    /**
     * Cleanup and destroy health monitor
     */
    destroy() {
        this.stop();
        this.healthStatus.checks.clear();
        this.healthStatus.alerts = [];
        this.requestHistory = [];
        this.responseTimeHistory = [];
        this.logger.info('Health monitor destroyed');
    }
}

module.exports = { HealthMonitor };