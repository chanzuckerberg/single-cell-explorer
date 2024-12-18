/* eslint-disable @blueprintjs/classes-constants -- we don't import blueprint here  */
// eslint-disable-next-line @typescript-eslint/no-var-requires --- FIXME: disabled temporarily on migrate to TS.
const path = require("path");
// eslint-disable-next-line @typescript-eslint/no-var-requires --- FIXME: disabled temporarily on migrate to TS.
const webpack = require("webpack");
// eslint-disable-next-line @typescript-eslint/no-var-requires --- FIXME: disabled temporarily on migrate to TS.
const HtmlWebpackPlugin = require("html-webpack-plugin");
// eslint-disable-next-line @typescript-eslint/no-var-requires --- FIXME: disabled temporarily on migrate to TS.
const FaviconsWebpackPlugin = require("favicons-webpack-plugin");
// eslint-disable-next-line @typescript-eslint/no-var-requires --- FIXME: disabled temporarily on migrate to TS.
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

// eslint-disable-next-line @typescript-eslint/no-var-requires --- FIXME: disabled temporarily on migrate to TS.
const { merge } = require("webpack-merge");

// eslint-disable-next-line @typescript-eslint/no-var-requires --- FIXME: disabled temporarily on migrate to TS.
const sharedConfig = require("./webpack.config.shared");
// eslint-disable-next-line @typescript-eslint/no-var-requires --- FIXME: disabled temporarily on migrate to TS.
const babelOptions = require("../babel/babel.dev");

const fonts = path.resolve("src/fonts");
const nodeModules = path.resolve("node_modules");

const devConfig = {
  mode: "development",
  devtool: "eval",
  output: {
    pathinfo: true,
    filename: "static/js/bundle.js",
    // (thuang): This is needed to make sure static asset url path is '/static/assets/',
    // so it ignores the base_url (/d, /e) and dataset in the url.
    // e.g., http://localhost:3000/static/assets/heatmap.svg
    publicPath: "/",
    assetModuleFilename: "static/images/[name][ext][query]",
  },
  module: {
    rules: [
      {
        test: /\.(ts|js)x?$/,
        loader: "babel-loader",
        options: babelOptions,
      },
      {
        test: /\.(jpg|png|gif|eot|svg|ttf|woff|woff2|otf)$/i,
        type: "asset/resource",
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: true,
      template: path.resolve("index.html"),
    }),
    new FaviconsWebpackPlugin({
      logo: "./favicon.png",
      prefix: "static/assets/",
      favicons: {
        icons: {
          android: false,
          appleIcon: false,
          appleStartup: false,
          coast: false,
          firefox: false,
          windows: false,
          yandex: false,
        },
      },
    }),
    new MiniCssExtractPlugin({
      filename: "static/[name].css",
    }),
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.DefinePlugin({
      __REACT_DEVTOOLS_GLOBAL_HOOK__: "({ isDisabled: true })",
    }),
    new webpack.DefinePlugin({
      // webpack 5 no longer polyfills NodeJS modules, so fake the one we need
      "process.env": JSON.stringify({
        NODE_ENV: process.env.NODE_ENV || "development",
        CXG_SERVER_PORT: process.env.CXG_SERVER_PORT || "5005",
      }),
      CXG_SERVER_PORT: process.env.CXG_SERVER_PORT,
    }),
  ],
  infrastructureLogging: {
    level: "warn",
  },
};

module.exports = merge(sharedConfig, devConfig);
/* eslint-enable @blueprintjs/classes-constants -- we don't import blueprint here  */
