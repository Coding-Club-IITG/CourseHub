import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";
import refresh from "eslint-plugin-react-refresh";
import { defineConfig } from "eslint/config";

export default defineConfig([
    { ignores: ["**/dist/**", "**/node_modules/**", "**/~*/**"] },
    {
        files: ["**/*.{js,jsx}"],
        languageOptions: { ecmaVersion: "latest", sourceType: "module" },
        rules: js.configs.recommended.rules,
    },
    {
        files: [
            "client/src/**/*.{js,jsx}",
            "admin/src/**/*.{js,jsx}",
            "packages/ui/src/**/*.{js,jsx}",
            "packages/ui/gallery/**/*.{js,jsx}",
            "packages/browser/src/**/*.{js,jsx}",
        ],
        languageOptions: {
            globals: globals.browser,
            parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { react, "react-hooks": hooks, "react-refresh": refresh },
        rules: {
            "react/jsx-uses-vars": "error",
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "error",
            "react-refresh/only-export-components": ["error", { allowConstantExport: true }],
        },
    },
    {
        files: ["packages/ui/test/**/*.browser.test.js"],
        languageOptions: { globals: globals.browser },
    },
    {
        files: ["**/*.config.js", "packages/*/test/**/*.js"],
        languageOptions: { globals: globals.node },
    },
]);
