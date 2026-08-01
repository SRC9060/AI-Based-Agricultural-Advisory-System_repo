import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const standaloneRoot = resolve(projectRoot, ".next", "standalone");

if (!existsSync(resolve(standaloneRoot, "server.js"))) {
  throw new Error(
    "Standalone server output is missing. Run `npm run build` first.",
  );
}

const staticSource = resolve(projectRoot, ".next", "static");
const staticDestination = resolve(standaloneRoot, ".next", "static");
mkdirSync(resolve(standaloneRoot, ".next"), { recursive: true });
cpSync(staticSource, staticDestination, { recursive: true, force: true });

const publicSource = resolve(projectRoot, "public");
const publicDestination = resolve(standaloneRoot, "public");
if (existsSync(publicSource)) {
  cpSync(publicSource, publicDestination, { recursive: true, force: true });
}

console.log("Standalone frontend assets prepared.");
