import client from '../client.js';
import { User } from '../models/user.js';
import { forwardSingleMessage, forwardMediaGroup } from '../services/forwarder.js';

const lastMessageIds = new Map();
const groupBuffer = new Map();
const processingGroups = new Set(); // নতুন

export async function startPolling(bot) {
  console.log('📡 Polling শুরু হয়েছে...');

  setInterval(async () => {
    const users = await User.find({ status: 'active' });
    if (!users || users.length === 0) {
      return;
    }
    for (const user of users) {
      const { source_channels = [], destination_channel, _id } = user;

      for (const source of source_channels) {
        try {
          const entity = await client.getEntity(source);
          const messages = await client.getMessages(entity, { limit: 10 });

          if (!messages || messages.length === 0) continue;

          for (const msg of messages.reverse()) {
            const groupedId = msg.groupedId?.value;

            if (groupedId) {
              const groupKey = `${_id}_${source}_${groupedId}`;
              if (lastMessageIds.has(groupKey)) continue;

              if (!groupBuffer.has(groupKey)) {
                groupBuffer.set(groupKey, []);
              }

              const buffer = groupBuffer.get(groupKey);
              const alreadyExists = buffer.find(m => m.id === msg.id);
              if (!alreadyExists) buffer.push(msg);

              if (!processingGroups.has(groupKey)) {
                processingGroups.add(groupKey);

                setTimeout(async () => {
                  const currentGroup = groupBuffer.get(groupKey);
                  if (!currentGroup || currentGroup.length === 0) return;

                  await forwardMediaGroup(bot, currentGroup, destination_channel);

                  lastMessageIds.set(groupKey, true);
                  for (const m of currentGroup) {
                    lastMessageIds.set(`${_id}_${source}_${m.id}`, true); // প্রতিটি মেসেজও ট্র্যাক
                  }

                  groupBuffer.delete(groupKey);
                  processingGroups.delete(groupKey);
                }, 2500); // ⏱️ অপেক্ষা করে ২.৫ সেকেন্ড
              }
            } else {
              const uniqueKey = `${_id}_${source}_${msg.id}`;
              if (lastMessageIds.has(uniqueKey)) continue;

              await forwardSingleMessage(bot, msg, destination_channel);
              lastMessageIds.set(uniqueKey, true);
            }
          }

          // 🧹 মেমরি ক্লিনআপ
          if (lastMessageIds.size > 10000) {
            const keys = Array.from(lastMessageIds.keys()).slice(0, 5000);
            for (const k of keys) lastMessageIds.delete(k);
          }
        } catch (err) {
          console.error(`❌ ${source} থেকে মেসেজ আনতে সমস্যা:`, err.message);
        }
      }
    }
  }, 10000);
}
