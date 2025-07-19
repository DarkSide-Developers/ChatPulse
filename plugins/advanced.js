/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { MessageFormatter } = require('../lib/utils');

/**
 * Advanced Plugin - Demonstrates modern WhatsApp features
 * Showcases polls, reactions, ephemeral messages, and more
 */
class AdvancedPlugin {
    constructor(client) {
        this.client = client;
        this.name = 'advanced';
        this.version = '2.0.0';
        this.description = 'Advanced WhatsApp features and modern message types';
        this.author = 'DarkWinzo';
        
        this.commands = [
            {
                name: 'poll',
                description: 'Create a poll with options',
                usage: '!poll <question> | <option1> | <option2> | ...',
                handler: this.handlePoll
            },
            {
                name: 'ephemeral',
                description: 'Send disappearing message',
                usage: '!ephemeral <duration> <message>',
                aliases: ['disappear'],
                handler: this.handleEphemeral
            },
            {
                name: 'react',
                description: 'React to a message',
                usage: '!react <emoji> (reply to a message)',
                handler: this.handleReact
            },
            {
                name: 'edit',
                description: 'Edit a message',
                usage: '!edit <new text> (reply to your message)',
                handler: this.handleEdit
            },
            {
                name: 'forward',
                description: 'Forward a message',
                usage: '!forward <chat_id> (reply to a message)',
                handler: this.handleForward
            },
            {
                name: 'location',
                description: 'Send location',
                usage: '!location <lat> <lng> [name]',
                handler: this.handleLocation
            },
            {
                name: 'contact',
                description: 'Send contact card',
                usage: '!contact <name> <phone> [email]',
                handler: this.handleContact
            },
            {
                name: 'typing',
                description: 'Send typing indicator',
                usage: '!typing [duration]',
                handler: this.handleTyping
            },
            {
                name: 'presence',
                description: 'Subscribe to presence updates',
                usage: '!presence <on|off>',
                handler: this.handlePresence
            }
        ];
    }
    
    async handlePoll(context) {
        const { args, reply, message } = context;
        
        if (args.length === 0) {
            return reply('❌ Please provide a poll question and options.\nUsage: !poll <question> | <option1> | <option2> | ...');
        }
        
        const pollText = args.join(' ');
        const parts = pollText.split('|').map(part => part.trim());
        
        if (parts.length < 3) {
            return reply('❌ Please provide at least a question and 2 options separated by |');
        }
        
        const question = parts[0];
        const options = parts.slice(1);
        
        if (options.length > 12) {
            return reply('❌ Maximum 12 options allowed for polls');
        }
        
        try {
            await this.client.messageHandler.sendPoll(
                message.from,
                question,
                options,
                { multipleAnswers: false }
            );
            
            await reply('📊 Poll created successfully!');
        } catch (error) {
            await reply('❌ Failed to create poll. This feature may not be available.');
        }
    }
    
    async handleEphemeral(context) {
        const { args, reply, message } = context;
        
        if (args.length < 2) {
            return reply('❌ Usage: !ephemeral <duration> <message>\nDuration: 1d, 7d, 90d');
        }
        
        const durationStr = args[0];
        const messageText = args.slice(1).join(' ');
        
        // Parse duration
        const durations = {
            '1d': 86400,      // 1 day
            '7d': 604800,     // 7 days
            '90d': 7776000    // 90 days
        };
        
        const duration = durations[durationStr];
        if (!duration) {
            return reply('❌ Invalid duration. Use: 1d, 7d, or 90d');
        }
        
        try {
            await this.client.messageHandler.sendEphemeralMessage(
                message.from,
                messageText,
                duration
            );
            
            await reply(`⏰ Disappearing message sent (expires in ${durationStr})`);
        } catch (error) {
            await reply('❌ Failed to send disappearing message.');
        }
    }
    
    async handleReact(context) {
        const { args, reply, message } = context;
        
        if (!message.quotedMessage) {
            return reply('❌ Please reply to a message to react to it.');
        }
        
        const emoji = args[0] || '👍';
        
        try {
            await this.client.messageHandler.reactToMessage(
                message.quotedMessage.id,
                emoji
            );
            
            await reply(`${emoji} Reaction sent!`);
        } catch (error) {
            await reply('❌ Failed to send reaction.');
        }
    }
    
