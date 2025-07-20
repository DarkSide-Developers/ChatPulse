/**
 * ChatPulse - Test Example
 * Test ChatPulse functionality
 */

const { ChatPulse } = require('chatpulse');

async function testChatPulse() {
    console.log('🧪 ChatPulse Test Suite\n');
    
    const client = new ChatPulse({
        sessionName: 'test-session',
        logLevel: 'debug'
    });
    
    // Test event handlers
    client.on('ready', () => {
        console.log('✅ Test PASSED - ChatPulse is ready!');
        runTests(client);
    });
    
    client.on('qr_generated', (qrInfo) => {
        console.log('✅ Test PASSED - QR generated successfully');
        console.log(`📱 QR expires in: ${Math.floor((qrInfo.expires - Date.now()) / 1000)}s`);
    });
    
    client.on('authenticated', () => {
        console.log('✅ Test PASSED - Authentication successful');
    });
    
    client.on('connected', () => {
        console.log('✅ Test PASSED - Connection established');
    });
    
    client.on('error', (error) => {
        console.error('❌ Test ERROR:', error.message);
    });
    
    // Start tests
    try {
        console.log('🚀 Starting ChatPulse tests...');
        await client.initialize();
        
        // Test timeout
        setTimeout(() => {
            if (!client.isReady) {
                console.log('⏰ Test INFO - Waiting for QR scan to complete tests');
                console.log('📱 Please scan the QR code to run full tests');
            }
        }, 10000);
        
    } catch (error) {
        console.error('❌ Test FAILED - Initialization error:', error.message);
        process.exit(1);
    }
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Stopping tests...');
        try {
            await client.disconnect();
            console.log('✅ Tests completed');
            process.exit(0);
        } catch (error) {
            console.error('❌ Error during cleanup:', error.message);
            process.exit(1);
        }
    });
}

async function runTests(client) {
    console.log('\n🧪 Running functionality tests...');
    
    try {
        // Test 1: Connection status
        const status = client.getConnectionStatus();
        console.log('✅ Test 1 PASSED - Connection status:', {
            connected: status.connected,
            authenticated: status.authenticated,
            ready: status.ready
        });
        
        // Test 2: Validation
        try {
            client.validator.validate('1234567890@c.us', 'chatId');
            console.log('✅ Test 2 PASSED - Input validation working');
        } catch (error) {
            console.log('❌ Test 2 FAILED - Validation error:', error.message);
        }
        
        // Test 3: Rate limiter
        try {
            client.rateLimiter.checkLimit('test-user', 'test-action');
            console.log('✅ Test 3 PASSED - Rate limiter working');
        } catch (error) {
            console.log('❌ Test 3 FAILED - Rate limiter error:', error.message);
        }
        
        // Test 4: Message formatting
        try {
            const testMessage = client.messageHandler._formatChatId('1234567890');
            if (testMessage === '1234567890@c.us') {
                console.log('✅ Test 4 PASSED - Message formatting working');
            } else {
                console.log('❌ Test 4 FAILED - Message formatting incorrect');
            }
        } catch (error) {
            console.log('❌ Test 4 FAILED - Message formatting error:', error.message);
        }
        
        // Test 5: Session manager
        try {
            const sessionExists = await client.sessionManager.sessionExists();
            console.log('✅ Test 5 PASSED - Session manager working, session exists:', sessionExists);
        } catch (error) {
            console.log('❌ Test 5 FAILED - Session manager error:', error.message);
        }
        
        console.log('\n🎉 Basic functionality tests completed!');
        console.log('📱 Send a test message to verify full functionality');
        
        // Listen for test message
        client.on('message', async (message) => {
            if (message.isFromMe) return;
            
            console.log('✅ Test PASSED - Message received and processed');
            
            try {
                await client.sendMessage(message.from, '✅ Test response: ChatPulse is working perfectly!');
                console.log('✅ Test PASSED - Message sent successfully');
            } catch (error) {
                console.log('❌ Test FAILED - Send message error:', error.message);
            }
        });
        
    } catch (error) {
        console.error('❌ Test suite error:', error.message);
    }
}

// Run tests
if (require.main === module) {
    testChatPulse().catch(console.error);
}

module.exports = testChatPulse;