import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  telegram_id: { type: Number, required: true },
  subscription: [
    {
      activation_key: { type: String, required: true },
      sources: { type: [String], default: [] },
      destination: { type: String, required: true },
      expires_at: Date,
      status: { type: String, default: 'active' }
    }
  ],
});

export const User = mongoose.model('User', userSchema);