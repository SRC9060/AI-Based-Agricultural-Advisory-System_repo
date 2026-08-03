import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");
const standaloneApp = join(standalone, "frontend");

async function copyDirectory(source, destination) {
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true });
}

await copyDirectory(join(root, "public"), join(standaloneApp, "public"));
await copyDirectory(join(root, ".next", "static"), join(standaloneApp, ".next", "static"));
