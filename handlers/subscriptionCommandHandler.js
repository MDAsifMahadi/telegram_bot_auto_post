import { User } from '../models/user.js';

function escapeHTML(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function setupSubscriptionCommands(bot) {
  // ====== /setsource ======
  bot.onText(/\/setsource$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      '❌ দয়া করে সাবস্ক্রিপশন নম্বর ও সোর্স চ্যানেল দিন।\n\nউদাহরণ: /setsource 1 @channel1,@channel2',
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/\/setsource (\d+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const subIndex = parseInt(match[1], 10) - 1; // 1-based to 0-based index
    const channels = match[2].split(',').map(ch => ch.trim()).filter(Boolean);

    if (channels.length === 0) {
      return bot.sendMessage(
        chatId,
        '❌ সোর্স চ্যানেল দিন। উদাহরণ: /setsource 1 @channel1,@channel2',
        { parse_mode: 'Markdown' }
      );
    }

    const invalidChannels = channels.filter(ch => !ch.startsWith('@'));
    if (invalidChannels.length > 0) {
      return bot.sendMessage(
        chatId,
        `❌ নিম্নলিখিত সোর্স চ্যানেলগুলো সঠিক নয়, সবগুলো @ দিয়ে শুরু করতে হবে:\n${invalidChannels.join('\n')}`,
        { parse_mode: 'Markdown' }
      );
    }

    const user = await User.findOne({ telegram_id: chatId });
    if (!user) return bot.sendMessage(chatId, '❌ আপনি এখনো সাবস্ক্রাইব করেননি। /start দিয়ে শুরু করুন।');

    if (!user.subscription || !user.subscription[subIndex]) {
      return bot.sendMessage(chatId, `❌ সাবস্ক্রিপশন নম্বর ${subIndex + 1} পাওয়া যায়নি।`, { parse_mode: 'Markdown' });
    }

    user.subscription[subIndex].sources = channels;
    await user.save();

    bot.sendMessage(chatId, `✅ সাবস্ক্রিপশন #${subIndex + 1} এর সোর্স চ্যানেল আপডেট হয়েছে:\n${channels.join('\n')}`);
  });


  // ====== /addsource ======
  bot.onText(/\/addsource$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      '❌ দয়া করে সাবস্ক্রিপশন নম্বর ও নতুন সোর্স চ্যানেলের নাম দিন।\n\nউদাহরণ: /addsource 1 @channel1',
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/\/addsource (\d+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const subIndex = parseInt(match[1], 10) - 1;
    const newSource = match[2].trim();

    if (!newSource.startsWith('@')) {
      return bot.sendMessage(chatId, '❌ সোর্স চ্যানেল অবশ্যই @ দিয়ে শুরু করতে হবে।', { parse_mode: 'Markdown' });
    }

    const user = await User.findOne({ telegram_id: chatId });
    if (!user) return bot.sendMessage(chatId, '❌ আপনি এখনো সাবস্ক্রাইব করেননি। /start দিয়ে শুরু করুন।');

    if (!user.subscription || !user.subscription[subIndex]) {
      return bot.sendMessage(chatId, `❌ সাবস্ক্রিপশন নম্বর ${subIndex + 1} পাওয়া যায়নি।`, { parse_mode: 'Markdown' });
    }

    const currentSources = user.subscription[subIndex].sources || [];

    if (currentSources.includes(newSource)) {
      return bot.sendMessage(chatId, `⚠️ ${newSource} ইতিমধ্যে সাবস্ক্রিপশন #${subIndex + 1} এর সোর্স চ্যানেল তালিকায় আছে।`);
    }

    currentSources.push(newSource);
    user.subscription[subIndex].sources = currentSources;
    await user.save();

    bot.sendMessage(chatId, `✅ সাবস্ক্রিপশন #${subIndex + 1} এর জন্য নতুন সোর্স চ্যানেল যুক্ত হয়েছে: <pre>${escapeHTML(newSource)}</pre>`, { parse_mode: 'HTML' });
  });


  // ====== /removesource ======
  bot.onText(/\/removesource$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      '❌ দয়া করে সাবস্ক্রিপশন নম্বর ও রিমুভ করার সোর্স চ্যানেলের নাম(গুলো) দিন।\n\nউদাহরণ: /removesource 1 @channel1,@channel2',
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/\/removesource (\d+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const subIndex = parseInt(match[1], 10) - 1;
    const toRemove = match[2].split(',').map(ch => ch.trim()).filter(Boolean);

    if (toRemove.length === 0) {
      return bot.sendMessage(chatId, '❌ রিমুভ করার সোর্স চ্যানেল দিন। উদাহরণ: /removesource 1 @channel1,@channel2', { parse_mode: 'Markdown' });
    }

    const invalidChannels = toRemove.filter(ch => !ch.startsWith('@'));
    if (invalidChannels.length > 0) {
      return bot.sendMessage(
        chatId,
        `❌ নিম্নলিখিত সোর্স চ্যানেলগুলো সঠিক নয়, সবগুলো @ দিয়ে শুরু করতে হবে:\n${invalidChannels.join('\n')}`,
        { parse_mode: 'Markdown' }
      );
    }

    const user = await User.findOne({ telegram_id: chatId });
    if (!user) return bot.sendMessage(chatId, '❌ আপনি এখনো সাবস্ক্রাইব করেননি। /start দিয়ে শুরু করুন।');

    if (!user.subscription || !user.subscription[subIndex]) {
      return bot.sendMessage(chatId, `❌ সাবস্ক্রিপশন নম্বর ${subIndex + 1} পাওয়া যায়নি।`, { parse_mode: 'Markdown' });
    }

    const currentSources = user.subscription[subIndex].sources || [];
    const updatedSources = currentSources.filter(ch => !toRemove.includes(ch));

    if (updatedSources.length === 0) {
      return bot.sendMessage(chatId, '⚠️ কমপক্ষে একটি সোর্স চ্যানেল রাখতে হবে।');
    }

    user.subscription[subIndex].sources = updatedSources;
    await user.save();

    bot.sendMessage(chatId, `✅ সাবস্ক্রিপশন #${subIndex + 1} থেকে রিমুভ করা হয়েছে:\n${toRemove.join('\n')}`);
  });


  // ====== /setdestination ======
  bot.onText(/\/setdestination$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      '❌ দয়া করে সাবস্ক্রিপশন নম্বর ও ডেস্টিনেশন চ্যানেলের @username দিন।\n\nউদাহরণ: /setdestination 1 @yourchannel',
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/\/setdestination (\d+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const subIndex = parseInt(match[1], 10) - 1;
    const destination = match[2].trim();

    if (!destination.startsWith('@')) {
      return bot.sendMessage(chatId, '❌ ডেস্টিনেশন চ্যানেলের নাম অবশ্যই @ দিয়ে শুরু করতে হবে। আবার চেষ্টা করুন।', { parse_mode: 'Markdown' });
    }

    const user = await User.findOne({ telegram_id: chatId });
    if (!user) return bot.sendMessage(chatId, '❌ আপনি এখনো সাবস্ক্রাইব করেননি। /start দিয়ে শুরু করুন।');

    if (!user.subscription || !user.subscription[subIndex]) {
      return bot.sendMessage(chatId, `❌ সাবস্ক্রিপশন নম্বর ${subIndex + 1} পাওয়া যায়নি।`, { parse_mode: 'Markdown' });
    }

    user.subscription[subIndex].destination = destination;
    await user.save();

    bot.sendMessage(chatId, `✅ সাবস্ক্রিপশন #${subIndex + 1} এর ডেস্টিনেশন চ্যানেল আপডেট হয়েছে: ${destination}`);
  });


  // ====== /reset ======
  // ইউজারের জন্য রিসেট মোড ট্র্যাক করার জন্য ম্যাপ
  const userResetState = new Map();

  bot.onText(/\/reset/, async (msg) => {
    const chatId = msg.chat.id;

    const user = await User.findOne({ telegram_id: chatId });
    if (!user) {
      return bot.sendMessage(chatId, '❌ আপনি এখনো সাবস্ক্রাইব করেননি। /start দিয়ে শুরু করুন।');
    }

    userResetState.set(chatId, true);

    bot.sendMessage(
      chatId,
      '🔄 আপনার সাবস্ক্রিপশন রিসেট মোডে আছে। এখন নতুন সোর্স এবং ডেস্টিনেশন চ্যানেল দিন:\n\n/setsource <নম্বর> @source1,@source2\n/setdestination <নম্বর> @destination'
    );
  });


  // ====== /help ======
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpText = `
👋 সহায়িকা:

/myinfo - আপনার সব সাবস্ক্রিপশন দেখুন
/setsource <নম্বর> @ch1,@ch2 - নির্দিষ্ট সাবস্ক্রিপশনের সোর্স চ্যানেল পরিবর্তন
/addsource <নম্বর> @ch3 - নির্দিষ্ট সাবস্ক্রিপশনে নতুন সোর্স চ্যানেল যুক্ত করুন
/removesource <নম্বর> @ch1,@ch2 - নির্দিষ্ট সাবস্ক্রিপন থেকে সোর্স চ্যানেল সরান
/setdestination <নম্বর> @channel - নির্দিষ্ট সাবস্ক্রিপশনের ডেস্টিনেশন চ্যানেল পরিবর্তন করুন
/reset - সাবস্ক্রিপশন রিসেট মোড চালু করুন
/start - নতুন সাবস্ক্রিপশন শুরু করুন
/status - আপনার সাবস্ক্রিপশনের অবস্থা দেখুন
/help - এই সহায়িকা দেখুন
    `;
    bot.sendMessage(chatId, helpText);
  });


  // ====== /myinfo ======
  bot.onText(/\/myinfo/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await User.findOne({ telegram_id: chatId });

    if (!user) {
      return bot.sendMessage(chatId, '❌ আপনি এখনো সাবস্ক্রাইব করেননি। /start দিয়ে শুরু করুন।');
    }

    if (!user.subscription || user.subscription.length === 0) {
      return bot.sendMessage(chatId, '⚠️ আপনার কোনো সাবস্ক্রিপশন নেই।');
    }

    let infoText = `🆔 আপনার টেলিগ্রাম আইডি: ${user.telegram_id}\n\n`;

    user.subscription.forEach((sub, i) => {
      infoText += `🔸 সাবস্ক্রিপশন #${i + 1}\n`;
      infoText += `  🔑 কী: ${sub.activation_key}\n`;
      infoText += `  📥 সোর্স চ্যানেল: ${sub.sources.length > 0 ? sub.sources.join(', ') : 'N/A'}\n`;
      infoText += `  📤 ডেস্টিনেশন চ্যানেল: ${sub.destination || 'N/A'}\n`;
      infoText += `  🕒 মেয়াদ শেষ: ${sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : 'অজানা'}\n`;
      infoText += `  📦 স্ট্যাটাস: ${sub.status === 'active' ? '✅ Active' : '❌ Inactive'}\n`;
      infoText += `-------------------------\n`;
    });

    bot.sendMessage(chatId, infoText);
  });
}
