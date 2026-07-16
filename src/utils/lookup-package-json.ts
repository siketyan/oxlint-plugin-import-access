import { readFileSync } from "node:fs";
import path from "node:path";

type PackageJson = {
  name?: string;
  [key: string]: unknown;
};

type LookupResult = {
  packageJson: PackageJson;
  packageJsonPath: string;
  dir: string;
} | null;

export function lookupPackageJson(file: string): LookupResult {
  const absolutePath = path.resolve(file);
  const { root } = path.parse(absolutePath);
  let dir = path.dirname(absolutePath);

  while (root !== dir) {
    const packageJsonPath = path.join(dir, "package.json");
    try {
      const packageJson = JSON.parse(
        readFileSync(packageJsonPath, "utf-8"),
      ) as PackageJson;
      return { packageJson, packageJsonPath, dir };
    } catch (e) {
      if (
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        (e as NodeJS.ErrnoException).code !== "ENOENT"
      ) {
        throw e;
      }
    }
    dir = path.dirname(dir);
  }

  return null;
}
