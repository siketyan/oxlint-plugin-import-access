import { minimatch } from "minimatch";
import path from "node:path";
import { defineRule, getParserServices } from "corsa-oxlint";
import type { CorsaNode, CorsaSymbol } from "corsa-oxlint";
import { getAccessOfJsDocs } from "../utils/get-access-of-jsdoc.js";
import { getJsDocTagsFromCorsaNode } from "../utils/get-jsdoc-tags.js";
import type { PackageOptions } from "../utils/is-in-package.js";
import { isInPackage } from "../utils/is-in-package.js";
import { lookupPackageJson } from "../utils/lookup-package-json.js";

export type JSDocRuleOptions = {
  indexLoophole: boolean;
  filenameLoophole: boolean;
  defaultImportability: "public" | "package" | "private";
  treatSelfReferenceAs: "internal" | "external";
  excludeSourcePatterns?: string[];
  packageDirectory?: string[];
};

type MessageId =
  | "no-program"
  | "package"
  | "package:reexport"
  | "private"
  | "private:reexport";

export function jsDocRuleDefaultOptions(
  options: Partial<JSDocRuleOptions> | undefined,
): JSDocRuleOptions {
  const {
    indexLoophole = true,
    filenameLoophole = false,
    defaultImportability = "public",
    treatSelfReferenceAs = "external",
    excludeSourcePatterns = [],
    packageDirectory = undefined,
  } = options ?? {};
  return {
    indexLoophole,
    filenameLoophole,
    defaultImportability,
    treatSelfReferenceAs,
    excludeSourcePatterns,
    packageDirectory,
  };
}

const possibleSubpathImportFromPackage =
  /^(?![./\\])([^/\\]*)(?:$|[/\\][^/\\])/;

function checkIfImportIsSelfReference(
  moduleSpecifier: string,
  packageName: string,
): boolean {
  return (
    moduleSpecifier === packageName ||
    moduleSpecifier.startsWith(`${packageName}/`)
  );
}

// TypeScript SymbolFlags.Alias = 2097152
const ALIAS_FLAG = 2097152;

