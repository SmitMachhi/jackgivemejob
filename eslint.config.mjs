import { dirname } from "path";
import { fileURLToPath } from "url";

import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // File size limits
      "max-lines": ["error", 200],
      "max-lines-per-function": ["error", 50],

      // Complexity limits
      complexity: ["error", 10],
      "max-depth": ["error", 3],

      // Import hygiene
      "import/newline-after-import": "error",
      "import/no-duplicates": "error",
      "import/order": ["error", {
        "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always"
      }],

      // Code quality
      "no-unused-vars": "error",
      "prefer-const": "error",
      "no-var": "error",

      // React-specific
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn"
    }
  }
];

export default eslintConfig;
