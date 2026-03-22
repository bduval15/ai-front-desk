import mongoose from 'mongoose';

const CallSchema = new mongoose.Schema({
  userId: { type: String, required: true }, 
  userEmail: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  goal: { type: String, required: true },
  transcript: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Call = mongoose.model('Call', CallSchema);
export default Call;