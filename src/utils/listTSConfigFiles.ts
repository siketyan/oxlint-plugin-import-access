import { readdirSync } from "node:fs";
import { join } from "node:path";

export function listTSConfigFiles(path: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.startsWith("tsconfig.") && entry.name.endsWith(".json")) {
      files.push(join(entry.parentPath, entry.name));
    } else if (entry.isDirectory() && entry.name !== "node_modules") {
      files.push(...listTSConfigFiles(join(path, entry.name)));
    }
  }

  return files;
}
