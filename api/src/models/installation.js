import mongoose from "mongoose";

const installationSchema = new mongoose.Schema(
    {
        installationId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        secretHash: {
            type: String,
            required: true
        },

        plan: {
            type: String,
            enum: ["free", "pro"],
            default: "free"
        },

        linkedUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        lastSeenAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

export const Installation = mongoose.model("Installation", installationSchema);