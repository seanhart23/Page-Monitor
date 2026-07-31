import crypto from "node:crypto";
import { Installation } from "../models/installation.js";

function hashSecret(secret) {
    return crypto.createHash("sha256").update(secret).digest("hex");
}

export async function registerInstallation(request, response) {
    try {
        const installationId = crypto.randomUUID();
        const installationSecret = crypto.randomBytes(32).toString("hex");

        await Installation.create({ 
            installationId, 
            secretHash: hashSecret(installationSecret) 
        });

        return response.status(201).json({
            success: true,
            data: {
                installationId,
                installationSecret
            }
        });
    } catch (error) {
        console.error("Unable to register installation:", error);

        return response.status(500).json({
            success: false,
            message: "Unable to register installation"
        });
    }
}