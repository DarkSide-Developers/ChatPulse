/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const fs = require('fs-extra');
const path = require('path');
const { Logger } = require('../utils/Logger');

/**
 * Manages plugin loading, execution, and lifecycle
 * Provides a flexible command and event handling system
 */
class PluginManager {
    /**
     * Initialize PluginManager
     * @param {ChatPulse} client - ChatPulse client instance
     */
    constructor(client) {
        this.client = client;
        this.logger = new Logger('PluginManager');
        this.plugins = new Map();
        this.commands = new Map();
        this.eventHandlers = new Map();
        this.pluginDir = path.join(process.cwd(), 'plugins');
        this.commandPrefix = process.env.COMMAND_PREFIX || '!';
    }

    /**
     * Load all plugins from the plugins directory
     * @returns {Promise<number>} Number of loaded plugins
     */
    async loadPlugins() {
        try {
            // Ensure plugins directory exists
            await fs.ensureDir(this.pluginDir);
            
            const pluginFiles = await this._getPluginFiles();
            let loadedCount = 0;

            for (const file of pluginFiles) {
                try {
                    await this.loadPlugin(file);
                    loadedCount++;
                } catch (error) {
                    this.logger.error(`Failed to load plugin ${file}:`, error);
                }
            }

            this.logger.info(`Loaded ${loadedCount} plugins successfully`);
            return loadedCount;

        } catch (error) {
            this.logger.error('Failed to load plugins:', error);
            return 0;
        }
    }

    /**
     * Load a specific plugin
     * @param {string} pluginPath - Path to plugin file
     * @returns {Promise<Object>} Loaded plugin instance
     */
    async loadPlugin(pluginPath) {
        try {
            const fullPath = path.resolve(this.pluginDir, pluginPath);
            
            // Clear require cache to allow hot reloading
            delete require.cache[fullPath];
            
            const PluginClass = require(fullPath);
            const plugin = new PluginClass(this.client);
            
            // Validate plugin structure
            this._validatePlugin(plugin);
            
            // Register plugin
            this.plugins.set(plugin.name, plugin);
            
            // Register commands
            if (plugin.commands) {
                for (const command of plugin.commands) {
                    this.commands.set(command.name, {
                        plugin: plugin.name,
                        handler: command.handler,
                        description: command.description,
                        usage: command.usage,
                        aliases: command.aliases || []
                    });
                    
                    // Register aliases
                    if (command.aliases) {
                        for (const alias of command.aliases) {
                            this.commands.set(alias, {
                                plugin: plugin.name,
                                handler: command.handler,
                                description: command.description,
                                usage: command.usage,
                                isAlias: true,
                                originalCommand: command.name
                            });
                        }
                    }
                }
            }
            
            // Register event handlers
            if (plugin.events) {
                for (const [event, handler] of Object.entries(plugin.events)) {
                    if (!this.eventHandlers.has(event)) {
                        this.eventHandlers.set(event, []);
                    }
                    this.eventHandlers.get(event).push({
                        plugin: plugin.name,
                        handler: handler
                    });
                }
            }
            
            // Initialize plugin
            if (plugin.initialize) {
                await plugin.initialize();
            }
            
            this.logger.info(`Plugin loaded: ${plugin.name} v${plugin.version}`);
            return plugin;

        } catch (error) {
            this.logger.error(`Failed to load plugin ${pluginPath}:`, error);
            throw error;
        }
    }

    /**
     * Unload a plugin
     * @param {string} pluginName - Name of plugin to unload
     * @returns {Promise<boolean>} Unload success
     */
    async unloadPlugin(pluginName) {
        try {
            const plugin = this.plugins.get(pluginName);
            if (!plugin) {
                throw new Error(`Plugin not found: ${pluginName}`);
            }

            // Call plugin cleanup
            if (plugin.cleanup) {
                await plugin.cleanup();
            }

            // Remove commands
            for (const [cmdName, cmdData] of this.commands.entries()) {
                if (cmdData.plugin === pluginName) {
                    this.commands.delete(cmdName);
                }
            }

            // Remove event handlers
            for (const [event, handlers] of this.eventHandlers.entries()) {
                const filtered = handlers.filter(h => h.plugin !== pluginName);
                if (filtered.length === 0) {
                    this.eventHandlers.delete(event);
                } else {
                    this.eventHandlers.set(event, filtered);
                }
            }

            // Remove plugin
            this.plugins.delete(pluginName);
            
            this.logger.info(`Plugin unloaded: ${pluginName}`);
            return true;

        } catch (error) {
            this.logger.error(`Failed to unload plugin ${pluginName}:`, error);
            return false;
        }
    }

