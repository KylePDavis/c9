/*jshint browser:true, node:true*/
var path = require("path"),
	fs = require("fs"),
	gui = process.gui || require("nw.gui");


var Config = module.exports = {

	isInitialized: false,

	init: function init(){
		if(Config.isInitialized) return Config;
		return Config;
	},

	file: path.join(gui.App.dataPath, "config.json"),

	defaults: {
		ip: process.env.IP || "127.0.0.1",
		basePort: process.env.BASE_PORT || "12468",
		workspaces: [
			{
				dir: process.env.HOME || process.cwd()
			}
		]
	},

	_current: null,
	get current(){
		if(!Config._current){
			Config._current = Object.create(Config.defaults);
			try {
				var data = fs.readFileSync(Config.file),
					config = JSON.parse(data);
				for(var key in config){
					Config._current[key] = config[key];
				}
			} catch(err) {
				Config.save();
			}
		}
		return Config._current;
	},

	save: function save(){
		try {
			fs.writeFileSync(Config.file, JSON.stringify(Config.current));
		} catch(err) {
			console.error("Unable to save config file:", {file:Config.file, error:err.message});
		}
	}

};
