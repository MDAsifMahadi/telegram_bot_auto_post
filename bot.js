import 'dotenv/config';
import mongoose from 'mongoose';
import TelegramBot from 'node-telegram-bot-api';
import { startClient } from './client.js';
import { handleCommand } from './handlers/commandHandler.js';

import { setupCommandHandlers } from './handlers/commandHandler.js';
import { startPolling } from './handlers/pollingHandler.js';

import { startExpiryChecker } from './utils/expiryChecker.js';
import { setupSubscriptionCommands } from './handlers/subscriptionCommandHandler.js';

import server from './dashboard/server.js'; // Dashboard server


const botToken = process.env.BOT_TOKEN;
const mongoUri = process.env.MONGO_URI;

const bot = new TelegramBot(botToken, { polling: true });

// MongoDB কানেকশন
async function connectMongo() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB কানেক্ট হয়েছে');
  } catch (err) {
    console.error('❌ MongoDB কানেক্ট করতে ব্যর্থ:', err.message);
    process.exit(1);
  }
}

// সব কিছু চালু করা
async function init() {
  await connectMongo();
  await startClient(); // GramJS client start
  setupCommandHandlers(bot);   // /start কমান্ড হ্যান্ডলার
  await startPolling(bot);          // এটি অ্যাকটিভ করুন
  startExpiryChecker(bot);
  setupSubscriptionCommands(bot); // সাবস্ক্রিপশন কমান্ড হ্যান্ডলার
  console.log('🚀 Bot চালু হয়েছে!');
}



bot.on('message', async (msg) => {
  if (!msg.text) return;

  if (msg.text.startsWith('/')) {
    await handleCommand(bot, msg);
  }

  // অন্য নরমাল ইনপুট হ্যান্ডল (activation, channel সেটিং ইত্যাদি)
});
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🌐 Dashboard running on http://localhost:${PORT}/keys`);
});

init();
