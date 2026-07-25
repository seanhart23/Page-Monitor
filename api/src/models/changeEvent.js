import mongoose from "mongoose";

const changeEventSchema = new mongoose.Schema(
    {
        monitorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Monitor",
            required: true,
            index: true
        },

        installationId: {
            type: String,
            required: true,
            index: true
        },

        previousFingerprint: {
            type: String,
            default: null
        },

        newFingerprint: {
            type: String,
            required: true
        },

        summary: {
            type: String,
            default: "Page content changed"
        },

        checkedAt: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    {
        timestamps: true
    }
);

changeEventSchema.index({
    installationId: 1,
    monitorId: 1,
    checkedAt: -1
});

export const ChangeEvent = mongoose.model(
    "ChangeEvent",
    changeEventSchema
);