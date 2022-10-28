const path = require("path");
const cwd = process.cwd(); // must be cellxgene client directory
const config = path.join(cwd, "configuration/webpack/webpack.config.prod.js");
const base_webpack_config = require(config);

const SentryCliPlugin = require(require.resolve("@sentry/webpack-plugin", {
	paths: ["node_modules"],
}));

module.exports = {
	...base_webpack_config,
	plugins: [
		...base_webpack_config.plugins,
		new SentryCliPlugin({
			include: ".",
			ignoreFile: ".sentrycliignore",
			configFile: "/tmp/sentry.properties",
			ignore: [
				"node_modules",
				"configuration",
				"coverage",
				"__tests__",
				".idea",
			],
			validate: true,
			debug: true,
			release: `cellxgene@89e398bd.32384b9`,
		}),
	],
};