    /**
     * Reload a plugin
     * @param {string} pluginName - Name of plugin to reload
     * @returns {Promise<boolean>} Reload success
     */
    async reloadPlugin(pluginName) {
        try {
            const plugin = this.plugins.get(pluginName);
            if (!plugin) {
                throw new Error(`Plugin not found: ${pluginName}`);
            }

            const pluginPath = plugin.filePath || `${pluginName}.js`;
            
            await this.unloadPlugin(pluginName);
            await this.loadPlugin(pluginPath);
            
            this.logger.info(`Plugin reloaded: ${pluginName}`);
            return true;

        } catch (error) {
            this.logger.error(`Failed to reload plugin ${pluginName}:`, error);
            return false;
        }
    }

    /**
     * Process incoming message for commands and events
     * @param {Object} message - Message object
     */
    async processMessage(message) {
        try {
            // Check for commands
            if (message.body && message.body.startsWith(this.commandPrefix)) {
                await this._handleCommand(message);
            }

            // Trigger message event handlers
            await this._triggerEventHandlers('message', message);

        } catch (error) {
            this.logger.error('Error processing message:', error);
        }
    }

    /**
     * Handle command execution
     * @param {Object} message - Message object
     * @private
     */
    async _handleCommand(message) {
        try {
            const args = message.body.slice(this.commandPrefix.length).trim().split(/\s+/);
            const commandName = args.shift().toLowerCase();
            
            const command = this.commands.get(commandName);
            if (!command) {
                return; // Command not found, ignore silently
            }

            const plugin = this.plugins.get(command.plugin);
            if (!plugin) {
                this.logger.error(`Plugin not found for command: ${commandName}`);
                return;
            }

            // Create command context
            const context = {
                message: message,
                args: args,
                client: this.client,
                reply: async (text, options = {}) => {
                    return await this.client.sendMessage(message.from, text, options);
                },
                replyWithMedia: async (media, options = {}) => {
                    return await this.client.sendMedia(message.from, media, options);
                }
            };

            // Execute command
            await command.handler.call(plugin, context);
            
            this.logger.debug(`Command executed: ${commandName} by ${message.from}`);

        } catch (error) {
            this.logger.error('Error handling command:', error);
            
            // Send error message to user
            try {
                await this.client.sendMessage(message.from, '❌ An error occurred while executing the command.');
            } catch (replyError) {
                this.logger.error('Failed to send error message:', replyError);
            }
        }
    }

    /**
     * Trigger event handlers
     * @param {string} event - Event name
     * @param {*} data - Event data
     * @private
     */
    async _triggerEventHandlers(event, data) {
        const handlers = this.eventHandlers.get(event);
        if (!handlers) return;

        for (const { plugin, handler } of handlers) {
            try {
                const pluginInstance = this.plugins.get(plugin);
                if (pluginInstance) {
                    await handler.call(pluginInstance, data);
                }
            } catch (error) {
                this.logger.error(`Error in event handler for ${event} in plugin ${plugin}:`, error);
            }
        }
    }

    /**
     * Get list of plugin files
     * @returns {Promise<Array>} Array of plugin file paths
     * @private
     */
    async _getPluginFiles() {
        try {
            const files = await fs.readdir(this.pluginDir);
            return files.filter(file => file.endsWith('.js') && !file.startsWith('.'));
        } catch (error) {
            this.logger.warn('Plugins directory not found, creating...');
            await fs.ensureDir(this.pluginDir);
            return [];
        }
    }

    /**
     * Validate plugin structure
     * @param {Object} plugin - Plugin instance
     * @private
     */
    _validatePlugin(plugin) {
        if (!plugin.name) {
            throw new Error('Plugin must have a name property');
        }
        
        if (!plugin.version) {
            throw new Error('Plugin must have a version property');
        }
        
        if (!plugin.description) {
            throw new Error('Plugin must have a description property');
        }
    }

    /**
     * Get plugin information
     * @param {string} pluginName - Plugin name
     * @returns {Object|null} Plugin information
     */
    getPluginInfo(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) return null;

        return {
            name: plugin.name,
            version: plugin.version,
            description: plugin.description,
            author: plugin.author,
            commands: plugin.commands?.map(cmd => ({
                name: cmd.name,
                description: cmd.description,
                usage: cmd.usage,
                aliases: cmd.aliases
            })) || [],
            events: plugin.events ? Object.keys(plugin.events) : []
        };
    }

    /**
     * Get all loaded plugins
     * @returns {Array} Array of plugin information
     */
    getLoadedPlugins() {
        return Array.from(this.plugins.keys()).map(name => this.getPluginInfo(name));
    }

    /**
     * Get all available commands
     * @returns {Array} Array of command information
     */
    getAvailableCommands() {
        const commands = [];
        
        for (const [name, command] of this.commands.entries()) {
            if (!command.isAlias) {
                commands.push({
                    name: name,
                    description: command.description,
                    usage: command.usage,
                    aliases: command.aliases,
                    plugin: command.plugin
                });
            }
        }
        
        return commands;
    }
}

module.exports = { PluginManager };