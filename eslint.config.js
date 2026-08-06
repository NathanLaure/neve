const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions : code Deno, hors périmètre des règles React Native.
    ignores: ['dist/*', '.agents/*', 'supabase/functions/*'],
  },
  {
    rules: {
      'react/display-name': 'off',
    },
  },
]);
