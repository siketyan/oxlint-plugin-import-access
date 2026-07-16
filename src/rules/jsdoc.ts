import path from "node:path";

import { type Context, type Node as OxlintNode, defineRule } from "@oxlint/plugins";
import {
  type ExportDeclaration,
  type ExportSpecifier,
  type ImportClause,
  type ImportDeclaration,
  type ImportSpecifier,
  type Node,
  type SourceFile,
  SyntaxKind,
  isStringLiteral,
} from "typescript/unstable/ast";
import { API, type Project, type Symbol } from "typescript/unstable/sync";

import { checkSymbolImportability } from "../core/checkSymbolImportability.js";
import { PackageOptions } from "../utils/isInPackage.js";

export type JSDocRuleOptions = {
  /**
   * Whether importing a package-private exports from `index.ts` in a subdirectory.
   */
  indexLoophole: boolean;

  /**
   * Whether importing a package-private exports in a directory from a file of same name.
   */
  filenameLoophole: boolean;

  /**
   * Whether packages importability is restricted to public exports only or not.
   */
  defaultImportability: "public" | "package" | "private";

  /**
   * Whether to treat self-reference as internal or external.
   * When `external`, imports using the self-referencing feature of Node.js are
   * treated as imports from external packages, meaning that they bypass
   * the importability check.
   */
  treatSelfReferenceAs: "internal" | "external";

  /**
   * Array of glob patterns for source paths to exclude from the importability check.
   * Useful for excluding generated files or auto-generated type definitions.
   */
  excludeSourcePatterns?: string[];

  /**
   * Array of glob patterns that specify which directories should be treated as package boundaries.
   * By default, all directories are treated as package boundaries.
   * Use negation patterns (e.g., "!**\/_internal") to exclude certain directories from being package boundaries.
   * Example: ["**", "!**\/_internal"] treats all directories as packages except those named "_internal".
   */
  packageDirectory?: string[];
};

const api = new API();

export default defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Prohibit importing private exports.",
      url: "TODO",
    },
    messages: {
      "no-program":
        "Type information is not available for this file. See https://typescript-eslint.io/getting-started/typed-linting/ for how to set this up.",
      package: "Cannot import a package-private export '{{ identifier }}'",
      "package:reexport": "Cannot re-export a package-private export '{{ identifier }}'",
      private: "Cannot import a private export '{{ identifier }}'",
      "private:reexport": "Cannot re-export a private export '{{ identifier }}'",
    },
    schema: [
      {
        type: "object",
        properties: {
          indexLoophole: {
            type: "boolean",
          },
          filenameLoophole: {
            type: "boolean",
          },
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
            items: {
              type: "string",
            },
          },
          packageDirectory: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [
      {
        indexLoophole: true,
        filenameLoophole: false,
        defaultImportability: "public",
        treatSelfReferenceAs: "external",
        excludeSourcePatterns: [],
        packageDirectory: undefined,
      } as any,
    ],
  },
  create(context) {
    const { options } = context;

    const snapshot = api.updateSnapshot({
      openFiles: [context.filename],
    });

    const project = snapshot.getDefaultProjectForFile(context.filename);
    if (!project) {
      return {};
    }

    const {
      indexLoophole,
      filenameLoophole,
      defaultImportability,
      treatSelfReferenceAs,
      excludeSourcePatterns,
      packageDirectory,
    } = jsDocRuleDefaultOptions(options[0] as JSDocRuleOptions);

    const packageOptions: PackageOptions = {
      indexLoophole,
      filenameLoophole,
      defaultImportability,
      treatSelfReferenceAs,
      excludeSourcePatterns,
      packageDirectory,
      projectDirectory: path.dirname(project.configFileName),
    };

    return {
      ImportSpecifier(node) {
        const sourceFilename = context.filename;
        if (!sourceFilename) {
          return;
        }

        const checker = project.checker;

        const sourceFile = project.program.getSourceFile(sourceFilename);
        if (!sourceFile) {
          throw new Error(`Could not find source file for ${sourceFilename}`);
        }

        const tsNode = findTSNode<ImportSpecifier>(sourceFile, node, SyntaxKind.ImportSpecifier);
        if (!tsNode) {
          console.log("Could not find TS node for ImportSpecifier");
          return;
        }

        const symbol = checker.getSymbolAtLocation(tsNode.name);
        if (symbol) {
          const moduleSpecifier = (tsNode.parent.parent.parent as ImportDeclaration)
            .moduleSpecifier;

          if (!isStringLiteral(moduleSpecifier)) {
            // Should not happen (as of TS 5.1)
            return;
          }

          checkSymbol(context, packageOptions, project, node, tsNode, moduleSpecifier.text, symbol);
        }
      },
      ImportDefaultSpecifier(node) {
        const sourceFilename = context.filename;
        if (!sourceFilename) {
          return;
        }

        const checker = project.checker;

        const sourceFile = project.program.getSourceFile(sourceFilename);
        if (!sourceFile) {
          throw new Error(`Could not find source file for ${sourceFilename}`);
        }

        const tsNode = findTSNode<ImportClause>(sourceFile, node, SyntaxKind.ImportClause);
        if (!tsNode?.name) {
          return;
        }

        const symbol = checker.getSymbolAtLocation(tsNode.name);
        if (symbol) {
          const moduleSpecifier = (tsNode.parent as ImportDeclaration).moduleSpecifier;

          if (!isStringLiteral(moduleSpecifier)) {
            // Should not happen (as of TS 5.1)
            return;
          }

          checkSymbol(context, packageOptions, project, node, tsNode, moduleSpecifier.text, symbol);
        }
      },
      ExportSpecifier(node) {
        const sourceFilename = context.filename;
        if (!sourceFilename) {
          return;
        }

        const checker = project.checker;

        const sourceFile = project.program.getSourceFile(sourceFilename);
        if (!sourceFile) {
          throw new Error(`Could not find source file for ${sourceFilename}`);
        }

        const tsNode = findTSNode<ExportSpecifier>(sourceFile, node, SyntaxKind.ExportSpecifier);
        if (!tsNode) {
          throw new Error("Could not find TS node");
        }

        const symbol = checker.getSymbolAtLocation(tsNode.name);
        if (symbol) {
          const moduleSpecifier = (tsNode.parent.parent as ExportDeclaration).moduleSpecifier;
          if (!moduleSpecifier || !isStringLiteral(moduleSpecifier)) {
            return;
          }

          checkSymbol(
            context,
            packageOptions,
            project,
            node,
            tsNode,
            moduleSpecifier.text,
            symbol,
            true,
          );
        }
      },
    };
  },
});