// eslint-disable-next-line import-access/jsdoc
export const jsdocRule = defineRule<MessageId, [Partial<JSDocRuleOptions>?]>({
  meta: {
    type: "problem",
    docs: {
      description: "Prohibit importing package-private exports.",
      requiresTypeChecking: true,
      url: "https://github.com/bitkey-service/oxlint-plugin-import-access",
    },
    messages: {
      "no-program":
        "Type information is not available. Configure corsaOxlint settings to enable type-aware linting.",
      package: "Cannot import a package-private export '{{ identifier }}'",
      "package:reexport":
        "Cannot re-export a package-private export '{{ identifier }}'",
      private: "Cannot import a private export '{{ identifier }}'",
      "private:reexport":
        "Cannot re-export a private export '{{ identifier }}'",
    },
    schema: [
      {
        type: "object",
        properties: {
          indexLoophole: { type: "boolean" },
          filenameLoophole: { type: "boolean" },
          defaultImportability: {
            type: "string",
            enum: ["public", "package", "private"],
          },
          treatSelfReferenceAs: {
            type: "string",
            enum: ["external", "internal"],
          },
          excludeSourcePatterns: {
            type: "array",
            items: { type: "string" },
          },
          packageDirectory: {
            type: "array",
            items: { type: "string" },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      indexLoophole: true,
      filenameLoophole: false,
      defaultImportability: "public",
      treatSelfReferenceAs: "external",
      excludeSourcePatterns: [],
      packageDirectory: undefined,
    },
  ],
  create(context) {
    const opts = jsDocRuleDefaultOptions(
      context.options[0] as Partial<JSDocRuleOptions> | undefined,
    );
    const {
      indexLoophole,
      filenameLoophole,
      defaultImportability,
      treatSelfReferenceAs,
      excludeSourcePatterns,
      packageDirectory,
    } = opts;

    let services: ReturnType<typeof getParserServices> | undefined;
    try {
      services = getParserServices(context, true);
    } catch {
      return {};
    }

    if (!services) return {};

    const checker = services.program.getTypeChecker();
    const projectDirectory = services.program.getCurrentDirectory();

    const packageOptions: PackageOptions = {
      indexLoophole,
      filenameLoophole,
      defaultImportability,
      treatSelfReferenceAs,
      excludeSourcePatterns,
      packageDirectory,
      projectDirectory,
    };

    function resolveSymbolToExporter(
      rawSymbol: CorsaSymbol,
    ): { symbol: CorsaSymbol; declNode: CorsaNode } | null {
      const declId =
        rawSymbol.declarations[0] ?? rawSymbol.valueDeclaration;
      if (!declId) return null;

      const declNode = checker.getNodeById(declId);
      if (!declNode) return null;

      // If the declaration is in a different file, we have the actual exporter
      if (declNode.fileName !== context.filename) {
        return { symbol: rawSymbol, declNode };
      }

      // The symbol is a local alias (its declaration is in the current file).
      // Attempt to resolve via the type system when the alias flag is set.
      if (rawSymbol.flags & ALIAS_FLAG) {
        const type = checker.getDeclaredTypeOfSymbol(rawSymbol);
        if (type) {
          const resolvedSymbol = checker.getSymbolOfType(type);
          if (resolvedSymbol) {
            const resolvedDeclId =
              resolvedSymbol.declarations[0] ??
              resolvedSymbol.valueDeclaration;
            if (resolvedDeclId) {
              const resolvedDeclNode = checker.getNodeById(resolvedDeclId);
              if (
                resolvedDeclNode &&
                resolvedDeclNode.fileName !== context.filename
              ) {
                return {
                  symbol: resolvedSymbol,
                  declNode: resolvedDeclNode,
                };
              }
            }
          }
        }
      }

      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function checkImport(node: any, moduleSpecifier: string, reexport: boolean): void {
      const sourceFilename = context.filename;

      // Skip self-references when treatSelfReferenceAs is "external"
      if (
        treatSelfReferenceAs === "external" &&
        possibleSubpathImportFromPackage.test(moduleSpecifier)
      ) {
        const lookupResult = lookupPackageJson(sourceFilename);
        if (
          lookupResult?.packageJson.name != null &&
          checkIfImportIsSelfReference(
            moduleSpecifier,
            lookupResult.packageJson.name as string,
          )
        ) {
          return;
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const rawSymbol = services!.getSymbolAtLocation(node);
      if (!rawSymbol) return;

      const resolved = resolveSymbolToExporter(rawSymbol);
      if (!resolved) return;

      const { symbol, declNode } = resolved;
      const exporterFileName = declNode.fileName;

      // Skip files from external libraries (node_modules)
      if (exporterFileName.includes("/node_modules/")) return;

      // Check excludeSourcePatterns
      if (excludeSourcePatterns && excludeSourcePatterns.length > 0) {
        const relativePath = path.relative(projectDirectory, exporterFileName);
        if (
          excludeSourcePatterns.some((pattern) =>
            minimatch(relativePath, pattern, { dot: true }),
          )
        ) {
          return;
        }
      }

      // Read source file and extract JSDoc tags from the declaration position
      const sourceFile = services!.program.getSourceFile(exporterFileName);
      if (!sourceFile) return;

      const tags = getJsDocTagsFromCorsaNode(sourceFile.text, declNode);
      const access = getAccessOfJsDocs(tags, defaultImportability);

      if (access === "public") return;

      if (access === "private") {
        context.report({
          node,
          messageId: reexport ? "private:reexport" : "private",
          data: { identifier: symbol.name },
        });
        return;
      }

      // access === "package": check if importer is in the same package as exporter
      const inPackage = isInPackage(
        sourceFilename,
        exporterFileName,
        packageOptions,
      );
      if (!inPackage) {
        context.report({
          node,
          messageId: reexport ? "package:reexport" : "package",
          data: { identifier: symbol.name },
        });
      }
    }

    return {
      ImportSpecifier(node) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const importDecl = (node as any).parent;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        checkImport(node, importDecl.source.value as string, false);
      },

      ImportDefaultSpecifier(node) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const importDecl = (node as any).parent;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        checkImport(node, importDecl.source.value as string, false);
      },

      ExportSpecifier(node) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const exportDecl = (node as any).parent;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (!exportDecl.source) return;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        checkImport(node, exportDecl.source.value as string, true);
      },
    };
  },
});

export default jsdocRule;
