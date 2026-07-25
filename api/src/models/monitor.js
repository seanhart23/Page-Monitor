import mongoose from "mongoose";

const monitorSchema = new mongoose.Schema(
    {
        installationId: {
            type: String,
            required: true,
            index: true
        },

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
            unique: true,
            index: true
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

         contentSelector: {
            type: String,
            trim: true,
            default: "body"
        },

        ignoreSelectors: {
            type: [String],
            default: []
        },

        lastFingerprint: {
            type: String,
            default: null
        },

        lastCheckedAt: {
            type: Date,
            default: null
        },

        lastChangedAt: {
            type: Date,
            default: null
        },

        lastStatus: {
            type: String,
            enum: ["pending", "success", "failed"],
            default: "pending"
        },

        lastError: {
            type: String,
            default: null
        },

        changeCount: {
            type: Number,
            default: 0,
            min: 0
        },
    },
    {
        timestamps: true
    }
);

export const Monitor = mongoose.model("Monitor", monitorSchema);