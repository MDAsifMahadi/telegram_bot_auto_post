import client from '../client.js';
import { User } from '../models/user.js';
import { forwardSingleMessage, forwardMediaGroup } from '../services/forwarder.js';

const mediaGroups = new Map();
const groupTimers = new Map();
const processed = new Set();

// মূল মেসেজ হ্যান্ডলার ফাংশন
export async function setupMessageHandler(bot) {
  const users = await User.find({ status: 'active' });

  const sourceToUserMap = new Map();
  const channelEntities = new Map();

  for (const user of users) {
    const { source_channel } = user;
    if (!sourceToUserMap.has(source_channel)) {
      sourceToUserMap.set(source_channel, []);
    }
    sourceToUserMap.get(source_channel).push(user);
  }

  // Channel Entity Resolve
  for (const username of sourceToUserMap.keys()) {
    try {
      const entity = await client.getEntity(username);
      channelEntities.set(entity.id.value, {
        entity,
        users: sourceToUserMap.get(username),
      });
      console.log(`✅ Listening to: ${username}`);
    } catch (err) {
      console.error(`❌ Failed to load source channel ${username}:`, err.message);
    }
  }

  client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message || !message.peerId?.channelId) return;

    const channelId = message.peerId.channelId.value;
    if (!channelEntities.has(channelId)) return;

    const { users } = channelEntities.get(channelId);

    const groupedId = message.groupedId?.value;
    const msgKey = groupedId || message.id;
    if (processed.has(msgKey)) return;

    // মিডিয়া গ্রুপ পোস্ট
    if (groupedId) {
      if (!mediaGroups.has(groupedId)) {
        mediaGroups.set(groupedId, []);
      }

      const group = mediaGroups.get(groupedId);
      if (!group.some(m => m.id === message.id)) {
        group.push(message);
      }

      if (groupTimers.has(groupedId)) {
        clearTimeout(groupTimers.get(groupedId));
      }

      const timeout = setTimeout(async () => {
        const messages = mediaGroups.get(groupedId);
        processed.add(groupedId);

        for (const user of users) {
          await forwardMediaGroup(bot, messages, user.destination_channel);
        }

        mediaGroups.delete(groupedId);
        groupTimers.delete(groupedId);
      }, 2000);

      groupTimers.set(groupedId, timeout);
    }

    // একক মেসেজ
    else {
      processed.add(message.id);
      for (const user of users) {
        await forwardSingleMessage(bot, message, user.destination_channel);
      }
    }
  });
}
