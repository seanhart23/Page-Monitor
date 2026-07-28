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

        icon: {
            type: String,
            trim: true
        },

        normalizedUrl: {
            type: String,
            required: true,
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

        checkInterval: {
            type: Number,
            default: 30,
            min: 1
        },

        monitorType: {
            type: String,
            enum: ["page", "element"],
            default: "page",
            required: true
        },

        contentSelector: {
            type: String,
            trim: true,
            default: "body",
            required: true
        },

        comparisonMode: {
            type: String,
            enum: ["text", "html"],
            default: "text"
        },

        selectedElement: {
            tagName: {
                type: String,
                trim: true,
                default: null
            },

            previewText: {
                type: String,
                trim: true,
                default: null
            }
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

        lastCheckChanged: {
            type: Boolean,
            default: false
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

        lastContent: {
            type: String,
            default: "",
            select: false
        },

        changeCount: {
            type: Number,
            default: 0,
            min: 0
        },

        notificationPending: {
            type: Boolean,
            default: false
        },

        lastNotifiedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

monitorSchema.index(
    {
        installationId: 1,
        normalizedUrl: 1,
        contentSelector: 1
    },
    {
        unique: true
    }
);

export const Monitor = mongoose.model("Monitor", monitorSchema);