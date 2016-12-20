
var config = require('./config');
var gulp = require('gulp');
var path = require('path');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var browserSync = require('browser-sync').create();
var clean = require('gulp-clean');
var uglify = require('gulp-uglify');
var cheerio = require('cheerio');
var colors = require('colors');
var webpack = require('gulp-webpack');
var webpackConfig = require('./webpack.config')

var debug = process.argv.length > 2 && process.argv[2] == 'debug';
var distPath = !debug && config.publishPath ? config.publishPath : 'dist/' + ( debug ? 'debug' : 'release' );

gulp.task('clean-dist',function(){
	return gulp.src( distPath + '/**/*', {read: false})
		.pipe(clean());
})

gulp.task('copy-laya',function(){
	return gulp.src('laya/'+config.layaVersion+'/js/libs/*.js').pipe( gulp.dest( path.join(distPath,'laya-'+config.layaVersion) ) )
})

gulp.task('build-src',function(){
	var outputPath = webpackConfig.output.path;
	webpackConfig.output.path = null;
	if( debug ) {
		webpackConfig.devtool = 'inline-source-map';
		webpackConfig.inline = true;
		outputPath = './dist/debug'
	}
	return gulp.src(webpackConfig.entry.app)
	.pipe(webpack(webpackConfig))
	.pipe(gulp.dest(outputPath));
})

gulp.task('copy-readme',function(){
	return gulp.src('readme.txt')
		.pipe(gulp.dest(distPath))
})

gulp.task('fix-html', [ 'copy-readme' ], function(){
	return fs.readFileAsync('template/index.html')
		.then(function(data){
			var $ = cheerio.load(data)
			config.layaModules.forEach(function(item){
				$('body').append('<script src="laya-'+ config.layaVersion + '/' + item + '.js" language="JavaScript"></script>\n')
			})
			$('body').append('<script src="assets/app.js" language="JavaScript"></script>\n')
			return fs.writeFileAsync( path.join(distPath,'index.html'),$.html());
		})
})

gulp.task('build', ['copy-laya','fix-html','build-src'], function(){
	return gulp.src('res/**')
		.pipe(gulp.dest(path.join(distPath,'res')))
})

gulp.task('debug', ['fix-html','build-src'], function(){
	var bsConfig = {
		server:  {
			baseDir: [ distPath ],
			routes: { '/res': 'res' }
		}
	}
	bsConfig.server.routes[ '/laya-'+ config.layaVersion ] = './laya/' + config.layaVersion + '/js/libs'
	browserSync.init(bsConfig);
	gulp.watch('res/*',browserSync.reload)
	gulp.watch('src/*.js',['build-src'])
	gulp.watch('config.js',['build-src'])
})
