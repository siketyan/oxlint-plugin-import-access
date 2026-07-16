import * as ts from "typescript/unstable/ast";

export type Tag = {
  name: string;
  text: string;
};

export function getJSDocTags(node: ts.Node): Tag[] | undefined {
  if (!canHaveJsDoc(node)) {
    return undefined;
  }

  return getJsDoc(node).flatMap((jsdoc) => {
    return (
      jsdoc.tags?.map((tag) => {
        return {
          name: tag.tagName.text,
          text: typeof tag.comment === "string" ? tag.comment : tag.comment?.[0].text || "",
        };
      }) ?? []
    );
  });
}

type HasJSDoc =
  | ts.ParameterDeclaration
  | ts.CallSignatureDeclaration
  | ts.ConstructSignatureDeclaration
  | ts.MethodSignatureDeclaration
  | ts.PropertySignatureDeclaration
  | ts.ArrowFunction
  | ts.ParenthesizedExpression
  | ts.SpreadAssignment
  | ts.ShorthandPropertyAssignment
  | ts.PropertyAssignment
  | ts.FunctionExpression
  | ts.LabeledStatement
  | ts.ExpressionStatement
  | ts.VariableStatement
  | ts.FunctionDeclaration
  | ts.ConstructorDeclaration
  | ts.MethodDeclaration
  | ts.PropertyDeclaration
  | ts.GetAccessorDeclaration
  | ts.SetAccessorDeclaration
  | ts.ClassDeclaration
  | ts.ClassExpression
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumMember
  | ts.EnumDeclaration
  | ts.ModuleDeclaration
  | ts.ImportEqualsDeclaration
  | ts.ImportDeclaration
  | ts.NamespaceExportDeclaration
  | ts.ExportAssignment
  | ts.IndexSignatureDeclaration
  | ts.FunctionTypeNode
  | ts.ConstructorTypeNode
  // | ts.JsDocFunctionType
  | ts.ExportDeclaration
  | ts.NamedTupleMember
  | ts.EndOfFile;

function canHaveJsDoc(node: ts.Node): node is HasJSDoc {
  const kind = node.kind;
  switch (kind) {
    case ts.SyntaxKind.Parameter:
    case ts.SyntaxKind.CallSignature:
    case ts.SyntaxKind.ConstructSignature:
    case ts.SyntaxKind.MethodSignature:
    case ts.SyntaxKind.PropertySignature:
    case ts.SyntaxKind.ArrowFunction:
    case ts.SyntaxKind.ParenthesizedExpression:
    case ts.SyntaxKind.SpreadAssignment:
    case ts.SyntaxKind.ShorthandPropertyAssignment:
    case ts.SyntaxKind.PropertyAssignment:
    case ts.SyntaxKind.FunctionExpression:
    case ts.SyntaxKind.LabeledStatement:
    case ts.SyntaxKind.ExpressionStatement:
    case ts.SyntaxKind.VariableStatement:
    case ts.SyntaxKind.FunctionDeclaration:
    case ts.SyntaxKind.Constructor:
    case ts.SyntaxKind.MethodDeclaration:
    case ts.SyntaxKind.PropertyDeclaration:
    case ts.SyntaxKind.GetAccessor:
    case ts.SyntaxKind.SetAccessor:
    case ts.SyntaxKind.ClassDeclaration:
    case ts.SyntaxKind.ClassExpression:
    case ts.SyntaxKind.InterfaceDeclaration:
    case ts.SyntaxKind.TypeAliasDeclaration:
    case ts.SyntaxKind.EnumMember:
    case ts.SyntaxKind.EnumDeclaration:
    case ts.SyntaxKind.ModuleDeclaration:
    case ts.SyntaxKind.ImportEqualsDeclaration:
    case ts.SyntaxKind.ImportDeclaration:
    case ts.SyntaxKind.NamespaceExportDeclaration:
    case ts.SyntaxKind.ExportAssignment:
    case ts.SyntaxKind.IndexSignature:
    case ts.SyntaxKind.FunctionType:
    case ts.SyntaxKind.ConstructorType:
    // case ts.SyntaxKind.JSDocFunctionType:
    case ts.SyntaxKind.ExportDeclaration:
    case ts.SyntaxKind.NamedTupleMember:
    case ts.SyntaxKind.EndOfFile:
      return true;
    default:
      return false;
  }
}

function getJsDoc(node: ts.Node): ts.JSDoc[] {
  if (!node.jsDoc?.length) {
    return [];
  }

  return node.jsDoc.filter((n): n is ts.JSDoc => isJsDoc(n));
}

function isJsDoc(node: ts.Node): node is ts.JSDoc {
  return node.kind === ts.SyntaxKind.JSDoc;
}