    async handleEdit(context) {
        const { args, reply, message } = context;
        
        if (!message.quotedMessage) {
            return reply('❌ Please reply to your message to edit it.');
        }
        
        if (args.length === 0) {
            return reply('❌ Please provide the new message text.');
        }
        
        const newText = args.join(' ');
        
        try {
            await this.client.messageHandler.editMessage(
                message.quotedMessage.id,
                newText
            );
            
            await reply('✏️ Message edited successfully!');
        } catch (error) {
            await reply('❌ Failed to edit message. You can only edit your own recent messages.');
        }
    }
    
    async handleForward(context) {
        const { args, reply, message } = context;
        
        if (!message.quotedMessage) {
            return reply('❌ Please reply to a message to forward it.');
        }
        
        if (args.length === 0) {
            return reply('❌ Please provide the target chat ID or phone number.');
        }
        
        const targetChat = args[0];
        
        try {
            await this.client.messageHandler.forwardMessage(
                message.quotedMessage.id,
                targetChat
            );
            
            await reply('📤 Message forwarded successfully!');
        } catch (error) {
            await reply('❌ Failed to forward message. Check the target chat ID.');
        }
    }
    
    async handleLocation(context) {
        const { args, reply, message } = context;
        
        if (args.length < 2) {
            return reply('❌ Usage: !location <latitude> <longitude> [name]');
        }
        
        const latitude = parseFloat(args[0]);
        const longitude = parseFloat(args[1]);
        const name = args.slice(2).join(' ') || 'Shared Location';
        
        if (isNaN(latitude) || isNaN(longitude)) {
            return reply('❌ Invalid coordinates. Please provide valid latitude and longitude.');
        }
        
        try {
            await this.client.messageHandler.sendLocation(
                message.from,
                latitude,
                longitude,
                { name: name }
            );
            
            await reply('📍 Location sent successfully!');
        } catch (error) {
            await reply('❌ Failed to send location.');
        }
    }
    
    async handleContact(context) {
        const { args, reply, message } = context;
        
        if (args.length < 2) {
            return reply('❌ Usage: !contact <name> <phone> [email]');
        }
        
        const name = args[0];
        const phone = args[1];
        const email = args[2] || null;
        
        const contact = {
            name: name,
            phone: phone,
            email: email
        };
        
        try {
            await this.client.messageHandler.sendContact(message.from, contact);
            await reply('👤 Contact sent successfully!');
        } catch (error) {
            await reply('❌ Failed to send contact.');
        }
    }
    
    async handleTyping(context) {
        const { args, reply, message } = context;
        
        const duration = parseInt(args[0]) || 3;
        
        if (duration > 30) {
            return reply('❌ Maximum typing duration is 30 seconds.');
        }
        
        try {
            // Send typing indicator
            await this.client.wsHandler.sendTyping(message.from, true);
            
            await reply(`✍️ Typing indicator sent for ${duration} seconds...`);
            
            // Stop typing after duration
            setTimeout(async () => {
                await this.client.wsHandler.sendTyping(message.from, false);
            }, duration * 1000);
            
        } catch (error) {
            await reply('❌ Failed to send typing indicator.');
        }
    }
    
    async handlePresence(context) {
        const { args, reply, message } = context;
        
        const action = args[0]?.toLowerCase();
        
        if (!['on', 'off'].includes(action)) {
            return reply('❌ Usage: !presence <on|off>');
        }
        
        try {
            if (action === 'on') {
                await this.client.wsHandler.subscribeToPresence(message.from);
                await reply('👁️ Subscribed to presence updates for this chat.');
            } else {
                await this.client.wsHandler.unsubscribeFromPresence(message.from);
                await reply('👁️ Unsubscribed from presence updates for this chat.');
            }
        } catch (error) {
            await reply('❌ Failed to manage presence subscription.');
        }
    }
    
    async initialize() {
        console.log('Advanced plugin initialized with modern WhatsApp features');
        
        // Subscribe to advanced events
        this.client.on('message_realtime', (message) => {
            console.log(`⚡ Real-time message: ${message.id}`);
        });
        
        this.client.on('presence_update', (presence) => {
            console.log(`👤 ${presence.from} is ${presence.status}`);
        });
        
        this.client.on('typing', (typing) => {
            console.log(`✍️ ${typing.from} is ${typing.state}`);
        });
    }
}

module.exports = AdvancedPlugin;