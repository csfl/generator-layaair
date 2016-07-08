
var config = require('./config')
var gulp = require('gulp');
var path = require('path');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var child_process = Promise.promisifyAll(require('child_process'))
var walk = Promise.promisifyAll(require('walk'));
var browserSync = require('browser-sync').create();
var clean = require('gulp-clean');
var uglify = require('gulp-uglify');
var cheerio = require('cheerio');
var colors = require('colors')

var debug = process.argv.length > 2 && process.argv[2] == 'debug';

var getDistPath = function() {
	if( !debug && config.publishPath ) {
		return config.publishPath;
	}
	return 'dist/' + ( debug ? 'debug' : 'release' )
}

var walkAsync = function(walkpath) {
	return new Promise(function(resolve,reject){
			var walker = walk.walk( walkpath, { followLinks:false } );
			var files = [];
			walker.on("file", function (root, fileStats, next) {
				files.push( path.join(root,fileStats.name ) );
				next();
			});
			walker.on("end", function () {
				resolve(files);
			});
			walker.on('errors',function(){
				reject('walk file failed, path : ' + walkpath )
			})
	})
}

var runCommand = function( cmdline, options ) {
	console.log( 'run$ '.blue + cmdline )
	var p = child_process.exec( cmdline )
	return new Promise( function( resolve, reject ){
		if( !p ) {
			reject();
			return;
		}
		var OnExit = function() {
			if( options.stdout ) {
				fs.close(options.stdout)
			}
			if( options.stderr ) {
				fs.close(options.stderr)
			}
		}
		p.stdout.on('data',function(data){
			console.log(data)
			if( options.stdout ) {
				fs.write( options.stdout, data );
			}
		})
		p.stderr.on('data',function(data){
			console.log(data)
			if( options.stderr ) {
				fs.write( options.stderr, data );
			}
			else if( options.stdout ) {
				fs.write( options.stdout, data );
			}
		})
		p.on('exit',function(n){
			OnExit();
			if( n == 0 ) {
				resolve();
			}
			else {
				reject('command '+'failed'.red +' with return '+(""+n).green);
			}
		})
		p.on('error',function(e){
			OnExit();
			reject(e);
		})
	});
}

var getBuildDeps = function() {
	var rets = ['build-tsconfig']
	if( config.enableTypings ) {
		rets.push('install-3rd')
	}
	if( !debug ) {
		rets.push( 'build-laya' )
		rets.push( 'copy-res' )
	}
	return rets
}

gulp.task('clean-dist',function(){
	return gulp.src( getDistPath() + '/**/*', {read: false})
		.pipe(clean());
})

gulp.task('build-laya', ['clean-dist'], function(){
	var files = config.layaModules.map(function(elem){ return 'laya/' + config.layaVersion + '/libs/laya.' + elem + '.js' })
	return gulp.src(files)
		.pipe( gulp.dest( path.join( getDistPath(),'libs' ) ) )
})

gulp.task('install-3rd',function(){
	return runCommand( 'typings install' ).error(function(e){
		console.log( 'run$ typings install')
		console.log( 'warning : install typings failed.')
	})
})

gulp.task('build-tsconfig',function(){
	return Promise.join( walkAsync('src'), fs.readFileAsync('tsconfig.json'), function(files,data){
		tsConfigData = JSON.parse(data);
		tsConfigData.files = [
			"laya/" + config.layaVersion + "/libs/LayaAir.d.ts"
		]
		if( parseInt(config.layaVersion.split('.')[0]) >= 1 ) {
			tsConfigData.files = [
				"laya/" + config.layaVersion + "/LayaAir.d.ts"
			]
		}
		if( config.enableTypings ) {
			tsConfigData.files.push('typings/main.d.ts')
		}
		files.forEach(function(elem){
			if( elem.match(/\.ts$/) ) {
				tsConfigData.files.push(path.normalize(elem).replace(/\\/g,'/'));
			}
		})
		return fs.writeFileAsync('tsconfig.json',JSON.stringify(tsConfigData,null,'\t'))
	})
})

gulp.task('build-src', getBuildDeps(), function(){
	var cmdline = 'tsc --outDir ' + getDistPath()
	if( !debug ) {
		cmdline += ' --outFile ' + path.join( getDistPath(), 'src/app.js' )
	}
	else {
		cmdline += ' --sourceMap';
	}
	return fs.openAsync('build.log','a').then( function(fd) {
		return runCommand( cmdline,{ stdout: fd });
	}).catch(function(err){
		console.log(err);
	})
})

gulp.task('copy-res',['clean-dist'],function(){
	return gulp.src('res/*')
		.pipe( gulp.dest( getDistPath() ) )
})

gulp.task('build-page', ['build-src'], function(){
	$ = cheerio.load(fs.readFileSync('template/index.html'))
	config.layaModules.forEach(function(elem){
		$('body').append('<script src="libs/laya.' + elem + '.js" language="JavaScript"></script>\n')
	})
	var srcPath = path.join( getDistPath(), 'src' );
	return walkAsync(srcPath)
		.then(function(files){
			files.forEach(function(elem){
				if( !elem.match(/\.js$/) ) {
					return;
				}
				var jspath = path.relative( srcPath , elem ).replace(/\\/g,'/');
				if( jspath !== 'app.js' ) {
					$('body').append('<script src="src/' + jspath + '" language="JavaScript"></script>\n');
				}
			})
			$('body').append('<script src="src/app.js" language="JavaScript"></script>\n');
			return fs.writeFileAsync( path.join(getDistPath(),'index.html'), $.html() )
		})
})

gulp.task('debug-reload',['build-page'],function(){
	browserSync.reload();
})

gulp.task('debug', ['build-page'], function() {
	browserSync.init({
		server:  {
			baseDir: [ getDistPath(), 'res' ],
			routes: {
				"/src": "src",
				"/libs": "laya/" + config.layaVersion + "/libs"
			}
		}
	});
	gulp.watch('res/*',browserSync.reload)
	gulp.watch('src/*.ts',['debug-reload'])
})

gulp.task('uglify-page', ['build-page'], function(){
	return gulp.src( path.join(getDistPath(),'**/*.js') )
		.pipe(uglify())
		.pipe( gulp.dest(getDistPath()))
})

gulp.task('publish',['build-page','uglify-page'])

gulp.task('default',['build-page'])

gulp.task('tt1',function(){
	return runCommand( 'tsc --outDir dist/release --outFile dist\release\src\app.js' );
})