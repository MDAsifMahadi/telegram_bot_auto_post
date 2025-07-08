import client from '../client.js';
import { User } from '../models/user.js';
import { forwardSingleMessage, forwardMediaGroup } from '../services/forwarder.js';

const lastMessageIds = new Map();
const groupBuffer = new Map();
const processingGroups = new Set();

export async function startPolling(bot) {
  console.log('📡 Polling শুরু হয়েছে...');
  setInterval(async () => {
     const users = await User.find(
    { 'subscription.status': 'active' },
    { telegram_id: 1, subscription: 1 }
  );
    if (!users || users.length === 0) {
      return;
    }
    for (const user of users) {
      // নতুন: একাধিক সাবস্ক্রিপশন লুপ করা
      const activeSubs = (user.subscription || []).filter(sub => sub.status === 'active');

      for (const sub of activeSubs) {
        const { sources = [], destination } = sub;
        if (!destination || sources.length === 0) continue;

        for (const source of sources) {
          try {
            const entity = await client.getEntity(source);
            const messages = await client.getMessages(entity, { limit: 10 });
            if (!messages || messages.length === 0) continue;

            for (const msg of messages.reverse()) {
              const groupedId = msg.groupedId?.value;

              if (groupedId) {
                const groupKey = `${user._id}_${source}_${groupedId}`;
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
                    if (!currentGroup || currentGroup.length === 0) {
                      processingGroups.delete(groupKey);
                      return;
                    }

                    await forwardMediaGroup(bot, currentGroup, destination);

                    lastMessageIds.set(groupKey, true);
                    for (const m of currentGroup) {
                      lastMessageIds.set(`${user._id}_${source}_${m.id}`, true);
                    }

                    groupBuffer.delete(groupKey);
                    processingGroups.delete(groupKey);
                  }, 2500);
                }
              } else {
                const uniqueKey = `${user._id}_${source}_${msg.id}`;
                if (lastMessageIds.has(uniqueKey)) continue;

                await forwardSingleMessage(bot, msg, destination);
                lastMessageIds.set(uniqueKey, true);
              }
            }

            // মেমরি ক্লিনআপ
            if (lastMessageIds.size > 10000) {
              const keys = Array.from(lastMessageIds.keys()).slice(0, 5000);
              for (const k of keys) lastMessageIds.delete(k);
            }
          } catch (err) {
            console.error(`❌ ${source} থেকে মেসেজ আনতে সমস্যা:`, err.message);
          }
        }
      }
    }
  }, 10000);
}
