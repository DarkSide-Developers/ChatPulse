/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Test Suite for RateLimiter
 */

const { RateLimiter } = require('../../lib/core/RateLimiter');

describe('RateLimiter', () => {
    let rateLimiter;

    beforeEach(() => {
        rateLimiter = new RateLimiter({
            limits: {
                test: { requests: 5, window: 1000 } // 5 requests per second for testing
            }
        });
    });

    afterEach(() => {
        rateLimiter.destroy();
    });

    describe('checkLimit', () => {
        test('should allow requests within limit', async () => {
            const result = await rateLimiter.checkLimit('test', 'user1');
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBeGreaterThan(0);
        });

        test('should block requests exceeding limit', async () => {
            // Consume all tokens
            for (let i = 0; i < 5; i++) {
                await rateLimiter.consume('test', 'user1');
            }

            const result = await rateLimiter.checkLimit('test', 'user1');
            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
        });

        test('should reset after window period', async () => {
            // Consume all tokens
            for (let i = 0; i < 5; i++) {
                await rateLimiter.consume('test', 'user1');
            }

            // Wait for window to reset
            await new Promise(resolve => setTimeout(resolve, 1100));

            const result = await rateLimiter.checkLimit('test', 'user1');
            expect(result.allowed).toBe(true);
        });
    });

    describe('consume', () => {
        test('should consume tokens successfully', async () => {
            const success = await rateLimiter.consume('test', 'user1');
            expect(success).toBe(true);

            const status = rateLimiter.getStatus('test', 'user1');
            expect(status.tokensRemaining).toBe(4);
        });

        test('should fail to consume when limit exceeded', async () => {
            // Consume all tokens
            for (let i = 0; i < 5; i++) {
                await rateLimiter.consume('test', 'user1');
            }

            const success = await rateLimiter.consume('test', 'user1');
            expect(success).toBe(false);
        });
    });

    describe('waitForLimit', () => {
        test('should wait and then allow request', async () => {
            // Consume all tokens
            for (let i = 0; i < 5; i++) {
                await rateLimiter.consume('test', 'user1');
            }

            const startTime = Date.now();
            const success = await rateLimiter.waitForLimit('test', 'user1', 2000);
            const endTime = Date.now();

            expect(success).toBe(true);
            expect(endTime - startTime).toBeGreaterThan(900); // Should wait at least 900ms
        });

        test('should timeout if wait exceeds maxWait', async () => {
            // Consume all tokens
            for (let i = 0; i < 5; i++) {
                await rateLimiter.consume('test', 'user1');
            }

            const success = await rateLimiter.waitForLimit('test', 'user1', 500);
            expect(success).toBe(false);
        });
    });

    describe('reset', () => {
        test('should reset rate limits for specific operation', async () => {
            // Consume all tokens
            for (let i = 0; i < 5; i++) {
                await rateLimiter.consume('test', 'user1');
            }

            rateLimiter.reset('test', 'user1');

            const result = await rateLimiter.checkLimit('test', 'user1');
            expect(result.allowed).toBe(true);
        });
    });

    describe('disabled rate limiter', () => {
        test('should allow all requests when disabled', async () => {
            const disabledLimiter = new RateLimiter({ enabled: false });

            for (let i = 0; i < 100; i++) {
                const result = await disabledLimiter.checkLimit('test', 'user1');
                expect(result.allowed).toBe(true);
            }

            disabledLimiter.destroy();
        });
    });
});