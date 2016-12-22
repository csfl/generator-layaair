
var config = require('./config')
var gulp = require('gulp');
var path = require('path');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var browserSync = require('browser-sync').create();
var clean = require('gulp-clean');
var uglify = require('gulp-uglify');
var cheerio = require('cheerio');
var colors = require('colors');
var utils = require('./scripts/utils');
var ts = require('gulp-typescript');
var uncolor = require('uncolor');
var sourcemaps = require('gulp-sourcemaps');

var debug = process.argv.length > 2 && process.argv[2] == 'debug';
var distPath = !debug && config.publishPath ? config.publishPath : 'dist/' + ( debug ? 'debug' : 'release' );
var buildDepends = config.enableTypings ? [ 'build-tsconfig', 'build-typings', 'clean-src' ] : [ 'build-tsconfig', 'clean-src' ];
var tsProject = ts.createProject({
	module: 'amd',
	outFile: 'assets/app.js',
	target: 'es5',
	moduleResolution: 'node',
	rootDir: './'
});

var buildAsync = function(files,reporter) {
	return new Promise(function(resolve,reject){
		var tsResult = gulp.src(files)
			.pipe(sourcemaps.init())
			.pipe(tsProject(reporter));
		tsResult.js
			.pipe(sourcemaps.write())
			.pipe(gulp.dest(distPath))
			.on('finish',function(){
				if( reporter.success )
					fs.writeFile('build.log', utils.now() + 'build success.\r\n',{flag:'a'},function(){ resolve(); })
				else 
					resolve();
			})
	})
}

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
	var files = config.layaModules.map(function(elem){
		return 'laya/' + config.layaVersion + '/ts/libs/' + elem + '.js'
	})
	return gulp.src(files)
		.pipe( gulp.dest( path.join( distPath,'laya-'+config.layaVersion ) ) )
})

gulp.task('clean-res',function(){
	return gulp.src( path.join( distPath , 'res' ))
		.pipe(clean());
})

gulp.task('build-res', ['clean-res'], function(){
	return gulp.src('res/**')
		.pipe( gulp.dest( path.join( distPath, 'res' ) ) )
})

gulp.task('build-typings',function(){
	return utils.runCommand( 'typings install' ).error(function(e){
		console.log( 'warning : install typings failed.')
	})
})

gulp.task('build-tsconfig',function(){
	return Promise.join( utils.walkAsync('src'), fs.readFileAsync('tsconfig.json'), function(files,data){
		tsConfigData = JSON.parse(data);
		tsConfigData.files = [ "laya/" + config.layaVersion + "/ts/LayaAir.d.ts" ]
		if( config.enableTypings ) {
			tsConfigData.files.push('typings/main.d.ts')
		}
		files.forEach(function(elem){
			if( elem.match(/\.ts$/) ) {
				tsConfigData.files.push(path.normalize(elem).replace(/\\/g,'/'));
			}
		})
		return fs.writeFileAsync('tsconfig.json',JSON.stringify(tsConfigData,null,'  '))
	})
})

gulp.task('clean-src',function(){
	return gulp.src([ path.join( distPath , 'assets' ), path.join( distPath, 'index.html' ) ])
		.pipe(clean());
})

gulp.task('build-src', buildDepends, function(){
	var myReporter = {
		error: function(e) {
			this.success = false;
			console.error(e.message);
			fs.writeFile('build.log', utils.now() + uncolor(e.message) + '\r\n',{flag:'a'})
		},
		finish: ts.reporter.defaultReporter().finish,
		success: true
	}
	return fs.readFileAsync('./tsconfig.json')
		.then(function(data){
			return buildAsync( JSON.parse(data).files, myReporter );
		})
})

gulp.task('build-page', ['build-src'], function(){
	$ = cheerio.load(fs.readFileSync('template/index.html'))
	config.layaModules.forEach(function(elem){
		$('body').append('<script src="laya-' + config.layaVersion + '/' + elem + '.js" language="JavaScript"></script>\n')
	})
	var srcPath = path.join( distPath, 'assets' );
	return utils.walkAsync(srcPath)
		.then(function(files){
			files.forEach(function(elem){
				if( !elem.match(/\.js$/) ) {
					return;
				}
				var jspath = path.relative( srcPath , elem ).replace(/\\/g,'/');
				if( jspath !== 'app.js' ) {
					$('body').append('<script src="assets/' + jspath + '" language="JavaScript"></script>\n');
				}
			})
			$('body').append('<script src="assets/app.js" language="JavaScript"></script>\n<script>require(["src/app"])</script>\n');
			return fs.writeFileAsync( path.join(distPath,'index.html'), $.html() )
		})
})

gulp.task('debug-reload',['build-page'],function(){
	browserSync.reload();
})

gulp.task('debug', ['build-page'], function() {
	var bsConfig = {
		server:  {
			baseDir: [ distPath ],
			routes: {
				"/src": "src",
				"/res": "res"
			}
		}
	}
	bsConfig.server.routes[ '/laya-'+ config.layaVersion ] = './laya/' + config.layaVersion + '/ts/libs'
	browserSync.init(bsConfig);
	gulp.watch('res/*',browserSync.reload)
	gulp.watch('src/*.ts',['debug-reload'])
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
