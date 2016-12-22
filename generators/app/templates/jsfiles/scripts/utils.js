
var path = require('path');
var Promise = require('bluebird');
var walk = require('walk');
var child_process = require('child_process');
var fs = Promise.promisifyAll(require('fs'));

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

var done = function(ret) {
	return new Promise(function(resolve,reject){ resolve(ret) })
}

var mkdirAsync = function(dir){
	var validDir = function(name) {
		return fs.statAsync(name).then(function(meta){
			return new Promise(function(resolve,reject){ meta.isDirectory() ? resolve(0) : reject("'"+name.red+"' is not a directory.") })
		},function(){
			return done(1);
		})
	}
	var mksubAsync = function(name,checkme){
		return validDir(path.dirname(name))
			.then(function(r){
				return r == 0 ?
					fs.mkdirAsync(name) :
					mksubAsync(path.dirname(name)).then(function(){
						return mksubAsync(name);
					})
			})
	}
	dir = path.normalize(dir)
	return validDir(dir).then(function(r){
		return r == 1 ? mksubAsync(dir) : done();
	})
}

var now = function(){
	var d = new Date();
	return '[' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + ']'
}

module.exports = {
	walkAsync: 	walkAsync,
	runCommand:	runCommand,
	mkdirAsync:	mkdirAsync,
	done: done,
	now: now
}
