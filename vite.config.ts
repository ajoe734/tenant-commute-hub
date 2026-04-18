import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "node:fs";
import path from "path";
import { componentTagger } from "lovable-tagger";

function resolveCoreRepoRoot(): string | null {
  if (process.env.DRTS_DISABLE_CORE_ALIAS === "1") {
    return null;
  }

  const candidates = [
    process.env.DRTS_CORE_REPO_PATH,
    path.resolve(__dirname, "../drts-fleet-platform"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    const apiClientEntry = path.resolve(
      candidate,
      "packages/api-client/src/index.ts",
    );
    const contractsEntry = path.resolve(
      candidate,
      "packages/contracts/src/index.ts",
    );
    if (fs.existsSync(apiClientEntry) && fs.existsSync(contractsEntry)) {
      return candidate;
    }
  }

  return null;
}

const coreRepoRoot = resolveCoreRepoRoot();
const fallbackApiClient = path.resolve(
  __dirname,
  "./src/lib/drts-shim/api-client.ts",
);
const fallbackContracts = path.resolve(
  __dirname,
  "./src/lib/drts-shim/contracts.ts",
);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: [path.resolve(__dirname, ".."), ...(coreRepoRoot ? [coreRepoRoot] : [])],
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@drts/api-client": coreRepoRoot
        ? path.resolve(coreRepoRoot, "packages/api-client/src/index.ts")
        : fallbackApiClient,
      "@drts/contracts": coreRepoRoot
        ? path.resolve(coreRepoRoot, "packages/contracts/src/index.ts")
        : fallbackContracts,
    },
  },
}));
