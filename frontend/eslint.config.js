import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Regra de privacidade (ADR-017): nenhum dado da sessão pode ser persistido no navegador.
 * Estas APIs ficam proibidas em todo o código do frontend.
 */
const persistenceMessage =
  "Proibido pela regra de privacidade (ADR-017): os dados da sessão vivem apenas em memória.";
const forbiddenStorage = ["localStorage", "sessionStorage", "indexedDB", "caches"];

export default defineConfig(
  { ignores: ["build", ".react-router", "coverage", "src/lib/api/schema.d.ts"] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.browser },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [jsxA11y.flatConfigs.strict, reactHooks.configs.flat["recommended-latest"]],
    rules: {
      "no-restricted-globals": [
        "error",
        ...forbiddenStorage.map((name) => ({ name, message: persistenceMessage })),
      ],
      "no-restricted-properties": [
        "error",
        ...forbiddenStorage.flatMap((property) => [
          { object: "window", property, message: persistenceMessage },
          { object: "globalThis", property, message: persistenceMessage },
        ]),
        { object: "document", property: "cookie", message: persistenceMessage },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "Proibido: nomes de participantes são exibidos sempre como texto escapado.",
        },
      ],
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
    },
  },
  {
    files: ["*.config.{js,ts}", "eslint.config.js"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ["**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
