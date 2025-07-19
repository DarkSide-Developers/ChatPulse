/**
 * ChatPulse - Basic Usage Example
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { ChatPulse } = require('chatpulse');

async function basicExample() {
    console.log('🚀 Starting ChatPulse Basic Example...\n');
    
    // Initialize ChatPulse with basic configuration
    const client = new ChatPulse({
        sessionName: 'basic-bot',
        authStrategy: 'qr', // Use QR code authentication
        autoReconnect: true,
        logLevel: 'info'
    });
    
    // Event handlers
    client.on('ready', () => {
        console.log('✅ ChatPulse is ready! You can now send messages.');
    });
    
    client.on('qr_generated', (qrInfo) => {
        console.log('📱 QR Code generated! Scan it with your WhatsApp mobile app.');
        console.log(`⏰ QR Code expires at: ${new Date(qrInfo.expires).toLocaleTimeString()}`);
    });
    
    client.on('authenticated', () => {
        console.log('🔐 Authentication successful!');
    });
    
    client.on('disconnected', () => {
        console.log('🔌 Disconnected from WhatsApp Web');
    });
    
    client.on('reconnecting', () => {
        console.log('🔄 Reconnecting to WhatsApp Web...');
    });
    
    client.on('error', (error) => {
        console.error('❌ Error:', error.message);
    });
    
    // Handle incoming messages
    client.on('message', async (message) => {
        try {
            console.log(`📨 Message from ${message.from}: ${message.body}`);
            
            // Simple command handling
            if (message.body === '!ping') {
                await client.sendMessage(message.from, 'Pong! 🏓');
                console.log('✅ Sent pong response');
            }
            
            if (message.body === '!help') {
                const helpText = `
🤖 *ChatPulse Bot Commands*

• !ping - Test bot response
• !help - Show this help message
• !status - Show bot status
• !time - Get current time

Powered by ChatPulse 2.0 🚀
                `;
                await client.sendMessage(message.from, helpText);
                console.log('✅ Sent help message');
            }
            
            if (message.body === '!status') {
                const status = client.getConnectionStatus();
                const statusText = `
📊 *Bot Status*

🔌 Connected: ${status.connected ? '✅' : '❌'}
🔐 Authenticated: ${status.authenticated ? '✅' : '❌'}
🚀 Ready: ${status.ready ? '✅' : '❌'}
⏱️ Uptime: ${Math.floor(status.uptime / 1000)}s
🔄 Reconnect Attempts: ${status.reconnectAttempts}
                `;
                await client.sendMessage(message.from, statusText);
                console.log('✅ Sent status message');
            }
            
            if (message.body === '!time') {
                const timeText = `🕐 Current time: ${new Date().toLocaleString()}`;
                await client.sendMessage(message.from, timeText);
                console.log('✅ Sent time message');
            }
            
        } catch (error) {
            console.error('❌ Error handling message:', error.message);
        }
    });
    
    // Handle button responses
    client.on('button_response', async (message) => {
        console.log(`🔘 Button pressed: ${message.selectedButtonId}`);
        
        try {
            await client.sendMessage(message.from, `You pressed: ${message.selectedButtonId}`);
        } catch (error) {
            console.error('❌ Error handling button response:', error.message);
        }
    });
    
    // Initialize the client
    try {
        await client.initialize();
        console.log('🎉 ChatPulse initialized successfully!');
    } catch (error) {
        console.error('❌ Failed to initialize ChatPulse:', error.message);
        process.exit(1);
    }
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down gracefully...');
        try {
            await client.disconnect();
            console.log('✅ Disconnected successfully');
            process.exit(0);
        } catch (error) {
            console.error('❌ Error during shutdown:', error.message);
            process.exit(1);
        }
    });
}

// Run the example
if (require.main === module) {
    basicExample().catch(console.error);
}

module.exports = basicExample;