function findTSNode<T extends Node>(
  sourceFile: SourceFile,
  node: OxlintNode,
  kind: T["kind"],
): T | undefined {
  const { start, end } = node;

  function find(haystack: Node): Node | undefined {
    if (
      haystack.kind === kind &&
      haystack.getStart(sourceFile) === start &&
      haystack.getEnd() === end
    ) {
      return haystack;
    }

    return haystack.forEachChild((child) => {
      const found = find(child);
      if (found) {
        return found;
      }
    });
  }

  return find(sourceFile) as T | undefined;
}

function jsDocRuleDefaultOptions(options: Partial<JSDocRuleOptions> | undefined): JSDocRuleOptions {
  const {
    indexLoophole = true,
    filenameLoophole = false,
    defaultImportability = "public",
    treatSelfReferenceAs = "external",
    excludeSourcePatterns = [],
    packageDirectory = undefined,
  } = options || {};

  return {
    indexLoophole,
    filenameLoophole,
    defaultImportability,
    treatSelfReferenceAs,
    excludeSourcePatterns,
    packageDirectory,
  };
}

function checkSymbol(
  context: Context,
  packageOptions: PackageOptions,
  project: Project,
  originalNode: OxlintNode,
  tsNode: Node,
  moduleSpecifier: string,
  symbol: Symbol,
  reexport = false,
): void {
  const checker = project.checker;
  const exsy = checker.getImmediateAliasedSymbol(symbol);
  if (!exsy) {
    return;
  }

  const checkResult = checkSymbolImportability(
    packageOptions,
    project,
    tsNode.getSourceFile().fileName,
    moduleSpecifier,
    exsy,
  );

  switch (checkResult) {
    case "package": {
      context.report({
        node: originalNode,
        messageId: reexport ? "package:reexport" : "package",
        data: {
          identifier: exsy.name,
        },
      });
      break;
    }
    case "private": {
      context.report({
        node: originalNode,
        messageId: reexport ? "private:reexport" : "private",
        data: {
          identifier: exsy.name,
        },
      });
      break;
    }
  }
}
