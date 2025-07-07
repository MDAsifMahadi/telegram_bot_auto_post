import mongoose from 'mongoose';

const keySchema = new mongoose.Schema({
  key: String,
  expires_at: Date,
  used: { type: Boolean, default: false },
});

export const Key = mongoose.model('Key', keySchema);
