'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var path = require('path');

var Promise = require('bluebird');
var fetch = require('fetch');
var cheerio = require('cheerio');

var fetchdata = function( url ) {
	return new Promise(function(resolve,reject){
		fetch.fetchUrl( url, function(err,header,data){
			if( err ) {
				reject(err);
			}
			resolve(data);
		})
	})
}

module.exports = yeoman.Base.extend({

	prompting: function () {
		var self = this;
		var done = this.async();

		var dirname = path.relative( process.cwd(), path.basename( process.cwd() ) )
		var prompts = [{
			type: 'input',
			name: 'name',
			message: 'First off, how would you like to name this project ?',
			default: dirname
		},{
			type: 'list',
			name: 'language',
			choices: [ 'typescript', 'javascript' ],
			message: 'Which language would you like to use ?'
		},{
			type: 'list',
			name: 'engineversion',
			message: 'what version of LayaAir would you like to use ?',
			choices: []
		}];

		this.log(yosay(
			'Welcome to ' + chalk.red('LayaAir') + ' generator!'
		));

		fetchdata('http://ldc.layabox.com/index.php?m=content&c=index&a=lists&catid=28')
		.then(function(data){
			var $ = cheerio.load(data)
			$('.version-list .version').map(function(i){return $(this).text()}).get().forEach(function(item){
				if( item.match(/^\d+\.\d+\.\d+$/) ) {
					prompts[2].choices.push(item)
				}
			})
			self.prompt(prompts, function (props) {
				this.props = props;
				done();
			}.bind(self));
		})

	},

	writing: function () {
		console.log('   generating config.js')
		this.fs.write(this.destinationPath('config.js'),
			"module.exports = {\n" +
			"\tenableTypings: false,\n" +
			"\tlayaModules: ['laya.core','laya.webgl','laya.html','laya.ui','laya.debugtool','matter','matter-RenderLaya'],\n" +
			"\tlayaVersion: '" + this.props.engineversion + "'\n" +
			"}"
		)

		if( this.props.language == 'typescript' ) {
			console.log('   generating package.json')
			var packageinfo = this.fs.readJSON( this.templatePath('tsfiles/package.json') );
			packageinfo.name = this.props.name;
			this.fs.extendJSON( 'package.json',	packageinfo, null, '\t' )
			
			console.log('   copying other config files')
			var rootfiles = ['gulpfile.js','tsconfig.json','typings.json'];
			for( var i = 0 ; i < rootfiles.length ; i++ ) {
				this.fs.copy( this.templatePath( 'tsfiles/' + rootfiles[i]), this.destinationPath(rootfiles[i]) );
			}

			console.log('   copying template files')
			var subDirs = [ 'res','tsfiles/src','template', 'tsfiles/scripts' ];
			for( var i = 0 ; i < subDirs.length ; i++ ) {
				this.fs.copy( this.templatePath( subDirs[i] + '/**' ), this.destinationPath( subDirs[i].replace('tsfiles/','') )	);
			}
		}
		else if( this.props.language == 'javascript' ) {
			console.log('   generating package.json')
			var packageinfo = this.fs.readJSON( this.templatePath('jsfiles/package.json') );
			packageinfo.name = this.props.name;
			this.fs.extendJSON( 'package.json',	packageinfo, null, '\t' )

			console.log('   copying other config files')
			var rootfiles = [ 'gulpfile.js','webpack.config.js' ];
			for( var i = 0 ; i < rootfiles.length ; i++ ) {
				this.fs.copy( this.templatePath( 'jsfiles/' + rootfiles[i]), this.destinationPath(rootfiles[i]) );
			}

			console.log('   copying template files')
			var subDirs = [ 'res','jsfiles/src','template', 'jsfiles/scripts' ];
			for( var i = 0 ; i < subDirs.length ; i++ ) {
				this.fs.copy( this.templatePath( subDirs[i] + '/**' ), this.destinationPath( subDirs[i].replace('jsfiles/','') )	);
			}
		}
	},

	install: function () {
		this.npmInstall()
	}
});
