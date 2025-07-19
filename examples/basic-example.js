/**
 * ChatPulse - Basic Example
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { ChatPulse } = require('../src/index');

async function basicExample() {
    console.log('🚀 Starting ChatPulse Basic Example...\n');
    
    const client = new ChatPulse({
        sessionName: 'basic-bot',
        authStrategy: 'qr',
        autoReconnect: true,
        logLevel: 'info'
    });
    
    client.on('ready', () => {
        console.log('✅ ChatPulse is ready!');
    });
    
    client.on('qr_generated', (qrInfo) => {
        console.log('📱 QR Code generated! Scan with WhatsApp mobile app.');
    });
    
    client.on('authenticated', () => {
        console.log('🔐 Authentication successful!');
    });
    
    client.on('message', async (message) => {
        try {
            console.log(`📨 Message from ${message.from}: ${message.body}`);
            
            if (message.body === '!ping') {
                await client.sendMessage(message.from, 'Pong! 🏓');
            }
            
            if (message.body === '!help') {
                const helpText = `
🤖 *ChatPulse Bot Commands*

• !ping - Test bot response
• !help - Show this help
• !status - Show bot status

Powered by ChatPulse 2.0 🚀`;
                await client.sendMessage(message.from, helpText);
            }
            
            if (message.body === '!status') {
                const status = client.getConnectionStatus();
                const statusText = `
📊 *Bot Status*

🔌 Connected: ${status.connected ? '✅' : '❌'}
🔐 Authenticated: ${status.authenticated ? '✅' : '❌'}
🚀 Ready: ${status.ready ? '✅' : '❌'}`;
                await client.sendMessage(message.from, statusText);
            }
        } catch (error) {
            console.error('❌ Error handling message:', error.message);
        }
    });
    
    try {
        await client.initialize();
    } catch (error) {
        console.error('❌ Failed to initialize:', error.message);
        process.exit(1);
    }
    
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

if (require.main === module) {
    basicExample().catch(console.error);
}

module.exports = basicExample;