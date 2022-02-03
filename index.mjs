import { promises as fs } from "fs";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import types from "@babel/types";
import _ from "lodash";
import path from "path";
import isPropValid from "@emotion/is-prop-valid";
import FastGlob from "fast-glob";

function startsWithCapital(word = "a") {
  return word.charAt(0) === word.charAt(0).toUpperCase();
}

(async function () {
  const componentBase = "/Users/iv0697/Code/DealerPlatform/src/components/*";
  const translationBase = "/Users/iv0697/Code/DealerPlatform/public/locales/en";

  const dirs = await FastGlob(componentBase, { onlyDirectories: true });

  for (let dirIndex = 0; dirIndex < dirs.length; dirIndex++) {
    const dirPath = dirs[dirIndex];
    const files = await FastGlob(dirPath + "/**/*.js");

    const translations = {};

    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const filePath = files[fileIndex];
      const code = await fs.readFile(filePath, "utf-8");
      console.log("Processing:", filePath);

      try {
        const ast = parser.parse(code, {
          sourceType: "module",
          plugins: ["jsx", ["decorators", { decoratorsBeforeExport: false }]],
        });
        let hasTranslations = false;
        let isClassComp = false;
        let name = "";

        traverse.default(ast, {
          enter(nodePath) {
            // if (nodePath.isImportDeclaration()) {
            //   console.log(nodePath.node);
            // }

            // Get name
            if (
              nodePath.isClassDeclaration() &&
              (nodePath.node.superClass?.object?.name === "React" ||
                nodePath.node.superClass?.object?.name === "Component" ||
                nodePath.node.superClass?.name === "React" ||
                nodePath.node.superClass?.name === "Component")
            ) {
              isClassComp = true;
              name = nodePath.node.id.name;
            }
            if (!name && nodePath.isExportDefaultDeclaration()) {
              name = nodePath.node.declaration.name;
            }
            if (
              !name &&
              nodePath.isArrowFunctionExpression() &&
              nodePath.parentPath?.parentPath?.parentPath?.node.type ===
                "Program" &&
              startsWithCapital(nodePath.parent?.id?.name)
            ) {
              name = nodePath.parent?.id?.name;
            }
            if (
              !name &&
              nodePath.isFunctionDeclaration() &&
              nodePath.parent.type === "Program" &&
              startsWithCapital(nodePath.node?.id?.name)
            ) {
              name = nodePath.node?.id?.name;
            }
          },
        });

        if (!name) {
          console.log("Failed to find name:", filePath);
        }

        console.log("isClass", isClassComp, "File:", filePath);
        traverse.default(ast, {
          enter(nodePath) {
            // Translate strings
            if (nodePath.isJSXText()) {
              const indentifier = _.snakeCase(nodePath.node.value);

              if (nodePath.node.value.trim() !== "") {
                hasTranslations = true;
                _.set(
                  translations,
                  `${name}.${indentifier}`,
                  nodePath.node.value.trim()
                );
                nodePath.node.value = `{${
                  isClassComp ? "this.props." : ""
                }t('${name}.${indentifier}')}`;
              }
            }

            // Translate props
            if (nodePath.isStringLiteral()) {
              const indentifier = _.snakeCase(nodePath.node.value);

              if (types.isJSXAttribute(nodePath.parent)) {
                if (
                  isPropValid.default(nodePath.parent.name?.name) ||
                  nodePath.node.value.trim() === ""
                )
                  return;

                hasTranslations = true;
                _.set(
                  translations,
                  `${name}.${indentifier}`,
                  nodePath.node.value.trim()
                );

                if (isClassComp) {
                  types.jSXExpressionContainer(
                    types.callExpression(
                      types.memberExpression(
                        types.memberExpression(
                          types.thisExpression(),
                          types.identifier("props"),
                          false
                        ),
                        types.identifier("t"),
                        false
                      ),
                      [types.stringLiteral(`${name}.${indentifier}`)]
                    )
                  );
                } else {
                  nodePath.replaceWith(
                    types.jsxExpressionContainer(
                      types.callExpression(types.identifier("t"), [
                        types.stringLiteral(`${name}.${indentifier}`),
                      ])
                    )
                  );
                }
              }
            }

            // Add { t } props const
            // if (
            //   nodePath.isClassMethod() &&
            //   nodePath.node.key?.name === "render"
            // ) {
            //   nodePath.node.body.body.unshift(
            //     types.variableDeclaration("const", [
            //       types.variableDeclarator(
            //         types.objectPattern([
            //           types.objectProperty(
            //             types.identifier("t"),
            //             types.identifier("t"),
            //             false,
            //             true
            //           ),
            //         ]),
            //         types.memberExpression(
            //           types.thisExpression(),
            //           types.identifier("props"),
            //           false
            //         )
            //       ),
            //     ])
            //   );
            // }

            // Add hook
            if (
              !!name &&
              ((nodePath.isArrowFunctionExpression() &&
                nodePath.parent.id?.name === name) ||
                (nodePath.isFunctionDeclaration() &&
                  nodePath.node.id?.name === name))
            ) {
              if (types.isBlockStatement(nodePath.node.body)) {
                nodePath.node.body.body.unshift(
                  types.variableDeclaration("const", [
                    types.variableDeclarator(
                      types.objectPattern([
                        types.objectProperty(
                          types.identifier("t"),
                          types.identifier("t"),
                          false,
                          true
                        ),
                      ]),
                      types.callExpression(types.identifier("useTranslation"), [
                        t.stringLiteral(key),
                      ])
                    ),
                  ])
                );
              } else {
                nodePath.replaceWith(
                  types.arrowFunctionExpression(
                    [],
                    types.blockStatement(
                      [
                        types.variableDeclaration("const", [
                          types.variableDeclarator(
                            types.objectPattern([
                              types.objectProperty(
                                types.identifier("t"),
                                types.identifier("t"),
                                false,
                                true
                              ),
                            ]),
                            types.callExpression(
                              types.identifier("useTranslation"),
                              [t.stringLiteral(key)]
                            )
                          ),
                        ]),
                        types.returnStatement(nodePath.node.body),
                      ],
                      []
                    ),
                    false
                  )
                );
                nodePath.skip();
              }
            }

            // Wrap with HOC
            if (isClassComp && nodePath.isExportDefaultDeclaration()) {
              nodePath.replaceWith(
                types.exportDefaultDeclaration(
                  types.callExpression(
                    types.callExpression(types.identifier("withTranslation"), [
                      types.stringLiteral(key),
                    ]),
                    [nodePath.node.declaration]
                  )
                )
              );
              nodePath.skip();
            }
          },
        });

        traverse.default(ast, {
          exit(nodePath) {
            if (!hasTranslations) return;

            // Add imports
            if (nodePath.isProgram()) {
              const identifier = types.identifier(
                "{useTranslation, withTranslation}"
              );
              const importDefaultSpecifier =
                types.importDefaultSpecifier(identifier);
              const importDeclaration = types.importDeclaration(
                [importDefaultSpecifier],
                types.stringLiteral("react-i18next")
              );
              nodePath.unshiftContainer("body", importDeclaration);
            }
          },
        });

        const output = generate.default(ast, code);

        if (hasTranslations) {
          await fs.writeFile(filePath, output.code, "utf-8");
          await fs.writeFile(
            path.join(translationBase, `${path.basename(dirPath)}.json`),
            JSON.stringify(translations, null, "    "),
            "utf-8"
          );
        }
      } catch (e) {
        console.log("Failed:", filePath, e.message);
      }
    }
  }
})();
