// handlers/subscriptionCommandHandler.js
import { User } from '../models/user.js';

function escapeHTML(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function setupSubscriptionCommands(bot) {
  // 🔁 সোর্স চ্যানেল পরিবর্তন
  bot.onText(/\/setsource$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, '❌ অনুগ্রহ করে /setsource কমান্ডের সাথে সোর্স চ্যানেলের নাম(গুলো) দিন।\n\nউদাহরণ: /setsource @channel1, @channel2', { parse_mode: 'Markdown' });
  });

  bot.onText(/\/setsource (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1];
    const channels = input.split(',').map(ch => ch.trim()).filter(Boolean);

    if (!channels.length) {
      return bot.sendMessage(chatId, '❌ অনুগ্রহ করে কমা দিয়ে সোর্স চ্যানেল দিন। উদাহরণ: `/setsource @ch1, @ch2`', { parse_mode: 'Markdown' });
    }

    const invalidChannels = channels.filter(ch => !ch.startsWith('@'));
    if (invalidChannels.length > 0) {
      return bot.sendMessage(
        chatId,
        `❌ নিম্নলিখিত সোর্স চ্যানেলগুলো সঠিক নয়, প্রতিটা অবশ্যই @ দিয়ে শুরু করতে হবে:\n${invalidChannels.join('\n')}`,
        { parse_mode: 'Markdown' }
      );
    }

    const user = await User.findOneAndUpdate(
      { telegram_id: chatId },
      { $set: { source_channels: channels } },
      { new: true }
    );

    if (!user) return bot.sendMessage(chatId, '❌ আপনি এখনো সাবস্ক্রাইব করেননি। দয়া করে /start দিয়ে শুরু করুন।');

    userResetState.delete(chatId);

    bot.sendMessage(chatId, `✅ সোর্স চ্যানেল আপডেট হয়েছে:\n${channels.join('\n')}`);
  });

  // ➕ নতুন সোর্স চ্যানেল যুক্ত
  bot.onText(/\/addsource$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, '❌ অনুগ্রহ করে নতুন সোর্স চ্যানেলের নাম দিন। উদাহরণ: /addsource @channel1', { parse_mode: 'Markdown' });
  });

  // /addsource কমান্ডের সাথে চ্যানেল নাম আসলে
  bot.onText(/\/addsource (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const newSource = match[1].trim();

    // নাম আছে কি এবং @ দিয়ে শুরু করে কি চেক
    if (!newSource) {
      return bot.sendMessage(chatId, '❌ সোর্স চ্যানেলের নাম দিন। উদাহরণ: /addsource @channel1', { parse_mode: 'Markdown' });
    }
    if (!newSource.startsWith('@')) {
      return bot.sendMessage(chatId, '❌ সোর্স চ্যানেল অবশ্যই @ দিয়ে শুরু করতে হবে।', { parse_mode: 'Markdown' });
    }

    const user = await User.findOne({ telegram_id: chatId });
    if (!user) return bot.sendMessage(chatId, '❌ আপনি এখনো সাবস্ক্রাইব করেননি। /start দিয়ে শুরু করুন।');

    const currentSources = user.source_channels || [];

    if (currentSources.includes(newSource)) {
      return bot.sendMessage(chatId, `⚠️ ${newSource} ইতিমধ্যে আপনার সোর্স চ্যানেল তালিকায় আছে।`);
    }

    currentSources.push(newSource);
    user.source_channels = currentSources;
    await user.save();

    bot.sendMessage(chatId, `✅ নতুন সোর্স চ্যানেল যুক্ত হয়েছে: <pre>${escapeHTML(newSource)}</pre>`, { parse_mode: 'HTML' });
  });

  // ➖ সোর্স চ্যানেল রিমুভ
  bot.onText(/\/removesource$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, '❌ অনুগ্রহ করে রিমুভ করার সোর্স চ্যানেলের নাম(গুলো) দিন।\n\nউদাহরণ: /removesource @channel1, @channel2', { parse_mode: 'Markdown' });
  });

  bot.onText(/\/removesource (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const toRemove = match[1].split(',').map(ch => ch.trim()).filter(Boolean);

    if (toRemove.length === 0) {
      return bot.sendMessage(chatId, '❌ রিমুভ করার সোর্স চ্যানেলের নাম(গুলো) দিন। উদাহরণ: /removesource @channel1, @channel2', { parse_mode: 'Markdown' });
    }

    const invalidChannels = toRemove.filter(ch => !ch.startsWith('@'));
    if (invalidChannels.length > 0) {
      return bot.sendMessage(
        chatId,
        `❌ নিম্নলিখিত সোর্স চ্যানেলগুলো সঠিক নয়, প্রতিটা অবশ্যই @ দিয়ে শুরু করতে হবে:\n${invalidChannels.join('\n')}`,
        { parse_mode: 'Markdown' }
      );
    }

    const user = await User.findOne({ telegram_id: chatId });
    if (!user) return bot.sendMessage(chatId, '❌ আপনি এখনো সাবস্ক্রাইব করেননি। দয়া করে /start দিয়ে শুরু করুন।');

    const currentSources = user.source_channels || [];
    const updatedSources = currentSources.filter(ch => !toRemove.includes(ch));

    if (updatedSources.length === 0) {
      return bot.sendMessage(chatId, '⚠️ কমপক্ষে একটি সোর্স চ্যানেল রাখা আবশ্যক।');
    }

    user.source_channels = updatedSources;
    await user.save();

    bot.sendMessage(chatId, `✅ রিমুভ করা হয়েছে:\n${toRemove.join('\n')}`);
  });

  // 🛠️ ডেস্টিনেশন চ্যানেল পরিবর্তন
  bot.onText(/\/setdestination$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, '❌ অনুগ্রহ করে ডেস্টিনেশন চ্যানেলের @username দিন।\n\nউদাহরণ: /setdestination @yourchannel', { parse_mode: 'Markdown' });
  });

  bot.onText(/\/setdestination (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const destination = match[1].trim();

    if (!destination.startsWith('@')) {
      return bot.sendMessage(chatId, '❌ ডেস্টিনেশন চ্যানেলের নাম অবশ্যই @ দিয়ে শুরু করতে হবে। আবার চেষ্টা করুন।', { parse_mode: 'Markdown' });
    }

    const user = await User.findOneAndUpdate(
      { telegram_id: chatId },
      { $set: { destination_channel: destination } },
      { new: true }
    );

    if (!user) return bot.sendMessage(chatId, '❌ আপনি এখনো সাবস্ক্রাইব করেননি। দয়া করে /start দিয়ে শুরু করুন।');

    userResetState.delete(chatId); // রিসেট স্টেট মুছে ফেলি

    bot.sendMessage(chatId, `📤 নতুন ডেস্টিনেশন চ্যানেল সেট হয়েছে: ${destination}`);
  });


  // 🔄 রিসেট সাবস্ক্রিপশন
  const userResetState = new Map();

  bot.onText(/\/reset/, async (msg) => {
    const chatId = msg.chat.id;

    const user = await User.findOne({ telegram_id: chatId });
    if (!user) {
      return bot.sendMessage(chatId, '❌ আপনি এখনো সাবস্ক্রাইব করেননি। দয়া করে /start দিয়ে শুরু করুন।');
    }

    // ইউজারকে রিসেট মোডে রাখি
    userResetState.set(chatId, true);

    bot.sendMessage(
      chatId,
      '🔄 আপনার সাবস্ক্রিপশন রিসেট মোডে আছে। এখন নতুন সোর্স এবং ডেস্টিনেশন চ্যানেল দিন:\n\n/setsource @source1, @source2\n/setdestination @destination'
    );
  });


  // ℹ️ সহায়িকা
  bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpText = `
👋 সহায়িকা কমান্ডসমূহ:

/help - এই সহায়িকা দেখাবে
/myinfo - আপনার সাবস্ক্রিপশনের বিস্তারিত দেখুন
/setsource @ch1, @ch2 - সোর্স চ্যানেল সেট করুন (কমা দিয়ে আলাদা করুন)
/addsource @ch3 - নতুন সোর্স চ্যানেল যুক্ত করুন
/removesource @ch1 - সোর্স চ্যানেল সরিয়ে ফেলুন
/setdestination @dest - ডেস্টিনেশন চ্যানেল পরিবর্তন করুন
/reset - সাবস্ক্রিপশন রিসেট করে নতুন সোর্স ও ডেস্টিনেশন দিন
  `;
  bot.sendMessage(chatId, helpText); // parse_mode বাদ দিলাম
});


  // 📋 ইউজার ইনফো
bot.onText(/\/myinfo/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await User.findOne({ telegram_id: chatId });

  if (!user) {
    return bot.sendMessage(chatId, '❌ আপনি এখনো সাবস্ক্রাইব করেননি। /start দিয়ে শুরু করুন।');
  }

  const infoText = `
🆔 আপনার টেলিগ্রাম আইডি: ${user.telegram_id}
🔑 এক্টিভেশন কী: ${user.activation_key}
📥 সোর্স চ্যানেলসমূহ: ${user.source_channels.length > 0 ? user.source_channels.join(', ') : 'N/A'}
📤 ডেস্টিনেশন চ্যানেল: ${user.destination_channel || 'N/A'}
📅 মেয়াদ শেষ: ${user.expires_at ? new Date(user.expires_at).toLocaleDateString() : 'অজানা'}
📦 স্ট্যাটাস: ${user.status === 'active' ? '✅ Active' : '❌ Inactive'}
  `;

  bot.sendMessage(chatId, infoText); // এখানে কোনো parse_mode নেই
});
}
