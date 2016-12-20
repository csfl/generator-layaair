var webpack = require('webpack');

module.exports = {
	entry: {
		app: './src/app.js'
	},
	output: {
		path: 'dist/release',
		filename: 'assets/app.js'
	},
	module: {
		loaders: [
			{ test: /\.js$/, exclude: /node_modules/, loader: 'babel?presets[]=es2015' },
		]
	},
	resolve: {
		modulesDirectories: [
			"src"
		]
	}
};
