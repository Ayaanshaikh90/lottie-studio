//@ts-check
'use strict';

const path = require('path');

/** @type {import('webpack').Configuration} */
module.exports = {
  target: 'node',               // VSCode extensions run in Node
  mode: 'production',           // Minimize & tree-shake
  entry: './src/extension.ts',  // Your extension entry file
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'  // VSCode expects commonjs
  },
  externals: {
    vscode: 'commonjs vscode'   // Don't bundle vscode built-in module
  },
  resolve: {
    extensions: ['.ts', '.js']  // Resolve these
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader'
      }
    ]
  },
  devtool: 'source-map'         // Helpful stack traces
};
