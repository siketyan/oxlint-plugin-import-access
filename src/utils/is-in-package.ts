import { minimatch } from "minimatch";
import path from "node:path";

export type PackageOptions = {
  readonly indexLoophole: boolean;
  readonly filenameLoophole: boolean;
  readonly defaultImportability: "public" | "package" | "private";
  readonly treatSelfReferenceAs: "internal" | "external";
  readonly excludeSourcePatterns?: readonly string[];
  readonly packageDirectory?: readonly string[];
  readonly projectDirectory?: string;
};

const indexFileRegExp = /\/index\.[cm]?[jt]sx?$/;

function isPackageDirectory(
  dir: string,
  patterns: readonly string[],
  projectDirectory?: string,
): boolean {
  const dirName = path.basename(dir);
  const relativePath = projectDirectory
    ? path.relative(projectDirectory, dir)
    : dir;
  let matched = false;

  for (const pattern of patterns) {
    if (pattern.startsWith("!")) {
      const positivePattern = pattern.slice(1);
      if (
        minimatch(dirName, positivePattern) ||
        minimatch(relativePath, positivePattern)
      ) {
        return false;
      }
    } else {
      if (minimatch(dirName, pattern) || minimatch(relativePath, pattern)) {
        matched = true;
      }
    }
  }

  return matched;
}

function findPackageDirectory(
  filePath: string,
  patterns: readonly string[],
  projectDirectory?: string,
): string {
  let dir = path.dirname(filePath);
  const root = path.parse(dir).root;

  while (dir !== root) {
    if (isPackageDirectory(dir, patterns, projectDirectory)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return path.dirname(filePath);
}

function getPackageDirectory(
  filePath: string,
  packageOptions: PackageOptions,
): string {
  if (
    packageOptions.packageDirectory &&
    packageOptions.packageDirectory.length > 0
  ) {
    return findPackageDirectory(
      filePath,
      packageOptions.packageDirectory,
      packageOptions.projectDirectory,
    );
  }
  return path.dirname(filePath);
}

export function isInPackage(
  importer: string,
  exporter: string,
  packageOptions: PackageOptions,
): boolean {
  if (packageOptions.indexLoophole) {
    const match = exporter.match(indexFileRegExp);
    if (match) {
      exporter = exporter.slice(0, -match[0].length);
    }
  }

  const importerPackageDir = getPackageDirectory(importer, packageOptions);
  const exporterPackageDir = getPackageDirectory(exporter, packageOptions);

  if (importerPackageDir === exporterPackageDir) return true;

  if (packageOptions.filenameLoophole) {
    const rel = path.relative(
      path.dirname(importer),
      path.dirname(exporter),
    );
    if (rel === path.basename(importer, path.extname(importer))) return true;
  }

  // Check if importer is in a subdirectory of the exporter's package
  const rel = path.relative(exporterPackageDir, importerPackageDir);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}
