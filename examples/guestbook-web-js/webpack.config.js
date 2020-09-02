const webpack = require('webpack');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = (env, argv) => {
  return {
    // The entry point of the app is './src/frontend.js'
    entry: './src/frontend.js',
    output: {
      // Specify '/' as the base path for all the assets
      // This is required for a single-page application
      publicPath: '/'
    },
    module: {
      rules: [
        {
          // Use 'babel-loader' to compile the JS files
          test: /\.js$/,
          include: path.join(__dirname, 'src'),
          loader: 'babel-loader'
        }
      ]
    },
    plugins: [
      // Use 'html-webpack-plugin' to generate the 'index.html' file
      // from the './src/index.html' template
      new HtmlWebPackPlugin({
        template: './src/index.html',
        inject: false
      })
    ],
    // Generate source maps to make debugging easier
    devtool: 'eval-cheap-module-source-map',
    devServer: {
      // Fallback to 'index.html' in case of 404 responses
      // This is required for a single-page application
      historyApiFallback: true
    }
  };
};
