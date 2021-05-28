module.exports = {
  root: true,
  parserOptions: {
    parser: 'babel-eslint',
    ecmaVersion: 6
  },
  env: {
    browser: true,
    es6: true
  },
  extends: [
    'plugin:vue/essential',
    'eslint:recommended',
    'plugin:prettier/recommended'
  ],
  plugins: ['vue', 'prettier'],
  globals: {
    require: true
  },
  // add your custom rules here
  rules: {
    // allow async-await
    'generator-star-spacing': 'off',
    // allow debugger during development
    'no-debugger':
      process.env.NODE_ENV === 'production'
        ? 'error'
        : 'off',

    // 'no-console': 0, //禁用 console
    'no-console':
      process.env.NODE_ENV === 'production'
        ? 'error'
        : 'off',
    'no-unused-vars': 1, //禁止出现未使用过的变量

    'prettier/prettier': [
      'error',
      {
        tabWidth: 2,
        useTabs: false,
        bracketSpacing: true,
        singleQuote: true,
        trailingComma: 'none',
        bracketSpacing: true,
        jsxBracketSameLine: true,
        semi: false,
        printWidth: 100
        //  "endOfLine": "auto" //不同系统换行符不一致
      }
    ]
  }
}
