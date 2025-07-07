import cron from 'node-cron';
import { Key } from '../models/key.js';
import { User } from '../models/user.js';

export function startExpiryChecker(bot) {
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Expiry Checker চলেছে...');

    const now = new Date();
    const expiredKeys = await Key.find({
      expires_at: { $lte: now },
      used: true,
    });

    for (const key of expiredKeys) {
      const user = await User.findOne({ activation_key: key.key }); // ✅ আপডেট
      if (!user) continue;

      // ইউজার নিষ্ক্রিয় করি
      await User.updateOne({ _id: user._id }, { $set: { status: 'inactive' } });

      // নোটিফিকেশন পাঠাই
      try {
        await bot.sendMessage(
          user.telegram_id,
          '🔒 আপনার সাবস্ক্রিপশন মেয়াদ শেষ হয়েছে। নতুন কী সংগ্রহ করতে আমাদের সাথে যোগাযোগ করুন।'
        );
      } catch (err) {
        console.warn(`⚠️ ইউজারকে মেসেজ পাঠানো যায়নি (${user.telegram_id}):`, err.message);
      }

      console.log(`🔒 মেয়াদ শেষ: ${key.key}`);
    }
  });

  console.log('✅ Expiry Checker cron চালু হয়েছে');
}
