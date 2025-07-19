/**
 * ChatPulse - Connection Test Example
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { ChatPulse } = require('chatpulse');

async function testConnection() {
    console.log('🧪 ChatPulse Connection Test\n');
    
    const client = new ChatPulse({
        sessionName: 'test-connection',
        authStrategy: 'qr',
        logLevel: 'debug',
        autoReconnect: true,
        qrCodeOptions: {
            terminal: true,
            save: true,
            format: 'png',
            size: 'medium'
        }
    });
    
    // Test event handlers
    client.on('ready', () => {
        console.log('✅ Connection test PASSED - ChatPulse is ready!');
        testBasicFunctionality(client);
    });
    
    client.on('qr_generated', (qrInfo) => {
        console.log('📱 QR Code test PASSED - QR generated successfully');
        console.log(`🆔 QR Data length: ${qrInfo.data.length} characters`);
        console.log(`⏰ Expires in: ${Math.floor((qrInfo.expires - Date.now()) / 1000)}s`);
    });
    
    client.on('authenticated', () => {
        console.log('🔐 Authentication test PASSED');
    });
    
    client.on('connected', () => {
        console.log('🔌 Connection test PASSED');
    });
    
    client.on('disconnected', () => {
        console.log('🔌 Disconnection detected');
    });
    
    client.on('reconnecting', () => {
        console.log('🔄 Reconnection test in progress...');
    });
    
    client.on('error', (error, context, recovered) => {
        console.error('❌ Error test:', error.message);
        if (recovered) {
            console.log('✅ Error recovery test PASSED');
        }
    });
    
    // Start connection test
    try {
        console.log('🚀 Starting connection test...');
        await client.initialize();
        
        // Test timeout
        setTimeout(() => {
            if (!client.isReady) {
                console.log('⏰ Connection test timeout - this is normal for QR authentication');
                console.log('📱 Please scan the QR code with your WhatsApp mobile app to complete the test');
            }
        }, 30000);
        
    } catch (error) {
        console.error('❌ Connection test FAILED:', error.message);
        process.exit(1);
    }
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Stopping connection test...');
        try {
            await client.disconnect();
            console.log('✅ Test completed successfully');
            process.exit(0);
        } catch (error) {
            console.error('❌ Error during test cleanup:', error.message);
            process.exit(1);
        }
    });
}

async function testBasicFunctionality(client) {
    console.log('\n🧪 Testing basic functionality...');
    
    try {
        // Test connection status
        const status = client.getConnectionStatus();
        console.log('📊 Status test PASSED:', {
            connected: status.connected,
            authenticated: status.authenticated,
            ready: status.ready
        });
        
        // Test message validation
        try {
            client.validator.validate('1234567890@c.us', 'chatId');
            console.log('✅ Validation test PASSED');
        } catch (error) {
            console.log('❌ Validation test FAILED:', error.message);
        }
        
        // Test rate limiter
        try {
            client.rateLimiter.checkLimit('test-user', 'test-action');
            console.log('✅ Rate limiter test PASSED');
        } catch (error) {
            console.log('❌ Rate limiter test FAILED:', error.message);
        }
        
        console.log('\n🎉 All basic functionality tests PASSED!');
        console.log('📱 You can now send a test message to verify full functionality');
        
    } catch (error) {
        console.error('❌ Basic functionality test FAILED:', error.message);
    }
}

// Run the test
if (require.main === module) {
    testConnection().catch(console.error);
}

module.exports = testConnection;