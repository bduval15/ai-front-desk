import mongoose from 'mongoose';

const TranscriptTurnSchema = new mongoose.Schema({
  speaker: { type: String, required: true },
  text: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const CallSchema = new mongoose.Schema({
  userId: { type: String, required: true }, 
  userEmail: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  goal: { type: String, required: true },
  transcript: { type: String, default: '' },
  rawTranscript: { type: String, default: '' },
  formattedTranscript: { type: String, default: '' },
  summary: { type: String, default: '' },
  callStatus: { type: String, default: 'queued' },
  transcriptProcessingStatus: { type: String, default: 'pending' },
  processingError: { type: String, default: '' },
  structuredData: { type: mongoose.Schema.Types.Mixed, default: {} },
  provider: { type: String, default: 'gemini' },
  providerCallSid: { type: String, default: '' },
  answeredBy: { type: String, default: '' },
  durationSeconds: { type: Number, default: 0 },
  transcriptEntries: { type: [TranscriptTurnSchema], default: [] },
  rawTelephonyData: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

CallSchema.pre('save', function keepTranscriptMirrors(next) {
  if (!this.rawTranscript && this.transcript) {
    this.rawTranscript = this.transcript;
  }

  if (!this.transcript && this.formattedTranscript) {
    this.transcript = this.formattedTranscript;
  }

  next();
});

const Call = mongoose.model('Call', CallSchema);
export default Call;
