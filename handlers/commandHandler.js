import { User } from '../models/user.js';
import { Key } from '../models/key.js';

const userState = {};

export function setupCommandHandlers(bot) {
  bot.onText(/\/start|\/new/, async (msg) => {
    const chatId = msg.chat.id;
    userState[chatId] = { step: 'awaiting_key' };

    await bot.sendMessage(
      chatId,
      `👋 স্বাগতম! এটি একটি সাবস্ক্রিপশন ভিত্তিক অটো-পোস্টিং সেবা।\n\n🔑 একটি এক্টিভেশন কী দিন।\n\nকী না থাকলে যোগাযোগ করুন: @Asif_Mahadi0`
    );
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();

    if (!userState[chatId] || text.startsWith('/')) return;

    const step = userState[chatId].step;

    // Step 1: এক্টিভেশন কী যাচাই
    if (step === 'awaiting_key') {
      const keyDoc = await Key.findOne({ key: text, used: false });

      if (!keyDoc) {
        return bot.sendMessage(chatId, `❌ অবৈধ এক্টিভেশন কী। আবার দিন বা @Asif_Mahadi0 এর সাথে যোগাযোগ করুন।`);
      }

      userState[chatId] = {
        step: 'awaiting_source',
        activation_key: text,
      };

      return bot.sendMessage(chatId, `✅ কী গ্রহণ করা হয়েছে!\n\n📥 সোর্স চ্যানেলের @username দিন (কমা দিয়ে):`);
    }

    // Step 2: সোর্স ইনপুট
    if (step === 'awaiting_source') {
      const sources = text.split(',').map(s => s.trim()).filter(Boolean);
      const invalid = sources.filter(s => !s.startsWith('@'));

      if (sources.length === 0) {
        return bot.sendMessage(chatId, '⚠️ সোর্স চ্যানেল দিতে ভুল হয়েছে। আবার দিন:');
      } else if (invalid.length > 0) {
        return bot.sendMessage(chatId, `❌ সোর্স ইউজারনেম অবশ্যই '@' দিয়ে শুরু করতে হবে। ভুল: ${invalid.join(', ')}`);
      }

      userState[chatId].sources = sources;
      userState[chatId].step = 'awaiting_destination';

      return bot.sendMessage(chatId, `📤 এখন ডেস্টিনেশন চ্যানেলের @username দিন:`);
    }

    // Step 3: ডেস্টিনেশন ইনপুট ও সেভ
    if (step === 'awaiting_destination') {
      const destination = text.trim();
      if (!destination.startsWith('@')) {
        return bot.sendMessage(chatId, '❌ ডেস্টিনেশন অবশ্যই @ দিয়ে শুরু করতে হবে। আবার দিন:');
      }

      const { activation_key, sources } = userState[chatId];
      const keyDoc = await Key.findOneAndUpdate({ key: activation_key }, { used: true });

      if (!keyDoc) {
        return bot.sendMessage(chatId, '❌ সমস্যাঃ কী পাওয়া যায়নি বা ইতিমধ্যেই ব্যবহৃত হয়েছে।');
      }

      const newSub = {
        activation_key,
        sources,
        destination,
        expires_at: keyDoc.expires_at,
        status: 'active'
      };

      let user = await User.findOne({ telegram_id: chatId });

      if (user) {
        user.subscription.push(newSub);
        await user.save();
      } else {
        await User.create({
          telegram_id: chatId,
          subscription: [newSub]
        });
      }

      userState[chatId] = null;

      return bot.sendMessage(
        chatId,
        `🎉 সাবস্ক্রিপশন যুক্ত হয়েছে!\n\n📥 Sources: ${sources.join(', ')}\n📤 Destination: ${destination}\n🕒 মেয়াদ: ${new Date(keyDoc.expires_at).toDateString()}\n\n✅ এখন আমাকে ডেস্টিনেশন চ্যানেলের অ্যাডমিন করুন।`
      );
    }
  });
  bot.onText(/\/cancel/, async (msg) => {
    const chatId = msg.chat.id;

    if (userState[chatId]) {
      userState[chatId] = null;
      return bot.sendMessage(chatId, '❌ চলমান অপারেশন বাতিল করা হয়েছে। আপনি এখন নতুন করে শুরু করতে পারেন।');
    } else {
      return bot.sendMessage(chatId, 'ℹ️ বর্তমানে কোনো অপারেশন চলছে না।');
    }
  });

}

export async function handleCommand(bot, msg) {
  const chatId = msg.chat.id;
  const text = msg.text.trim();

  if (text === '/status') {
    const user = await User.findOne({ telegram_id: chatId });

    if (!user || !user.subscription.length) {
      return bot.sendMessage(chatId, '⚠️ কোনো সাবস্ক্রিপশন পাওয়া যায়নি।');
    }

    let reply = '📄 আপনার সাবস্ক্রিপশনসমূহ:\n\n';

    for (const sub of user.subscription) {
      reply += `🔹 Sources: ${sub.sources?.join(', ') || 'N/A'}\n`;
      reply += `🔸 Destination: ${sub.destination || 'N/A'}\n`;
      reply += `📦 Status: ${sub.status === 'active' ? '✅ Active' : '❌ Inactive'}\n`;
      reply += `🗓️ Expiry: ${sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : 'Unknown'}\n`;
      reply += `🆔 Key: ${sub.activation_key}\n`;
      reply += '----------------------\n';
    }

    await bot.sendMessage(chatId, reply);
  }
}
