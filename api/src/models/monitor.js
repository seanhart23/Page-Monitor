import mongoose from "mongoose";

const monitorSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "Untitled page"
    },

    url: {
      type: String,
      required: true,
      trim: true
    },

    normalizedUrl: {
      type: String,
      required: true,
      unique: true
    },

    enabled: {
      type: Boolean,
      default: true
    },

    checkFrequency: {
      type: String,
      enum: ["hourly", "daily", "weekly"],
      default: "daily"
    },

    lastCheckedAt: {
      type: Date,
      default: null
    },

    lastChangedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const Monitor = mongoose.model("Monitor", monitorSchema);