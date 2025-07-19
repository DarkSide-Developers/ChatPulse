/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

/**
 * System Plugin - Provides system information and management commands
 * Includes status, ping, uptime, and plugin management
 */
class SystemPlugin {
    constructor(client) {
        this.client = client;
        this.name = 'system';
        this.version = '1.0.0';
        this.description = 'System information and management commands';
        this.author = 'DarkWinzo';
        this.startTime = Date.now();
        
        this.commands = [
            {
                name: 'ping',
                description: 'Check bot response time',
                usage: '!ping',
                handler: this.handlePing
            },
            {
                name: 'status',
                description: 'Show bot status and statistics',
                usage: '!status',
                aliases: ['stats'],
                handler: this.handleStatus
            },
            {
                name: 'uptime',
                description: 'Show bot uptime',
                usage: '!uptime',
                handler: this.handleUptime
            },
            {
                name: 'plugins',
                description: 'List loaded plugins',
                usage: '!plugins',
                handler: this.handlePlugins
            },
            {
                name: 'reload',
                description: 'Reload a plugin',
                usage: '!reload <plugin>',
                handler: this.handleReload
            }
        ];
    }
    
    async handlePing(context) {
        const { reply } = context;
        const startTime = Date.now();
        
        await reply('🏓 Pong!').then(() => {
            const responseTime = Date.now() - startTime;
            reply(`⚡ Response time: ${responseTime}ms`);
        });
    }
    
    async handleStatus(context) {
        const { reply } = context;
        
        const uptime = this.formatUptime(Date.now() - this.startTime);
        const memoryUsage = process.memoryUsage();
        const loadedPlugins = this.client.pluginManager.getLoadedPlugins().length;
        const availableCommands = this.client.pluginManager.getAvailableCommands().length;
        
        const statusText = `
📊 *Bot Status*

🟢 *Status:* Online
⏱️ *Uptime:* ${uptime}
🔌 *Plugins:* ${loadedPlugins} loaded
💻 *Commands:* ${availableCommands} available

💾 *Memory Usage:*
• RSS: ${this.formatBytes(memoryUsage.rss)}
• Heap Used: ${this.formatBytes(memoryUsage.heapUsed)}
• Heap Total: ${this.formatBytes(memoryUsage.heapTotal)}

🔧 *System:*
• Node.js: ${process.version}
• Platform: ${process.platform}
• Architecture: ${process.arch}
        `.trim();
        
        await reply(statusText);
    }
    
    async handleUptime(context) {
        const { reply } = context;
        const uptime = this.formatUptime(Date.now() - this.startTime);
        
        await reply(`⏱️ Bot uptime: ${uptime}`);
    }
    
    async handlePlugins(context) {
        const { reply } = context;
        const plugins = this.client.pluginManager.getLoadedPlugins();
        
        if (plugins.length === 0) {
            await reply('❌ No plugins loaded.');
            return;
        }
        
        let pluginText = '🔌 *Loaded Plugins*\n\n';
        
        plugins.forEach(plugin => {
            pluginText += `📦 *${plugin.name}* v${plugin.version}\n`;
            pluginText += `   ${plugin.description}\n`;
            if (plugin.author) {
                pluginText += `   _by ${plugin.author}_\n`;
            }
            pluginText += `   Commands: ${plugin.commands.length}\n\n`;
        });
        
        await reply(pluginText);
    }
    
    async handleReload(context) {
        const { args, reply } = context;
        const pluginName = args[0];
        
        if (!pluginName) {
            await reply('❌ Please specify a plugin name. Usage: `!reload <plugin>`');
            return;
        }
        
        try {
            const success = await this.client.pluginManager.reloadPlugin(pluginName);
            
            if (success) {
                await reply(`✅ Plugin '${pluginName}' reloaded successfully.`);
            } else {
                await reply(`❌ Failed to reload plugin '${pluginName}'.`);
            }
        } catch (error) {
            await reply(`❌ Error reloading plugin '${pluginName}': ${error.message}`);
        }
    }
    
    formatUptime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours % 24 > 0) parts.push(`${hours % 24}h`);
        if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
        if (seconds % 60 > 0) parts.push(`${seconds % 60}s`);
        
        return parts.join(' ') || '0s';
    }
    
    formatBytes(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    }
    
    async initialize() {
        console.log('System plugin initialized');
    }
}

module.exports = SystemPlugin;