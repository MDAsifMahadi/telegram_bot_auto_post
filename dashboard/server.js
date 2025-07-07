import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import { Key } from '../models/key.js';
import { User } from '../models/user.js';

const app = express();


// __dirname simulation for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connect
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/telegram_reposter')
  .then(() => console.log('✅ Dashboard MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

// Home - Keys list
app.get('/keys', async (req, res) => {
  const keys = await Key.find().sort({ createdAt: -1 });
  res.render('index', { keys });
});

// Add new key
app.post('/keys', async (req, res) => {
  const { days } = req.body;
  if (!days || isNaN(days) || days <= 0) {
    return res.redirect('/keys');
  }
  const expires_at = new Date(Date.now() + parseInt(days) * 24 * 60 * 60 * 1000);
  const key = nanoid(12);

  await Key.create({ key, expires_at, used: false });
  res.redirect('/keys');
});

// Delete key
app.post('/keys/delete/:id', async (req, res) => {
try {
  const activation_key = await Key.findById(req.params.id);
  console.log(activation_key)
  if (!activation_key) {  
    return res.redirect('/keys');
  }
  const user = await User.findOne({ activation_key: activation_key.key });
  if (user) {
    await User.findByIdAndDelete(user._id);
  }
  await Key.findByIdAndDelete(req.params.id);

} catch (error) {
  console.error('❌ Error deleting key:', error.message);
  res.status(500).send('Internal Server Error');
}
});

// Toggle key used status
app.post('/keys/toggle/:id', async (req, res) => {
  const key = await Key.findById(req.params.id);
  if (key) {
    key.used = !key.used;
    await key.save();
  }
  res.redirect('/keys');
});

export default app;
