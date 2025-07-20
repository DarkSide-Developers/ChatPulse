/**
 * ChatPulse - Advanced Example
 * Advanced WhatsApp bot with buttons, lists, and media
 */

const { ChatPulse } = require('chatpulse');

async function advancedExample() {
    console.log('🚀 Starting ChatPulse Advanced Example...\n');
    
    // Create ChatPulse client with advanced options
    const client = new ChatPulse({
        sessionName: 'advanced-session',
        logLevel: 'debug',
        autoReconnect: true,
        maxReconnectAttempts: 10,
        qrCodeOptions: {
            terminal: true,
            save: true,
            format: 'png',
            size: 'large'
        }
    });
    
    // Event: When client is ready
    client.on('ready', () => {
        console.log('🎉 ChatPulse Advanced Bot is ready!');
        console.log('🤖 Try sending: !menu, !buttons, !list, !contact');
    });
    
    // Event: QR code generated
    client.on('qr_generated', (qrInfo) => {
        console.log('📱 QR Code generated!');
        console.log('📱 Scan with WhatsApp mobile app\n');
    });
    
    // Event: Authentication successful
    client.on('authenticated', () => {
        console.log('🔐 Authentication successful!');
    });
    
    // Event: Handle incoming messages
    client.on('message', async (message) => {
        try {
            console.log(`📨 Message from ${message.from}: ${message.body}`);
            
            // Ignore own messages
            if (message.isFromMe) return;
            
            const command = message.body.toLowerCase().trim();
            
            switch (command) {
                case '!menu':
                    await sendMainMenu(client, message.from);
                    break;
                    
                case '!buttons':
                    await sendButtonExample(client, message.from);
                    break;
                    
                case '!list':
                    await sendListExample(client, message.from);
                    break;
                    
                case '!contact':
                    await sendContactExample(client, message.from);
                    break;
                    
                case '!location':
                    await sendLocationExample(client, message.from);
                    break;
                    
                case '!poll':
                    await sendPollExample(client, message.from);
                    break;
                    
                case '!status':
                    await sendAdvancedStatus(client, message.from);
                    break;
                    
                default:
                    if (command.startsWith('!echo ')) {
                        const text = message.body.substring(6);
                        await client.sendMessage(message.from, `🔊 Echo: ${text}`);
                    }
            }
        } catch (error) {
            console.error('❌ Error handling message:', error.message);
        }
    });
    
    // Event: Handle button responses
    client.on('button_response', async (response) => {
        console.log('🔘 Button pressed:', response.selectedButtonId);
        
        switch (response.selectedButtonId) {
            case 'btn_help':
                await client.sendMessage(response.from, '📖 Help: Use !menu to see all commands');
                break;
            case 'btn_about':
                await client.sendMessage(response.from, '🤖 ChatPulse v2.0 - Advanced WhatsApp API');
                break;
            case 'btn_contact':
                await sendContactExample(client, response.from);
                break;
        }
    });
    
    // Event: Handle list responses
    client.on('list_response', async (response) => {
        console.log('📋 List item selected:', response.selectedRowId);
        
        switch (response.selectedRowId) {
            case 'feature_buttons':
                await sendButtonExample(client, response.from);
                break;
            case 'feature_media':
                await client.sendMessage(response.from, '📸 Media features coming soon!');
                break;
            case 'feature_polls':
                await sendPollExample(client, response.from);
                break;
        }
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

// Helper functions
async function sendMainMenu(client, chatId) {
    const menuText = `
🤖 *ChatPulse Advanced Bot*

Available commands:
• !menu - Show this menu
• !buttons - Button message example
• !list - List message example
• !contact - Send contact card
• !location - Send location
• !poll - Create a poll
• !status - Advanced status info
• !echo <text> - Echo your message

Powered by ChatPulse 2.0 🚀`;
    
    await client.sendMessage(chatId, menuText);
}

async function sendButtonExample(client, chatId) {
    const buttons = [
        { id: 'btn_help', text: '📖 Help' },
        { id: 'btn_about', text: '🤖 About' },
        { id: 'btn_contact', text: '📞 Contact' }
    ];
    
    await client.sendButtonMessage(
        chatId,
        '🔘 *Button Message Example*\n\nChoose an option below:',
        buttons,
        { footer: 'ChatPulse Button Demo' }
    );
}

async function sendListExample(client, chatId) {
    const sections = [
        {
            title: '🚀 Features',
            rows: [
                { id: 'feature_buttons', title: 'Button Messages', description: 'Interactive button messages' },
                { id: 'feature_media', title: 'Media Messages', description: 'Send images, videos, audio' },
                { id: 'feature_polls', title: 'Poll Messages', description: 'Create interactive polls' }
            ]
        }
    ];
    
    await client.sendListMessage(
        chatId,
        '📋 *List Message Example*\n\nSelect a feature to learn more:',
        'Select Feature',
        sections,
        { footer: 'ChatPulse List Demo' }
    );
}

async function sendContactExample(client, chatId) {
    const contact = {
        name: 'ChatPulse Support',
        number: '+1234567890',
        organization: 'DarkSide Developers'
    };
    
    await client.sendContact(chatId, contact);
    await client.sendMessage(chatId, '📞 Contact card sent! This is how you can share contacts.');
}

async function sendLocationExample(client, chatId) {
    const latitude = 37.7749;
    const longitude = -122.4194;
    const description = 'San Francisco, CA';
    
    await client.sendLocation(chatId, latitude, longitude, description);
    await client.sendMessage(chatId, '📍 Location sent! This is how you can share locations.');
}

async function sendPollExample(client, chatId) {
    const question = 'What\'s your favorite programming language?';
    const options = ['JavaScript', 'Python', 'Java', 'C++'];
    
    await client.sendPoll(chatId, question, options);
    await client.sendMessage(chatId, '📊 Poll created! Vote for your favorite language.');
}

async function sendAdvancedStatus(client, chatId) {
    const status = client.getConnectionStatus();
    const statusText = `
📊 *Advanced Bot Status*

🔌 *Connection*
• Connected: ${status.connected ? '✅' : '❌'}
• Authenticated: ${status.authenticated ? '✅' : '❌'}
• Ready: ${status.ready ? '✅' : '❌'}
• State: ${status.state}

🔄 *Reconnection*
• Attempts: ${status.reconnectAttempts}

🤖 *Bot Info*
• Version: ChatPulse 2.0
• Features: Buttons, Lists, Media, Polls
• Session: Advanced Demo

Powered by ChatPulse 🚀`;
    
    await client.sendMessage(chatId, statusText);
}

// Run the example
if (require.main === module) {
    advancedExample().catch(console.error);
}

module.exports = advancedExample;