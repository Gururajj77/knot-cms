import path from "node:path"
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers"
import { defineConfig } from "vitest/config"
import { TEST_SESSION_SIGNING_SECRET } from "./test/helpers/test-secrets.js"

export default defineConfig(async () => {
    const migrations = await readD1Migrations(path.join(__dirname, "migrations"))

    return {
        plugins: [
            cloudflareTest({
                wrangler: { configPath: "./wrangler.toml" },
                miniflare: {
                    bindings: {
                        TEST_MIGRATIONS: migrations,
                        SESSION_SIGNING_SECRET: TEST_SESSION_SIGNING_SECRET,
                    },
                },
            }),
        ],
        test: {
            setupFiles: ["./test/apply-migrations.ts"],
            include: ["test/**/*.test.ts"],
        },
    }
})
