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
      // এখন User গুলো থেকে সেই সাবস্ক্রিপশন খুঁজে বের করবো যেটার activation_key মিলে এবং active
      const users = await User.find({
        'subscription.activation_key': key.key,
        'subscription.status': 'active',
      });

      for (const user of users) {
        // ইউজারের subscription এর মধ্যে যেই সাবস্ক্রিপশনের এক্টিভেশন কী মিলে সেটার status 'inactive' করে দিবো
        let updated = false;
        user.subscription = user.subscription.map(sub => {
          if (sub.activation_key === key.key && sub.status === 'active') {
            updated = true;
            return { ...sub.toObject(), status: 'inactive' };
          }
          return sub;
        });

        if (updated) {
          await user.save();

          try {
            await bot.sendMessage(
              user.telegram_id,
              `🔒 আপনার সাবস্ক্রিপশন (Key: ${key.key}) মেয়াদ শেষ হয়েছে। নতুন কী সংগ্রহ করতে আমাদের সাথে যোগাযোগ করুন।`
            );
          } catch (err) {
            console.warn(`⚠️ ইউজারকে মেসেজ পাঠানো যায়নি (${user.telegram_id}):`, err.message);
          }

          console.log(`🔒 মেয়াদ শেষ: ${key.key} ইউজার: ${user.telegram_id}`);
        }
      }
    }
  });

  console.log('✅ Expiry Checker cron চালু হয়েছে');
}
