import { User } from '../models/user.js';
import { Key } from '../models/key.js';

const userState = {};

export function setupCommandHandlers(bot) {
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    userState[chatId] = { step: 'awaiting_key' };

    await bot.sendMessage(
      chatId,
      `👋 স্বাগতম! এটি একটি সাবস্ক্রিপশন ভিত্তিক অটো-পোস্টিং সেবা।\n\n🔑 একটি এক্টিভেশন কী দিন।\n\nকী না থাকলে যোগাযোগ করুন: @YourTelegramID`
    );
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();

    if (!userState[chatId] || msg.text.startsWith('/')) return;

    const step = userState[chatId].step;

    // Step 1: এক্টিভেশন কী যাচাই
    if (step === 'awaiting_key') {
      const keyDoc = await Key.findOne({ key: text, used: false });

      if (!keyDoc) {
        return bot.sendMessage(
          chatId,
          `❌ অবৈধ এক্টিভেশন কী। আবার চেষ্টা করুন বা @YourTelegramID এর সাথে যোগাযোগ করুন।`
        );
      }

      userState[chatId] = {
        step: 'awaiting_source',
        activation_key: text,
      };

      return bot.sendMessage(chatId, `✅ এক্টিভেশন কী গ্রহণ করা হয়েছে!\n\n🔗 এখন সোর্স চ্যানেলের @username দিন (একাধিক হলে কমা দিয়ে দিন):`);
    }

    // Step 2: সোর্স চ্যানেল ইনপুট
    if (step === 'awaiting_source') {
      const rawSources = text
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      // Check all sources start with '@'
      const invalidSources = rawSources.filter(s => !s.startsWith('@'));
      if (rawSources.length === 0) {
        return bot.sendMessage(chatId, '⚠️ সোর্স চ্যানেল দিতে ভুল হয়েছে। আবার দিন:');
      } else if (invalidSources.length > 0) {
        return bot.sendMessage(chatId, `❌ সোর্স চ্যানেলের ইউজারনেম অবশ্যই '@' দিয়ে শুরু করতে হবে। ভুল আছে: ${invalidSources.join(', ')}`);
      }

      userState[chatId].sources = rawSources;
      userState[chatId].step = 'awaiting_destination';

      return bot.sendMessage(chatId, `📤 এখন ডেস্টিনেশন চ্যানেলের @username দিন (যেখানে পোস্ট যাবে):`);
    }

    // Step 3: ডেস্টিনেশন চ্যানেল ইনপুট ও সেভ
    if (step === 'awaiting_destination') {
      const activation_key = userState[chatId].activation_key;
      const sources = userState[chatId].sources;
      const destination = text.trim();

      // Destination অবশ্যই '@' দিয়ে শুরু করতে হবে
      if (!destination.startsWith('@')) {
        return bot.sendMessage(chatId, '❌ ডেস্টিনেশন চ্যানেলের ইউজারনেম অবশ্যই @ দিয়ে শুরু করতে হবে। আবার দিন:');
      }

      const keyDoc = await Key.findOneAndUpdate({ key: activation_key }, { used: true });
      const expires = keyDoc.expires_at;

      await User.create({
        telegram_id: chatId,
        activation_key,
        source_channels: sources,
        destination_channel: destination,
        expires_at: expires,
        status: 'active',
      });

      userState[chatId] = null;

      return bot.sendMessage(
        chatId,
        `🎉 সেটআপ সম্পন্ন!\n\n📥 Sources: ${sources.join(', ')}\n📤 Destination: ${destination}\n\n🕒 মেয়াদ শেষ হবে: ${expires.toDateString()}\n\n✅ এখন আমাকে ডেস্টিনেশন চ্যানেলের অ্যাডমিন করুন।`
      );
    }

  });
}

export async function handleCommand(bot, msg) {
  const chatId = msg.chat.id;
  const text = msg.text.trim();

  if (text === '/status') {
    const users = await User.find({ telegram_id: chatId });

    if (!users || users.length === 0) {
      return bot.sendMessage(chatId, '⚠️ কোনো সাবস্ক্রিপশন পাওয়া যায়নি।');
    }

    let reply = '📄 আপনার সাবস্ক্রিপশনসমূহ:\n\n';

    for (const user of users) {
      const key = await Key.findOne({ key: user.activation_key }); // <-- key এর পরিবর্তে activation_key

      reply += `🔹 Sources: ${user.source_channels?.join(', ') || 'N/A'}\n`;
      reply += `🔸 Destination: ${user.destination_channel || 'N/A'}\n`;
      reply += `📦 Status: ${user.status === 'active' ? '✅ Active' : '❌ Inactive'}\n`;
      reply += `🗓️ Expiry: ${key?.expires_at ? new Date(key.expires_at).toLocaleDateString() : 'Unknown'}\n`;
      reply += `🆔 Key: ${user.activation_key}\n`;
      reply += '----------------------\n';
    }

    await bot.sendMessage(chatId, reply);
  }
}
