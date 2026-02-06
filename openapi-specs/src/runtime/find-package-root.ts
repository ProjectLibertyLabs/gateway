import path from "node:path";
import { existsSync } from "node:fs";

export function findPackageRoot(startDir: string): string {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, "package.json");
    if (existsSync(candidate)) return dir;

    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  throw new Error("Could not locate package.json to determine package root.");
}
