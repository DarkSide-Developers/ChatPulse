/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { Logger } = require('../utils/Logger');

/**
 * Advanced Group Handler for WhatsApp group management
 * Provides comprehensive group operations and administration
 */
class GroupHandler {
    /**
     * Initialize GroupHandler
     * @param {ChatPulse} client - ChatPulse client instance
     */
    constructor(client) {
        this.client = client;
        this.logger = new Logger('GroupHandler');
    }

    /**
     * Create a new group
     * @param {string} name - Group name
     * @param {Array} participants - Array of participant phone numbers
     * @param {Object} options - Group creation options
     * @returns {Promise<Object>} Created group information
     */
    async createGroup(name, participants, options = {}) {
        try {
            const groupData = {
                name: name,
                participants: participants.map(p => this._formatParticipantId(p)),
                options: {
                    description: options.description || '',
                    profilePicture: options.profilePicture || null,
                    ephemeralDuration: options.ephemeralDuration || 0,
                    restrictedMode: options.restrictedMode || false,
                    announcementMode: options.announcementMode || false
                }
            };

            const result = await this.client.page.evaluate(async (data) => {
                const group = await window.Store.GroupUtils.createGroup(
                    data.name,
                    data.participants,
                    data.options
                );
                
                return {
                    id: group.id._serialized,
                    name: group.name,
                    participants: group.participants.length,
                    createdAt: group.createdAt,
                    inviteCode: group.inviteCode
                };
            }, groupData);

            this.logger.info(`Group created: ${name} (${result.id})`);
            this.client.emit('group_created', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to create group:', error);
            throw error;
        }
    }

    /**
     * Add participants to group
     * @param {string} groupId - Group ID
     * @param {Array} participants - Array of participant phone numbers
     * @returns {Promise<Object>} Add result
     */
    async addParticipants(groupId, participants) {
        try {
            const result = await this.client.page.evaluate(async (gId, parts) => {
                const group = window.Store.Chat.get(gId);
                if (!group || !group.isGroup) {
                    throw new Error('Group not found');
                }

                const addResults = await window.Store.GroupUtils.addParticipants(group, parts);
                
                return {
                    groupId: gId,
                    added: addResults.success || [],
                    failed: addResults.failed || [],
                    pending: addResults.pending || []
                };
            }, this._formatChatId(groupId), participants.map(p => this._formatParticipantId(p)));

            this.logger.info(`Added ${result.added.length} participants to group ${groupId}`);
            this.client.emit('participants_added', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to add participants:', error);
            throw error;
        }
    }

    /**
     * Remove participants from group
     * @param {string} groupId - Group ID
     * @param {Array} participants - Array of participant phone numbers
     * @returns {Promise<Object>} Remove result
     */
    async removeParticipants(groupId, participants) {
        try {
            const result = await this.client.page.evaluate(async (gId, parts) => {
                const group = window.Store.Chat.get(gId);
                if (!group || !group.isGroup) {
                    throw new Error('Group not found');
                }

                const removeResults = await window.Store.GroupUtils.removeParticipants(group, parts);
                
                return {
                    groupId: gId,
                    removed: removeResults.success || [],
                    failed: removeResults.failed || []
                };
            }, this._formatChatId(groupId), participants.map(p => this._formatParticipantId(p)));

            this.logger.info(`Removed ${result.removed.length} participants from group ${groupId}`);
            this.client.emit('participants_removed', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to remove participants:', error);
            throw error;
        }
    }

    /**
     * Promote participants to admin
     * @param {string} groupId - Group ID
     * @param {Array} participants - Array of participant phone numbers
     * @returns {Promise<Object>} Promote result
     */
    async promoteParticipants(groupId, participants) {
        try {
            const result = await this.client.page.evaluate(async (gId, parts) => {
                const group = window.Store.Chat.get(gId);
                if (!group || !group.isGroup) {
                    throw new Error('Group not found');
                }

                const promoteResults = await window.Store.GroupUtils.promoteParticipants(group, parts);
                
                return {
                    groupId: gId,
                    promoted: promoteResults.success || [],
                    failed: promoteResults.failed || []
                };
            }, this._formatChatId(groupId), participants.map(p => this._formatParticipantId(p)));

            this.logger.info(`Promoted ${result.promoted.length} participants in group ${groupId}`);
            this.client.emit('participants_promoted', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to promote participants:', error);
            throw error;
        }
    }

    /**
     * Demote participants from admin
     * @param {string} groupId - Group ID
     * @param {Array} participants - Array of participant phone numbers
     * @returns {Promise<Object>} Demote result
     */
    async demoteParticipants(groupId, participants) {
        try {
            const result = await this.client.page.evaluate(async (gId, parts) => {
                const group = window.Store.Chat.get(gId);
                if (!group || !group.isGroup) {
                    throw new Error('Group not found');
                }

                const demoteResults = await window.Store.GroupUtils.demoteParticipants(group, parts);
                
                return {
                    groupId: gId,
                    demoted: demoteResults.success || [],
                    failed: demoteResults.failed || []
                };
            }, this._formatChatId(groupId), participants.map(p => this._formatParticipantId(p)));

            this.logger.info(`Demoted ${result.demoted.length} participants in group ${groupId}`);
            this.client.emit('participants_demoted', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to demote participants:', error);
            throw error;
        }
    }

    /**
     * Update group settings
     * @param {string} groupId - Group ID
     * @param {Object} settings - Group settings
     * @returns {Promise<Object>} Update result
     */
    async updateGroupSettings(groupId, settings) {
        try {
            const result = await this.client.page.evaluate(async (gId, newSettings) => {
                const group = window.Store.Chat.get(gId);
                if (!group || !group.isGroup) {
                    throw new Error('Group not found');
                }

                const updates = {};

                if (newSettings.name !== undefined) {
                    await window.Store.GroupUtils.setGroupName(group, newSettings.name);
                    updates.name = newSettings.name;
                }

                if (newSettings.description !== undefined) {
                    await window.Store.GroupUtils.setGroupDescription(group, newSettings.description);
                    updates.description = newSettings.description;
                }

                if (newSettings.restrictedMode !== undefined) {
                    await window.Store.GroupUtils.setGroupProperty(group, 'restrict', newSettings.restrictedMode);
                    updates.restrictedMode = newSettings.restrictedMode;
                }

                if (newSettings.announcementMode !== undefined) {
                    await window.Store.GroupUtils.setGroupProperty(group, 'announce', newSettings.announcementMode);
                    updates.announcementMode = newSettings.announcementMode;
                }

                if (newSettings.ephemeralDuration !== undefined) {
                    await window.Store.GroupUtils.setEphemeralDuration(group, newSettings.ephemeralDuration);
                    updates.ephemeralDuration = newSettings.ephemeralDuration;
                }
                
                return {
                    groupId: gId,
                    updates: updates,
                    timestamp: Date.now()
                };
            }, this._formatChatId(groupId), settings);

            this.logger.info(`Group settings updated: ${groupId}`);
            this.client.emit('group_settings_updated', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to update group settings:', error);
            throw error;
        }
    }

    /**
     * Set group profile picture
     * @param {string} groupId - Group ID
     * @param {string|Buffer} image - Image file path or buffer
     * @returns {Promise<boolean>} Update success
     */
    async setGroupProfilePicture(groupId, image) {
        try {
            // Process image
            const imageData = await this.client.mediaHandler._processMedia(image);
            
            const result = await this.client.page.evaluate(async (gId, imgData) => {
                const group = window.Store.Chat.get(gId);
                if (!group || !group.isGroup) {
                    throw new Error('Group not found');
                }

                const imageBlob = new Blob([new Uint8Array(imgData.buffer)], {
                    type: imgData.mimetype
                });

                await window.Store.GroupUtils.setGroupProfilePicture(group, imageBlob);
                return true;
            }, this._formatChatId(groupId), imageData);

            this.logger.info(`Group profile picture updated: ${groupId}`);
            this.client.emit('group_picture_updated', { groupId });
            
            return result;

        } catch (error) {
            this.logger.error('Failed to set group profile picture:', error);
            return false;
        }
    }

    /**
     * Get group invite link
     * @param {string} groupId - Group ID
     * @returns {Promise<string>} Invite link
     */
    async getGroupInviteLink(groupId) {
        try {
            const inviteLink = await this.client.page.evaluate(async (gId) => {
                const group = window.Store.Chat.get(gId);
                if (!group || !group.isGroup) {
                    throw new Error('Group not found');
                }

                const inviteCode = await window.Store.GroupUtils.getGroupInviteLink(group);
                return `https://chat.whatsapp.com/${inviteCode}`;
            }, this._formatChatId(groupId));

            this.logger.info(`Group invite link retrieved: ${groupId}`);
            return inviteLink;

        } catch (error) {
            this.logger.error('Failed to get group invite link:', error);
            throw error;
        }
    }

    /**
     * Revoke group invite link
     * @param {string} groupId - Group ID
     * @returns {Promise<string>} New invite link
     */
    async revokeGroupInviteLink(groupId) {
        try {
            const newInviteLink = await this.client.page.evaluate(async (gId) => {
                const group = window.Store.Chat.get(gId);
                if (!group || !group.isGroup) {
                    throw new Error('Group not found');
                }

                const newInviteCode = await window.Store.GroupUtils.revokeGroupInviteLink(group);
                return `https://chat.whatsapp.com/${newInviteCode}`;
            }, this._formatChatId(groupId));

            this.logger.info(`Group invite link revoked: ${groupId}`);
            this.client.emit('group_invite_revoked', { groupId, newInviteLink });
            
            return newInviteLink;

        } catch (error) {
            this.logger.error('Failed to revoke group invite link:', error);
            throw error;
        }
    }

    /**
     * Join group by invite link
     * @param {string} inviteLink - Group invite link
     * @returns {Promise<Object>} Join result
     */
    async joinGroupByInvite(inviteLink) {
        try {
            const inviteCode = inviteLink.split('/').pop();
            
            const result = await this.client.page.evaluate(async (code) => {
                const groupInfo = await window.Store.GroupUtils.joinGroupByInvite(code);
                
                return {
                    id: groupInfo.id._serialized,
                    name: groupInfo.name,
                    participants: groupInfo.participants.length,
                    joinedAt: Date.now()
                };
            }, inviteCode);

            this.logger.info(`Joined group: ${result.name} (${result.id})`);
            this.client.emit('group_joined', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to join group by invite:', error);
            throw error;
        }
    }

    /**
     * Leave group
     * @param {string} groupId - Group ID
     * @returns {Promise<boolean>} Leave success
     */
    async leaveGroup(groupId) {
        try {
            const result = await this.client.page.evaluate(async (gId) => {
                const group = window.Store.Chat.get(gId);
                if (!group || !group.isGroup) {
                    throw new Error('Group not found');
                }

                await window.Store.GroupUtils.leaveGroup(group);
                return true;
            }, this._formatChatId(groupId));

            this.logger.info(`Left group: ${groupId}`);
            this.client.emit('group_left', { groupId });
            
            return result;

        } catch (error) {
            this.logger.error('Failed to leave group:', error);
            return false;
        }
    }

    /**
     * Get group participants
     * @param {string} groupId - Group ID
     * @returns {Promise<Array>} Array of participants
     */
    async getGroupParticipants(groupId) {
        try {
            const participants = await this.client.page.evaluate(async (gId) => {
                const group = window.Store.Chat.get(gId);
                if (!group || !group.isGroup) {
                    throw new Error('Group not found');
                }

                return group.participants.map(participant => ({
                    id: participant.id._serialized,
                    isAdmin: participant.isAdmin,
                    isSuperAdmin: participant.isSuperAdmin,
                    name: participant.contact?.name || participant.contact?.pushname || 'Unknown'
                }));
            }, this._formatChatId(groupId));

            return participants;

        } catch (error) {
            this.logger.error('Failed to get group participants:', error);
            throw error;
        }
    }

    /**
     * Get group admins
     * @param {string} groupId - Group ID
     * @returns {Promise<Array>} Array of admin participants
     */
    async getGroupAdmins(groupId) {
        try {
            const participants = await this.getGroupParticipants(groupId);
            return participants.filter(p => p.isAdmin || p.isSuperAdmin);
        } catch (error) {
            this.logger.error('Failed to get group admins:', error);
            throw error;
        }
    }

    /**
     * Check if user is group admin
     * @param {string} groupId - Group ID
     * @param {string} userId - User ID to check
     * @returns {Promise<boolean>} Is admin status
     */
    async isGroupAdmin(groupId, userId) {
        try {
            const admins = await this.getGroupAdmins(groupId);
            return admins.some(admin => admin.id === this._formatParticipantId(userId));
        } catch (error) {
            this.logger.error('Failed to check admin status:', error);
            return false;
        }
    }

    /**
     * Get group metadata
     * @param {string} groupId - Group ID
     * @returns {Promise<Object>} Group metadata
     */
    async getGroupMetadata(groupId) {
        try {
            const metadata = await this.client.page.evaluate(async (gId) => {
                const group = window.Store.Chat.get(gId);
                if (!group || !group.isGroup) {
                    throw new Error('Group not found');
                }

                return {
                    id: group.id._serialized,
                    name: group.name,
                    description: group.groupMetadata?.desc || '',
                    createdAt: group.groupMetadata?.creation,
                    createdBy: group.groupMetadata?.owner?._serialized,
                    participantCount: group.participants.length,
                    adminCount: group.participants.filter(p => p.isAdmin || p.isSuperAdmin).length,
                    restrictedMode: group.groupMetadata?.restrict || false,
                    announcementMode: group.groupMetadata?.announce || false,
                    ephemeralDuration: group.groupMetadata?.ephemeralDuration || 0,
                    inviteCode: group.groupMetadata?.inviteCode
                };
            }, this._formatChatId(groupId));

            return metadata;

        } catch (error) {
            this.logger.error('Failed to get group metadata:', error);
            throw error;
        }
    }

    /**
     * Format chat ID for groups
     * @param {string} chatId - Raw chat ID
     * @returns {string} Formatted chat ID
     * @private
     */
    _formatChatId(chatId) {
        let formatted = chatId.replace(/[^\d@-]/g, '');
        
        if (!formatted.includes('@')) {
            if (formatted.includes('-')) {
                formatted += '@g.us';
            } else {
                formatted += '@c.us';
            }
        }
        
        return formatted;
    }

    /**
     * Format participant ID
     * @param {string} participantId - Raw participant ID
     * @returns {string} Formatted participant ID
     * @private
     */
    _formatParticipantId(participantId) {
        let formatted = participantId.replace(/[^\d]/g, '');
        return formatted + '@c.us';
    }
}

module.exports = { GroupHandler };