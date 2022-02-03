import { promises as fs } from "fs";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import types from "@babel/types";
import _ from "lodash";
import path from "path";
import isPropValid from "@emotion/is-prop-valid";
import FastGlob from "fast-glob";
import chalk from "chalk";
import stopword from "stopword";

function startsWithCapital(word = "a") {
  return word.charAt(0) === word.charAt(0).toUpperCase();
}

(async function () {
  const componentBase = "/Users/iv0697/Code/DealerPlatform/src/components/";
  const globBase = componentBase + "*";
  const translationBase = "/Users/iv0697/Code/DealerPlatform/public/locales/en";

  const only = [
    // Add top level component directories here to only process that folder e.g.
    // "AddCustomer",
  ];
  const dirs = (await FastGlob(globBase, { onlyDirectories: true })).filter(
    (dir) => !only.length || only.some((o) => dir.includes(o))
  );
  let hookErrors = [];

  for (let dirIndex = 0; dirIndex < dirs.length; dirIndex++) {
    const dirPath = dirs[dirIndex];
    const namespace = path.basename(dirPath);
    const files = await FastGlob(dirPath + "/**/*.js");

    const translations = {};

    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const filePath = files[fileIndex];
      const code = await fs.readFile(filePath, "utf-8");

      try {
        const ast = parser.parse(code, {
          sourceType: "module",
          plugins: ["jsx", ["decorators", { decoratorsBeforeExport: false }]],
        });
        let hasTranslations = false;
        let isClassComp = false;
        let name = "";

        // const isReact = ast.program.body.some((n) => {
        //   return n.source?.value === "react";
        // });

        // if (!isReact) {
        //   continue;
        // }

        traverse.default(ast, {
          enter(nodePath) {
            // Skip translated files
            if (
              nodePath.isImportDeclaration() &&
              nodePath.node.source.value === "react-i18next"
            ) {
              throw new Error("Already translated");
            }

            // Get name of component (used as key)
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
          console.log(
            chalk.red(
              "Failed to find name:",
              filePath.replace(componentBase, "")
            )
          );
        }

        traverse.default(ast, {
          enter(nodePath) {
            // Translate JSX text
            if (nodePath.isJSXText()) {
              const indentifier = _.snakeCase(nodePath.node.value.trim());

              if (
                nodePath.node.value.trim() !== "" &&
                /[a-z]/i.test(nodePath.node.value)
              ) {
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

            // Translate JSX props
            if (nodePath.isStringLiteral()) {
              const indentifier = _.snakeCase(nodePath.node.value.trim());

              if (types.isJSXAttribute(nodePath.parent)) {
                if (
                  isPropValid.default(nodePath.parent.name?.name) ||
                  nodePath.node.value.trim() === "" ||
                  !nodePath.node.value.includes(" ") // Will miss single word strings
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

            // Add useTranslation hook (function components)
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
                        types.stringLiteral(namespace),
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
                              [types.stringLiteral(namespace)]
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

            // Wrap with HOC (class components)
            if (isClassComp && nodePath.isExportDefaultDeclaration()) {
              nodePath.replaceWith(
                types.exportDefaultDeclaration(
                  types.callExpression(
                    types.callExpression(types.identifier("withTranslation"), [
                      types.stringLiteral(namespace),
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

            // Add react-i18next import
            if (nodePath.isProgram()) {
              const identifier = types.identifier(
                `{${isClassComp ? "withTranslation" : "useTranslation"}}`
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
          // Check for known quirks

          // If component is wrapped in observer and is not a class component the hook will error
          // to fix use `observerForHooks` instead of `observer`
          if (code.includes("observer") && !code.includes("class ")) {
            hookErrors.push(filePath);
          }

          // End checks

          console.log(
            chalk.green("Translated:", filePath.replace(componentBase, ""))
          );

          await fs.writeFile(filePath, output.code, "utf-8");
          await fs.writeFile(
            path.join(translationBase, `${namespace}.json`),
            JSON.stringify(translations, null, "    "),
            "utf-8"
          );
        }
      } catch (e) {
        console.log(
          chalk.red("Failed:", filePath.replace(componentBase, ""), e.message)
        );
      }
    }
  }

  if (hookErrors.length) {
    console.log(
      chalk.yellow("\n\nThe following files may contain hook errors:\n")
    );
    hookErrors.forEach((f) =>
      console.warn(chalk.yellow("File:", f.replace(componentBase, "")))
    );
  }
})();
