/**
 * Generate a project-scoped license key.
 * Usage: LICENSE_SIGNING_SECRET=xxx npx tsx scripts/generate-license.ts <framer-project-url>
 */
import { createLicenseKey } from "@notion-framer/shared"

const secret = process.env.LICENSE_SIGNING_SECRET
const projectUrl = process.argv[2]

if (!secret || !projectUrl) {
    console.error("Usage: LICENSE_SIGNING_SECRET=... tsx scripts/generate-license.ts <framer-project-url>")
    process.exit(1)
}

const key = await createLicenseKey(secret, { projectUrl })
console.log(key)
