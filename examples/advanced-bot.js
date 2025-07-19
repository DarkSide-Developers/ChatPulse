/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { ChatPulse } = require('../lib');
const { MessageFormatter } = require('../lib/utils');
require('dotenv').config();

/**
 * Advanced ChatPulse Bot Example
 * Demonstrates advanced features and modern WhatsApp capabilities
 */

// Initialize ChatPulse with advanced features
const client = new ChatPulse({
    sessionName: 'advanced-bot',
    headless: process.env.HEADLESS === 'true',
    autoReconnect: true,
    reconnectInterval: 30000,
    language: 'en'
});

// Advanced event handlers
client.on('ready', async () => {
    console.log('🚀 Advanced ChatPulse Bot is ready!');
    console.log('🔥 Advanced features enabled:');
    console.log('   • Multi-device support');
    console.log('   • WebSocket real-time updates');
    console.log('   • Advanced message types');
    console.log('   • Business features');
    console.log('   • Group management');
});

client.on('connected', () => {
    console.log('✅ Connected to WhatsApp Web with advanced features');
});

client.on('websocket_connected', () => {
    console.log('🔌 WebSocket connected for real-time updates');
});

client.on('device_linked', (device) => {
    console.log(`📱 New device linked: ${device.name} (${device.platform})`);
});

client.on('message_realtime', (message) => {
    console.log('⚡ Real-time message received:', message.id);
});

client.on('presence_update', (presence) => {
    console.log(`👤 Presence update: ${presence.from} is ${presence.status}`);
});

client.on('typing', (typing) => {
    console.log(`✍️ ${typing.from} is ${typing.state === 'composing' ? 'typing' : 'stopped typing'}`);
});

client.on('message', async (message) => {
    // Ignore messages from self
    if (message.isFromMe) return;
    
    console.log(`📨 Message from ${message.from}: ${message.body}`);
    
    // Advanced command handling
    if (message.body.toLowerCase().startsWith('!poll ')) {
        await handlePollCommand(message);
    } else if (message.body.toLowerCase().startsWith('!location')) {
        await handleLocationCommand(message);
    } else if (message.body.toLowerCase().startsWith('!contact ')) {
        await handleContactCommand(message);
    } else if (message.body.toLowerCase().startsWith('!product ')) {
        await handleProductCommand(message);
    } else if (message.body.toLowerCase().startsWith('!payment ')) {
        await handlePaymentCommand(message);
    } else if (message.body.toLowerCase().startsWith('!group ')) {
        await handleGroupCommand(message);
    } else if (message.body.toLowerCase() === '!features') {
        await showAdvancedFeatures(message);
    } else if (message.body.toLowerCase() === '!demo') {
        await showDemo(message);
    }
});

// Advanced command handlers
async function handlePollCommand(message) {
    try {
        const args = message.body.split(' ').slice(1);
        const question = args.join(' ') || 'What do you think?';
        const options = ['Yes', 'No', 'Maybe'];
        
        await client.messageHandler.sendPoll(
            message.from,
            question,
            options,
            { multipleAnswers: false }
        );
        
        console.log('📊 Poll sent successfully');
    } catch (error) {
        console.error('Failed to send poll:', error);
    }
}

async function handleLocationCommand(message) {
    try {
        // Send a sample location (New York City)
        await client.messageHandler.sendLocation(
            message.from,
            40.7128,
            -74.0060,
            { name: 'New York City', address: 'New York, NY, USA' }
        );
        
        console.log('📍 Location sent successfully');
    } catch (error) {
        console.error('Failed to send location:', error);
    }
}

async function handleContactCommand(message) {
    try {
        const contact = {
            name: 'ChatPulse Support',
            phone: '+1234567890',
            email: 'support@chatpulse.dev',
            organization: 'DarkSide Developer Team'
        };
        
        await client.messageHandler.sendContact(message.from, contact);
        
        console.log('👤 Contact sent successfully');
    } catch (error) {
        console.error('Failed to send contact:', error);
    }
}

async function handleProductCommand(message) {
    try {
        const product = {
            id: 'prod_123',
            businessJid: 'business@c.us',
            title: 'ChatPulse Pro License',
            description: 'Advanced WhatsApp automation features',
            price: 99.99,
            currency: 'USD',
            imageCount: 1
        };
        
        await client.messageHandler.sendProduct(message.from, product);
        
        console.log('🛍️ Product sent successfully');
    } catch (error) {
        console.error('Failed to send product:', error);
    }
}

