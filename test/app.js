'use strict';
var path = require('path');
var assert = require('yeoman-assert');
var helpers = require('yeoman-test');

describe('generator-layaair:app', function () {
	before(function (done) {
		helpers.run(path.join(__dirname, '../generators/app'))
			.withPrompts({name: 'laya1',language:'typescript',engineversion:'0.9.8'})
			.on('end', done);
	});
	it('creates files', function () {
		assert.file([
			'gulpfile.js',
			'config.js',
			'package.json',
			'tsconfig.json',
			'typings.json'
		]);
	});
});
