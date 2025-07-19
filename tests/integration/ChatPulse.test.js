/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Integration Test Suite
 */

const { ChatPulse } = require('../../lib');

describe('ChatPulse Integration Tests', () => {
    let client;

    beforeAll(() => {
        client = new ChatPulse({
            sessionName: 'test-session',
            headless: true,
            autoReconnect: false
        });
    });

    afterAll(async () => {
        if (client) {
            await client.disconnect();
        }
    });

    describe('Initialization', () => {
        test('should create ChatPulse instance with default options', () => {
            expect(client).toBeInstanceOf(ChatPulse);
            expect(client.options.sessionName).toBe('test-session');
            expect(client.options.headless).toBe(true);
        });

        test('should have all required handlers initialized', () => {
            expect(client.sessionManager).toBeDefined();
            expect(client.messageHandler).toBeDefined();
            expect(client.pluginManager).toBeDefined();
            expect(client.mediaHandler).toBeDefined();
            expect(client.qrHandler).toBeDefined();
            expect(client.errorHandler).toBeDefined();
            expect(client.healthMonitor).toBeDefined();
        });
    });

    describe('Validation', () => {
        test('should validate chat ID before sending message', async () => {
            await expect(client.sendMessage('invalid-chat-id', 'test'))
                .rejects.toThrow('Invalid chat ID');
        });

        test('should validate message content', async () => {
            await expect(client.sendMessage('1234567890@c.us', ''))
                .rejects.toThrow('Invalid message');
        });

        test('should validate message length', async () => {
            const longMessage = 'a'.repeat(70000);
            await expect(client.sendMessage('1234567890@c.us', longMessage))
                .rejects.toThrow('Invalid message');
        });
    });

    describe('Error Handling', () => {
        test('should handle connection errors gracefully', async () => {
            const errorSpy = jest.spyOn(client.errorHandler, 'handleError');
            
            // Simulate connection error
            const error = new Error('Connection failed');
            await client.errorHandler.handleError(error, { source: 'test' });
            
            expect(errorSpy).toHaveBeenCalledWith(error, { source: 'test' });
        });
    });

    describe('Health Monitoring', () => {
        test('should provide health status', () => {
            const health = client.healthMonitor.getHealthStatus();
            expect(health).toHaveProperty('overall');
            expect(health).toHaveProperty('metrics');
            expect(health).toHaveProperty('uptime');
        });

        test('should record request metrics', () => {
            client.healthMonitor.recordRequest({
                success: true,
                operation: 'test',
                responseTime: 100
            });

            const metrics = client.healthMonitor.getPerformanceMetrics();
            expect(metrics.totalRequests).toBeGreaterThan(0);
        });
    });

    describe('Session Management', () => {
        test('should create session directory', async () => {
            const created = await client.sessionManager.createSession();
            expect(created).toBe(true);
        });

        test('should check session existence', async () => {
            const exists = await client.sessionManager.sessionExists();
            expect(typeof exists).toBe('boolean');
        });
    });

    describe('Plugin System', () => {
        test('should load plugins', async () => {
            const loadedCount = await client.pluginManager.loadPlugins();
            expect(typeof loadedCount).toBe('number');
        });

        test('should get available commands', () => {
            const commands = client.pluginManager.getAvailableCommands();
            expect(Array.isArray(commands)).toBe(true);
        });
    });
});