
var config = require('../config')
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var co = require("co");
var fetch = Promise.promisifyAll(require('fetch'));
var unzip = require('unzip');

var fetchfile = function( url, localpath ) {
	return new Promise(function(resolve,reject){
		(new fetch.FetchStream(url))
		.pipe(fs.createWriteStream(localpath))
		.on('close',function(){
			resolve();
		})
		.on('error',function(err){
			reject(err);
		})
	})
}

var uncompress = function( fname, dest ) {
	return new Promise( function( resolve, reject ){
		fs.createReadStream(fname)
			.pipe(unzip.Extract({ path: dest }))
			.on('finish',function(){
				resolve();
			})
			.on('error',function(err){
				reject(err);
			})
	})
}

var makeDirAsync = function( dirname ) {
	return new Promise( function(resolve,reject){
		fs.stat( dirname, function(err){
			if( err ) {
				fs.mkdir( dirname, function(err2){
					if( err2 ) {
						reject(err2);
					}
					resolve();
				})
			}
			resolve();
		})
	})
}

co(function* () {
	yield makeDirAsync('./laya');
	yield makeDirAsync('./laya/tmp');
	console.log( 'fetching laya engine ' + config.layaVersion + '.' )
	yield fetchfile('http://ldc.layabox.com/download/LayaAirJS_'+ config.layaVersion + '.zip', './laya/tmp/' + config.layaVersion + '.zip' );
	yield uncompress( './laya/tmp/' + config.layaVersion + '.zip', './laya/' + config.layaVersion )
	console.log( 'done.' )

}).then(function (value) {
	console.log( 'laya engine updated.' )
}, function (err) {
  console.error(err);
});
