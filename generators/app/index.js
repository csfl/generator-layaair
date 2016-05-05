'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var path = require('path');

module.exports = yeoman.Base.extend({

	prompting: function () {
		var done = this.async();
		this.log(yosay(
			'Welcome to ' + chalk.red('LayaAir') + ' generator!'
		));
		
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
			choices: [ '0.9.8', '0.9.7' ],
			message: 'Which version of LayaAir would you like to use ?'
		}];
		
		this.prompt(prompts, function (props) {
			this.props = props;
			done();
		}.bind(this));
	},

	writing: function () {
		this.fs.write(this.destinationPath('config.js'),
			"module.exports = {\n" +
			"\tenableTypings: false,\n" +
			"\tlayaModules: ['core','webgl','html'/*,'plugins','ani','filters','particle','ui'*/],\n" +
			"\tlayaVersion: '" + this.props.engineversion + "'\n" +
			"}"
		)

		var packageinfo = this.fs.readJSON( this.templatePath('package.json') );
		packageinfo.name = this.props.name;
		this.fs.extendJSON( 'package.json',	packageinfo, null, '\t' )

		var rootfiles = ['gulpfile.js','tsconfig.json','typings.json'];
		for( var i = 0 ; i < rootfiles.length ; i++ ) {
			this.fs.copy( this.templatePath(rootfiles[i]), this.destinationPath(rootfiles[i]) );
		}

		var subDirs = ['res','src','template','laya/' + this.props.engineversion ];
		for( var i = 0 ; i < subDirs.length ; i++ ) {
			this.fs.copy( this.templatePath( subDirs[i] + '/**' ), this.destinationPath( subDirs[i] )	);
		}
	},

	install: function () {
		this.npmInstall()
	}
});
