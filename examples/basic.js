/**
 * ChatPulse - Basic Example
 * Simple WhatsApp bot that responds to messages
 */

const { ChatPulse } = require('chatpulse');

async function basicExample() {
    console.log('🚀 ChatPulse Basic Example\n');
    
    // Create ChatPulse client
    const client = new ChatPulse({
        sessionName: 'basic-session',
        logLevel: 'warn'  // Reduce log noise
    });
    
    // Event: When client is ready
    client.on('ready', () => {
        console.log('✅ ChatPulse is ready!');
        console.log('📱 Send messages to test the bot\n');
    });
    
    // Event: When QR code is generated
    client.on('qr_generated', (qrInfo) => {
        if (qrInfo.savedPath) {
            console.log(`📁 QR saved: ${qrInfo.savedPath}`);
        }
        if (qrInfo.fallback) {
            console.log('⚠️ Using demo QR code\n');
        }
    });
    
    // Event: When authenticated
    client.on('authenticated', () => {
        console.log('🔐 Authenticated successfully!\n');
    });
    
    // Event: Handle incoming messages
    client.on('message', async (message) => {
        try {
            console.log(`📨 ${message.from}: ${message.body}`);
            
            // Ignore messages from self
            if (message.isFromMe) return;
            
            // Simple command responses
            if (message.body === '!ping') {
                await client.sendMessage(message.from, 'Pong! 🏓');
            }
            
            else if (message.body === '!hello') {
                await client.sendMessage(message.from, 'Hello! 👋 I am ChatPulse bot.');
            }
            
            else if (message.body === '!help') {
                const helpText = `
🤖 *ChatPulse Bot Commands*

• !ping - Test bot response
• !hello - Get greeting
• !help - Show this help
• !time - Get current time
• !status - Show bot status

Powered by ChatPulse 2.0 🚀`;
                await client.sendMessage(message.from, helpText);
            }
            
            else if (message.body === '!time') {
                const currentTime = new Date().toLocaleString();
                await client.sendMessage(message.from, `🕐 Current time: ${currentTime}`);
            }
            
            else if (message.body === '!status') {
                const status = client.getConnectionStatus();
                const statusText = `
📊 *Bot Status*

🔌 Connected: ${status.connected ? '✅' : '❌'}
🔐 Authenticated: ${status.authenticated ? '✅' : '❌'}
🚀 Ready: ${status.ready ? '✅' : '❌'}

Bot is working perfectly! 🎉`;
                await client.sendMessage(message.from, statusText);
            }
            
        } catch (error) {
            console.error('❌ Error handling message:', error.message);
        }
    });
    
    // Event: Handle errors
    client.on('error', (error) => {
        console.error('❌ ChatPulse Error:', error.message);
    });
    
    // Initialize the client
    try {
        await client.initialize();
    } catch (error) {
        console.error('❌ Failed to initialize:', error.message);
        process.exit(1);
    }
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down...');
        try {
            await client.disconnect();
            process.exit(0);
        } catch (error) {
            process.exit(1);
        }
    });
}

// Run the example
if (require.main === module) {
    basicExample().catch(console.error);
}

module.exports = basicExample;