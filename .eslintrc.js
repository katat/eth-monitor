module.exports = {
  "parserOptions": {
    "ecmaVersion": 2019,
  },
  extends: [
    'standard',
    'plugin:prettier/recommended',
  ],
  "plugins": [
      "svelte3"
  ],
  "overrides": [
      {
          "files": ["**/*.svelte"],
          "processor": "svelte3/svelte3"
      }
  ],
}
