import js from '@eslint/js';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'reclamalo-airports.js']),
  {
    files: ['*.js', '*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.browser },
  },
  {
    files: ['tests/**/*.mjs', 'scripts/**/*.mjs', 'vite.config.js', 'eslint.config.js'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.node },
  },
]);
