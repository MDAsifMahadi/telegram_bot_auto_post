import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  telegram_id: { type: Number, required: true },
  activation_key: { type: String, required: true },
  source_channels: { type: [String], default: [] },
  destination_channel: { type: String, required: true },
  expires_at: Date,
  status: { type: String, default: 'active' },
});

export const User = mongoose.model('User', userSchema);



