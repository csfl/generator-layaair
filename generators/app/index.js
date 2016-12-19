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
			choices: [ 'typescript' ],
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
			"\tlayaModules: ['core','webgl','html'/*,'plugins','ani','filters','particle','ui'*/],\n" +
			"\tlayaVersion: '" + this.props.engineversion + "'\n" +
			"}"
		)

		console.log('   generating package.json')
		var packageinfo = this.fs.readJSON( this.templatePath('package.json') );
		packageinfo.name = this.props.name;
		this.fs.extendJSON( 'package.json',	packageinfo, null, '\t' )

		console.log('   copying other config files')
		var rootfiles = ['gulpfile.js','tsconfig.json','typings.json'];
		for( var i = 0 ; i < rootfiles.length ; i++ ) {
			this.fs.copy( this.templatePath(rootfiles[i]), this.destinationPath(rootfiles[i]) );
		}

		if( parseInt(this.props.engineversion.split('.') ) >= 1 ) {
			this.fs.copy( this.templatePath('tsconfig.v1.json'), this.destinationPath('tsconfig.json') );
		}

		console.log('   copying template files')
		var subDirs = [ 'res','src','template', 'scripts' ];
		for( var i = 0 ; i < subDirs.length ; i++ ) {
			this.fs.copy( this.templatePath( subDirs[i] + '/**' ), this.destinationPath( subDirs[i] )	);
		}
	},

	install: function () {
		this.npmInstall()
	}
});