async function handlePaymentCommand(message) {
    try {
        const payment = {
            amount: 50.00,
            currency: 'USD',
            note: 'Payment for ChatPulse services'
        };
        
        await client.messageHandler.sendPayment(message.from, payment);
        
        console.log('💳 Payment request sent successfully');
    } catch (error) {
        console.error('Failed to send payment request:', error);
    }
}

async function handleGroupCommand(message) {
    try {
        if (!message.isGroup) {
            await client.sendMessage(message.from, '❌ This command only works in groups!');
            return;
        }
        
        const groupInfo = await client.groupHandler.getGroupMetadata(message.from);
        
        const response = MessageFormatter.card({
            title: 'Group Information',
            fields: [
                { name: 'Name', value: groupInfo.name },
                { name: 'Participants', value: groupInfo.participantCount },
                { name: 'Admins', value: groupInfo.adminCount },
                { name: 'Created', value: new Date(groupInfo.createdAt).toLocaleDateString() }
            ]
        });
        
        await client.sendMessage(message.from, response);
        
        console.log('👥 Group info sent successfully');
    } catch (error) {
        console.error('Failed to handle group command:', error);
    }
}

async function showAdvancedFeatures(message) {
    const features = MessageFormatter.multiLine([
        { text: '🔥 ChatPulse Advanced Features', bold: true },
        { text: '' },
        { text: '📊 Interactive Messages:', bold: true },
        { text: '• Polls with multiple options' },
        { text: '• Button messages' },
        { text: '• List messages' },
        { text: '• Product catalogs' },
        { text: '' },
        { text: '📱 Modern WhatsApp Features:', bold: true },
        { text: '• Disappearing messages' },
        { text: '• Message reactions' },
        { text: '• Message editing' },
        { text: '• Message forwarding' },
        { text: '• Live locations' },
        { text: '' },
        { text: '🏢 Business Features:', bold: true },
        { text: '• Product messages' },
        { text: '• Payment requests' },
        { text: '• Order management' },
        { text: '• Business analytics' },
        { text: '' },
        { text: '👥 Group Management:', bold: true },
        { text: '• Advanced admin controls' },
        { text: '• Participant management' },
        { text: '• Group settings' },
        { text: '• Invite link management' },
        { text: '' },
        { text: '🔌 Real-time Features:', bold: true },
        { text: '• WebSocket connections' },
        { text: '• Presence updates' },
        { text: '• Typing indicators' },
        { text: '• Multi-device sync' }
    ]);
    
    await client.sendMessage(message.from, features);
}

async function showDemo(message) {
    try {
        // Send a series of demo messages
        await client.sendMessage(message.from, MessageFormatter.notification(
            'info',
            'ChatPulse Demo',
            'Starting advanced features demonstration...'
        ));
        
        // Wait a bit between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Send formatted message
        const formattedDemo = MessageFormatter.multiLine([
            { text: 'Text Formatting Demo', bold: true },
            { text: 'This is bold text', bold: true },
            { text: 'This is italic text', italic: true },
            { text: 'This is strikethrough text', strikethrough: true },
            { text: 'This is monospace text', monospace: true },
            { text: 'This is inline code', code: true }
        ]);
        
        await client.sendMessage(message.from, formattedDemo);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Send progress bar
        const progressDemo = MessageFormatter.multiLine([
            { text: 'Progress Bar Demo', bold: true },
            { text: MessageFormatter.progressBar(75, 20) },
            { text: 'Loading: 75% complete' }
        ]);
        
        await client.sendMessage(message.from, progressDemo);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Send table
        const tableDemo = MessageFormatter.table(
            ['Feature', 'Status', 'Version'],
            [
                ['Messages', '✅ Active', '2.0'],
                ['Media', '✅ Active', '2.0'],
                ['Groups', '✅ Active', '2.0'],
                ['Business', '✅ Active', '2.0']
            ]
        );
        
        await client.sendMessage(message.from, MessageFormatter.multiLine([
            { text: 'Feature Status Table', bold: true },
            { text: tableDemo, monospace: true }
        ]));
        
        console.log('🎭 Demo completed successfully');
    } catch (error) {
        console.error('Failed to show demo:', error);
    }
}

// Initialize with advanced features
console.log('🔄 Initializing Advanced ChatPulse Bot...');
client.initializeAdvanced({
    multiDevice: true,
    websocket: true,
    strategy: 'auto'
}).catch(error => {
    console.error('❌ Failed to initialize Advanced ChatPulse:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down Advanced ChatPulse Bot...');
    await client.disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down Advanced ChatPulse Bot...');
    await client.disconnect();
    process.exit(0);
});