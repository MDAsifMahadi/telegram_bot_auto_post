import fs from 'fs';
import { downloadMedia, cleanupMedia } from './downloader.js';
import { formatMessage } from './formatter.js';
import { User } from '../models/user.js';

// একক মেসেজ ফরওয়ার্ড
export async function forwardSingleMessage(bot, message, destination) {
  const isAdmin = await isBotAdmin(bot, destination);
  if (!isAdmin) {
    console.warn(`❌ বট @${destination} এ অ্যাডমিন না`);
    try {
      const user = await User.findOne({ destination_channel: destination });
      if (user) {
        await bot.sendMessage(user.telegram_id, `⚠️ দয়া করে বটকে ${destination} চ্যানেলে অ্যাডমিন করুন, না হলে পোস্ট করতে পারবো না।`);
      }
    } catch (err) {
      console.error('❌ ইউজারকে নোটিফিকেশন পাঠাতে সমস্যা:', err.message);
    }
    return;
  }

  let file = null;
  try {
    if (message.media) {
      file = await downloadMedia(message);
      if (!file) return;

      const stats = fs.statSync(file.path);
      const sizeMB = stats.size / (1024 * 1024);
      const options = { caption: file.caption, parse_mode: 'HTML' };

      if (sizeMB > 50) {
        console.log(`⚠️ বড় ফাইল (${sizeMB.toFixed(2)}MB), userbot দিয়ে পাঠানো উচিত`);
        return;
      }

      const stream = fs.createReadStream(file.path);
      const isVideo = file.mime.startsWith('video');
      if (isVideo) options.supports_streaming = true;

      await (isVideo
        ? bot.sendVideo(destination, stream, options)
        : bot.sendPhoto(destination, stream, options));
    } else if (message.message) {
      const text = formatMessage(message.message, message.entities || []);
      await bot.sendMessage(destination, text, { parse_mode: 'HTML' });
    }
  } catch (err) {
    console.error('❌ ফরওয়ার্ড সমস্যা:', err.message);
  } finally {
    if (file) cleanupMedia(file.path);
  }
}

// মিডিয়া গ্রুপ ফরওয়ার্ড
export async function forwardMediaGroup(bot, messages, destination) {
  const isAdmin = await isBotAdmin(bot, destination);
  if (!isAdmin) {
    console.warn(`❌ বট @${destination} এ অ্যাডমিন না`);
    try {
      const user = await User.findOne({ destination_channel: destination });
      if (user) {
        await bot.sendMessage(user.telegram_id, `⚠️ দয়া করে বটকে ${destination} চ্যানেলে অ্যাডমিন করুন, না হলে পোস্ট করতে পারবো না।`);
      }
    } catch (err) {
      console.error('❌ ইউজারকে নোটিফিকেশন পাঠাতে সমস্যা:', err.message);
    }
    return;
  }

  try {
    // 🔍 ক্যাপশন যেখান থেকে পাওয়া যাবে সেটা আগে বের করি
    const captionMessage = messages.find(m => m.message?.length > 0);
    const caption = captionMessage
      ? formatMessage(captionMessage.message, captionMessage.entities || [])
      : '';

    const mediaItems = [];

    const addedMsgIds = new Set(); // ✅ ডুপ্লিকেট মেসেজ এড়াতে

    for (const msg of messages) {
      if (addedMsgIds.has(msg.id)) continue; // skip duplicates
      addedMsgIds.add(msg.id);

      const file = await downloadMedia(msg);
      if (file) {
        const isVideo = file.mime.startsWith('video');
        mediaItems.push({
          type: isVideo ? 'video' : 'photo',
          media: fs.createReadStream(file.path),
          caption: undefined, // ✅ শুধুমাত্র প্রথম ফাইল caption পাবে নিচে
          parse_mode: 'HTML',
          ...(isVideo ? { supports_streaming: true } : {}),
          __path: file.path,
        });
      }
    }

    if (mediaItems.length === 0) return;

    // ✅ কেবলমাত্র প্রথম media item এ ক্যাপশন বসাও
    if (caption) mediaItems[0].caption = caption;

    await bot.sendMediaGroup(destination, mediaItems);

    // ✅ সব ফাইল ডিলিট
    for (const item of mediaItems) {
      if (item.__path && fs.existsSync(item.__path)) {
        fs.unlinkSync(item.__path);
        console.log(`🧹 ডিলিট: ${item.__path}`);
      }
    }
  } catch (err) {
    console.error('❌ মিডিয়া গ্রুপ পাঠাতে সমস্যা:', err.message);
  }
}



// বট ওই চ্যানেলের অ্যাডমিন কিনা যাচাই
async function isBotAdmin(bot, channelUsername) {
  try {
    const me = await bot.getMe();
    const admins = await bot.getChatAdministrators(channelUsername);
    return admins.some(admin => admin.user.id === me.id);
  } catch (err) {
    console.warn(`⚠️ অ্যাডমিন স্ট্যাটাস চেক করতে পারিনি (${channelUsername}):`, err.message);
    return false;
  }
}
