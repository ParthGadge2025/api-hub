import mongoose from "mongoose";

const checkSchema = new mongoose.Schema({
  source: { type: mongoose.Schema.Types.ObjectId, ref: "Source", index: true },
  ok: Boolean,
  status: Number,
  ms: Number,
  at: { type: Date, default: Date.now, index: { expireAfterSeconds: 7 * 24 * 3600 } }, // keep 7 days
});

export default mongoose.model("Check", checkSchema);
