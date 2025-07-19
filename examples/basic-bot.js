/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { ChatPulse } = require('../src');
require('dotenv').config();

/**
 * Basic ChatPulse Bot Example
 */

// Initialize ChatPulse
const client = new ChatPulse({
    sessionName: 'basic-bot',
    autoReconnect: true
});

// Event handlers
client.on('ready', () => {
    console.log('🚀 ChatPulse Bot is ready!');
    console.log('📱 You can now send messages to your WhatsApp number');
});

client.on('connected', () => {
    console.log('✅ Connected to WhatsApp Web');
});

client.on('disconnected', () => {
    console.log('❌ Disconnected from WhatsApp Web');
});

client.on('qr_generated', (qrInfo) => {
    console.log('📱 QR Code generated! Scan it with your WhatsApp mobile app');
    if (qrInfo.formats.png) {
        console.log(`📄 QR Code saved to: ${qrInfo.formats.png}`);
    }
});

client.on('message', async (message) => {
    // Ignore messages from self
    if (message.isFromMe) return;
    
    console.log(`📨 Message from ${message.from}: ${message.body}`);
    
    // Simple echo functionality
    if (message.body.toLowerCase().startsWith('echo ')) {
        const echoText = message.body.substring(5);
        await client.sendMessage(message.from, `Echo: ${echoText}`);
    }
    
    // Info command
    if (message.body.toLowerCase() === '!info') {
        const chatInfo = await client.getChatInfo(message.from);
        const response = `
📊 *Chat Information*
👤 Name: ${chatInfo.name || 'Unknown'}
🆔 ID: ${chatInfo.id}
👥 Is Group: ${chatInfo.isGroup ? 'Yes' : 'No'}
        `.trim();
        
        await client.sendMessage(message.from, response);
    }
    
    // Help command
    if (message.body.toLowerCase() === '!help') {
        const helpText = `
🤖 *ChatPulse Bot Commands*

📝 *Basic Commands:*
• \`echo <message>\` - Echo your message
• \`!info\` - Get chat information
• \`!help\` - Show this help message

💡 *Tips:*
• Send any message to interact with the bot
• Use echo command to test functionality
        `.trim();
        
        await client.sendMessage(message.from, helpText);
    }
});

client.on('error', (error) => {
    console.error('❌ ChatPulse Error:', error);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down ChatPulse Bot...');
    await client.disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down ChatPulse Bot...');
    await client.disconnect();
    process.exit(0);
});

// Initialize the bot
console.log('🔄 Initializing ChatPulse Bot...');
client.initialize().catch(error => {
    console.error('❌ Failed to initialize ChatPulse:', error);
    process.exit(1);
});