import * as path from "path";
import * as fs from "fs";

export function getBasePublicPath(): string {
    // Use a different base path for tests if NODE_ENV is 'test'
    if (process.env.NODE_ENV === "test") {
        return path.join(__dirname, `../public`);
    }

    // Check for assets in the bundled location (e.g. dist/assets)
    // This works when the extension is bundled and assets are copied next to the bundle
    const bundledPath = path.join(__dirname, "public");
    if (fs.existsSync(bundledPath)) {
        return bundledPath;
    }

    // Fallback to development/library structure (e.g. packages/septic/assets)
    // This works when running via ts-node or from the compiled lib folder
    return path.join(__dirname, "../public");
}
