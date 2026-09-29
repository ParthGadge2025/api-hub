import mongoose from "mongoose";

const sourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    url: { type: String, required: true, match: /^https?:\/\//i },
    authType: { type: String, enum: ["none", "header", "query"], default: "none" },
    authName: { type: String, default: "" }, // header or query-param name, e.g. x-api-key
    apiKey: { type: String, select: false, default: "" }, // never sent to the browser
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Source", sourceSchema);
