import crypto from "node:crypto";
import { Installation } from "../models/installation.js";

function hashSecret(secret) {
    return crypto
        .createHash("sha256")
        .update(secret)
        .digest("hex");
}

export async function authenticateInstallation(
    request,
    response,
    next
) {
    try {
        const installationId =
            request.get("X-Installation-Id");

        const installationSecret =
            request.get("X-Installation-Secret");

        if (!installationId || !installationSecret) {
            return response.status(401).json({
                success: false,
                message: "Installation credentials are required"
            });
        }

        const installation = await Installation.findOne({
            installationId
        });

        if (!installation) {
            return response.status(401).json({
                success: false,
                message: "Invalid installation credentials"
            });
        }

        const incomingSecretHash =
            hashSecret(installationSecret);

        const validSecret = crypto.timingSafeEqual(
            Buffer.from(incomingSecretHash, "hex"),
            Buffer.from(installation.secretHash, "hex")
        );

        if (!validSecret) {
            return response.status(401).json({
                success: false,
                message: "Invalid installation credentials"
            });
        }

        installation.lastSeenAt = new Date();
        await installation.save();

        request.installation = installation;

        next();
    } catch (error) {
        console.error(
            "Installation authentication failed:",
            error
        );

        return response.status(500).json({
            success: false,
            message: "Unable to authenticate installation"
        });
    }
}