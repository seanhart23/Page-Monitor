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

        /*
         * Determines whether the monitor checks the full page
         * or one selected element.
         */
        monitorType: {
            type: String,
            enum: ["page", "element"],
            default: "page",
            required: true
        },

        /*
         * For page monitors, this will normally remain "body".
         * For element monitors, this stores the generated CSS selector.
         */
        contentSelector: {
            type: String,
            trim: true,
            default: "body",
            required: true
        },

        /*
         * Determines which part of the selected element is compared.
         * Start with "text" for element monitors to reduce false alerts.
         */
        comparisonMode: {
            type: String,
            enum: ["text", "html"],
            default: "text"
        },

        /*
         * Optional metadata used to show the user what they selected.
         * This is not required when running the monitor.
         */
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

/*
 * Include contentSelector so one installation can monitor
 * multiple elements on the same URL.
 */
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