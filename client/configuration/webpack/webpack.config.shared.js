/* eslint-disable @blueprintjs/classes-constants -- we don't import blueprint here  */
const path = require("path");
const fs = require("fs");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const SUPPORTED_BROWSERS_REGEX = require("./SUPPORTED_BROWSERS_REGEX");

const src = path.resolve("src");
const nodeModules = path.resolve("node_modules");

const publicPath = "";

const rawObsoleteHTMLTemplate = fs.readFileSync(
  `${__dirname}/obsoleteHTMLTemplate.html`,
  "utf8"
);

const obsoleteHTMLTemplate = rawObsoleteHTMLTemplate.replace(/"/g, "'");

const deploymentStage = process.env.DEPLOYMENT_STAGE || "test";

module.exports = {
  entry: [
    "core-js",
    "regenerator-runtime/runtime",
    "whatwg-fetch",
    "abort-controller/polyfill",
    "./src/index",
  ],
  externals: {
    "react-draggable": {
      commonjs: "react-draggable",
      commonjs2: "react-draggable",
      amd: "react-draggable",
      root: "ReactDraggable",
    },
  },
  output: {
    path: path.resolve("build"),
    publicPath,
    library: {
      type: "umd",
      umdNamedDefine: true,
    },
    globalObject: "typeof self !== 'undefined' ? self : this",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", "..."],
    modules: [path.resolve(__dirname, "../../src"), "node_modules"],
    alias: {
      "~/globals": path.resolve(__dirname, "../../src/globals"),
    },
    fallback: {
      path: false,
      fs: false,
    },
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        include: src,
        exclude: [path.resolve(src, "index.css")],
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              modules: {
                localIdentName: "[name]__[local]___[contenthash:base64:5]",
              },
              importLoaders: 1,
            },
          },
        ],
      },
      {
        test: /index\.css$/,
        include: [path.resolve(src, "index.css")],
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.json$/,
        include: [src, nodeModules],
        loader: "json-loader",
        exclude: /manifest.json$/,
      },
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              "@babel/preset-env",
              "@babel/preset-react",
              "@babel/preset-typescript",
            ],
            plugins: ["@babel/plugin-transform-runtime"],
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      OBSOLETE_TEMPLATE: JSON.stringify(obsoleteHTMLTemplate),
      OBSOLETE_REGEX: JSON.stringify(String(SUPPORTED_BROWSERS_REGEX)),
      PLAUSIBLE_DATA_DOMAIN: JSON.stringify(
        deploymentStage === "prod"
          ? "cellxgene.cziscience.com"
          : "cellxgene.staging.single-cell.czi.technology"
      ),
    }),
    new CopyPlugin({
      patterns: [
        {
          from: "configuration/webpack/obsoleteBrowsers.js",
          to: "static/obsoleteBrowsers.js",
        },
      ],
    }),
  ],
};
/* eslint-enable @blueprintjs/classes-constants -- we don't import blueprint here  */
