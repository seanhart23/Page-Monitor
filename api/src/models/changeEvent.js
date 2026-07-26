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
        },

        changeType: {
            type: String,
            enum: [
                "added",
                "removed",
                "modified",
                "none"
            ],
            default: "modified"
        },

        removedText: {
            type: String,
            default: ""
        },

        addedText: {
            type: String,
            default: ""
        },

        beforeContext: {
            type: String,
            default: ""
        },

        afterContext: {
            type: String,
            default: ""
        },

        removedWordCount: {
            type: Number,
            default: 0
        },

        addedWordCount: {
            type: Number,
            default: 0
        },

        wasTruncated: {
            type: Boolean,
            default: false
        },
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