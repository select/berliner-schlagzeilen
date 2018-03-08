#!/usr/bin/env node

const WebpackDevServer = require('webpack-dev-server');
const webpack = require('webpack');
const CircularDependencyPlugin = require('circular-dependency-plugin');

const config = require('./webpack.base.js');
const port = 8000;

config.mode = 'development';
config.devtool = 'source-map';

config.entry = [
	`webpack-dev-server/client?http://localhost:${port}/`,
	'webpack/hot/dev-server',
	'./src/app.js',
];

config.output = {
	path: `${__dirname}/public`,
	publicPath: '/',
	filename: 'app.js',
};

config.plugins = [
	...config.plugins,
	new webpack.DefinePlugin({
		'process.env': {
			website: true,
		},
	}),
	new webpack.NamedModulesPlugin(),
	new CircularDependencyPlugin(),
	new webpack.HotModuleReplacementPlugin(),
];

new WebpackDevServer(webpack(config), {
	contentBase: './public/',
	publicPath: config.output.publicPath,
	historyApiFallback: false,
	stats: {
		colors: true,
		chunks: false,
		modules: false,
	},
	watchOptions: {
		aggregateTimeout: 300,
		poll: 1000,
	},
	hot: true,
	inline: true,
}).listen(port,  'localhost', function(err, res) {
	if (err) console.warn(err);
	console.log(`Listening on localhost:${port}`);
});
