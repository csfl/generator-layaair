
var config = require('../config')
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var co = require("co");
var fetch = Promise.promisifyAll(require('fetch'));
var unzip = require('unzip');

var fetchfile = function( url, localpath ) {
	return new Promise(function(resolve,reject){
		(new fetch.FetchStream(url))
		.pipe(unzip.Extract({ path: localpath }))
		.on('finish',function(){
			resolve();
		})
	})
}

co(function* () {
	console.log( 'fetching laya engine ' + config.layaVersion + '.' )
	yield fetchfile('http://ldc.layabox.com/download/LayaAirTS_'+ config.layaVersion + '.zip','./laya/' + config.layaVersion )
	console.log( 'done.' )

	console.log( 'configuring tsconfig.json.' )
	var tsconfig = JSON.parse(yield fs.readFileAsync('tsconfig.json'));
	for( var i = 0 ; i < tsconfig.files.length ; i++ ) {
		if( tsconfig.files[i].match(/.*layaair\.d\.ts$/i) ) {
			tsconfig.files[i] = 'laya/' + config.layaVersion + '/ts/LayaAir.d.ts';
		}
	}
	console.log( tsconfig )
	yield fs.writeFileAsync( 'tsconfig.json', JSON.stringify( tsconfig, null, '  ' ) )
	console.log( 'done.' )

}).then(function (value) {
	console.log( 'laya engine updated.' )
}, function (err) {
  console.error(err);
});
