
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
var webpackConfig = require('./webpack.config');
var utils = require('./scripts/utils');

var safeWriteFileAsync = function(fname,data){
	return utils.mkdirAsync(path.dirname(fname))
		.then(function(){
			return fs.writeFileAsync(fname,data)
		})
}

var debug = process.argv.length > 2 && process.argv[2] == 'debug';
var distPath = !debug && config.publishPath ? config.publishPath : 'dist/' + ( debug ? 'debug' : 'release' );

gulp.task('clean',function(){
	return gulp.src('dist/**')
		.pipe(clean());
})

gulp.task('clean-dist',function(){
	return gulp.src( path.join( distPath , '**' ) )
		.pipe(clean());
})

gulp.task('clean-laya',function(){
	return gulp.src( path.join( distPath , 'laya-*' ))
		.pipe(clean());
})

gulp.task('build-laya', ['clean-laya'], function(){
	return gulp.src('laya/'+config.layaVersion+'/js/libs/*.js')
		.pipe( gulp.dest( path.join(distPath,'laya-'+config.layaVersion) ) )
})

gulp.task('clean-res',function(){
	return gulp.src( path.join( distPath , 'res' ))
		.pipe(clean());
})

gulp.task('build-res', ['clean-res'], function(){
	return gulp.src('res/**')
		.pipe( gulp.dest( path.join( distPath, 'res' ) ) )
})

gulp.task('clean-src',function(){
	return gulp.src([ path.join( distPath , 'assets' ), path.join( distPath, 'index.html' ) ])
		.pipe(clean());
})

gulp.task('build-src', ['clean-src'], function(){
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

gulp.task('build-page', ['build-src'], function(){
	return fs.readFileAsync('template/index.html')
		.then(function(data){
			var $ = cheerio.load(data)
			config.layaModules.forEach(function(item){
				$('body').append('<script src="laya-'+ config.layaVersion + '/' + item + '.js" language="JavaScript"></script>\n')
			})
			$('body').append('<script src="assets/app.js" language="JavaScript"></script>\n')
			return safeWriteFileAsync( path.join(distPath,'index.html'),$.html());
		})
})

gulp.task('debug-reload',['build-page'],function(){
	browserSync.reload();
})

gulp.task('debug', ['build-page'], function(){
	var bsConfig = {
		server:  {
			baseDir: [ distPath ],
			routes: { '/res': 'res' }
		}
	}
	bsConfig.server.routes[ '/laya-'+ config.layaVersion ] = './laya/' + config.layaVersion + '/js/libs'
	browserSync.init(bsConfig);
	gulp.watch('res/*',browserSync.reload)
	gulp.watch('src/*.js',['debug-reload'])
	gulp.watch('config.js',['debug-reload'])
	gulp.watch('template/index.html',['debug-reload'])
})

gulp.task('uglify-page', ['build-page','build-laya'], function(){
	return gulp.src( path.join(distPath,'**/*.js') )
		.pipe(uglify())
		.pipe(gulp.dest(distPath))
})

gulp.task('publish',['uglify-page','build-res'])

gulp.task('default',['build-page','build-res','build-laya'])
