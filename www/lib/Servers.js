/*jshint browser:true, node:true*/
var path = require("path"),
	fs = require("fs"),
	net = require("net"),
	childProcess = require("child_process"),
	readline = require("readline"),
	gui = process.gui || require("nw.gui"),
	async = require("async"),
	Config = require("./Config").init(),
	Log = require("./Log").init();


//TODO: if server crashes but workspace didn't close then restart server? (goes in workspace?)
var Servers = module.exports = {

	isInitialized: false,

	init: function init(){
		if(Servers.isInitialized) return Servers;
		var win = gui.Window.get();
		win.on("close", function(){
			this.hide();
			Servers.stopAll();
			this.close(true);
		});
		Servers.isInitialized = true;
		return Servers;
	},

	list: [],

	_nextPort: Config.current.basePort,

	/**
	 * Find the next available TCP port
	 * @method findNextPort
	 * @static
	 * @param callback  {Function}  A function that will be called back with the port once it has been created; i.e., `callback(port)`
	 **/
	findNextPort: function findNextPort(callback){
		Log.dbg("Servers.findNextPort port=%s available?", Servers._nextPort);
		var svr = net.createServer()
			.on("listening", function(){
				Log.dbg("Servers.findNextPort port=%s AVAILABLE!", Servers._nextPort);
				var port = Servers._nextPort;
				Servers._nextPort++;
				svr.once("close", function(){
					return callback(port);
				});
				return svr.close();
			})
			.on("error", function(err){
				Log.dbg("Servers.findNextPort port=%s error (%s); next ...", Servers._nextPort, err);
				Servers._nextPort++; // skip this one, it seems to be taken
				return Servers.findNextPort(callback);
			})
			.listen(Servers._nextPort);
	},

	/**
	 * Start a new instance of the cloud9 server for a workspace
	 * @method start
	 * @static
	 * @param dir                    {String}    The workspace directory that the cloud9 server will use for reading and writing files
	 * @param [options]              {Object}    Options for the cloud9 server
	 * @param   [options.ip]           {String}    The IP that the cloud9 server will bind to (DEFAULT: current IP)
	 * @param   [options.port]         {Number}    The port that the cloud9 server will listen on (DEFAULT: next port)
	 * @param   [options.debugPort]    {Number}    The port that the cloud9 server will use for the debugger process (DEFAULT: next port)
	 * @param callback               {Function}  A function that will be called back with the server instance once it has been created; i.e., `callback(err, server)`
	 **/
	start: function start(dir, options, callback){
		// parse args
		if(typeof dir !== "string") throw new Error("Servers.start arg #1 must be workspace dir string");
		if(options instanceof Function) callback = options, options = undefined;
		if(options === undefined) options = {};

		// resolve options that can be determined syncronously
		if(!(options.ip && typeof options.ip === "string")) options.ip = Config.current.ip;

		// resolve more options, prepare workspace, and start server
		async.series(
			[

				function resolveOptionPort(next) {
					if (options.port) return next();
					Servers.findNextPort(function(port) {
						options.port = port;
						return next();
					});
				},

				function resolveOptionDebugPort(next) {
					if (options.debugPort) return next();
					Servers.findNextPort(function(debugPort) {
						options.debugPort = debugPort;
						return next();
					});
				}

			],

			function donePreparing(err){
				if(err) return callback(err);

				var appDir = process.cwd(),
					nodeEnvDir = appDir + "/nodeenv",
					nodeBin = nodeEnvDir + "/bin/node",
					nodeArgs = [appDir + "/cloud9/server.js", appDir + "/serverConfig", "-w", dir];

				// prepare workspace default settings if possible
				var defaultSettingsFile = path.join(appDir, "defaults.xml"),
					settingsFile = path.join(dir, ".settings");
				try {
					var defaultSettingsData = fs.readFileSync(defaultSettingsFile);
					fs.writeFileSync(settingsFile, defaultSettingsData, {
						flag: "wx"
					});
				} catch (prepErr) {
					var ignoredErrorCodes = ["EEXIST", "EACCES"];
					console.error("SERVER WORKSPACE PREP ERROR:", {e:prepErr});
					if (ignoredErrorCodes.indexOf(prepErr.code) === -1) throw prepErr;
				}

				// send some options through environment vars
				process.env.IP = options.ip;
				process.env.PORT = options.port;
				process.env.DEBUG_PORT = options.debugPort;

				// start process
				Log.out("Starting new C9 server process: ", {bin:nodeBin, args:nodeArgs, env:JSON.parse(JSON.stringify(process.env))});
				var server = childProcess.spawn(nodeBin, nodeArgs, {
						env: process.env
					})
					.on("exit", function (code, signal) {
						if (code) {
							var msg = "Internal Error:\nc9 server process exited with code " + code;
							console.error(msg);
							window.alert(msg);
						}
						server.stdin.end();
						Servers.stop(server);
					});

				server.id = path.basename(dir); //Servers.list.length; //TODO: handle collisions
				server.dir = dir;
				server.options = options;
				server.url = "http://" + options.ip + ":" + options.port + "/?noworker=1";

				Servers.list.push(server);

				callback(null, server);

				var outReader = readline.createInterface({
						input: server.stdout,
						output: process.stdout
					})
					.on("line", Log.out)	//TODO: include workspace / server id?
					.on("line", function(line){
						if (/^IDE server initialized. Listening on/.test(line)) {
							server.emit("ready");
						}
					});
				var errReader = readline.createInterface({
						input: server.stderr,
						output: process.stderr
					})
					.on("line", Log.err);	//TODO: include workspace / server id?

			}
		);
	},

	stop: function stop(server){
		server.kill("SIGKILL");
		Servers.list = Servers.list.filter(function(otherInstance){
			return otherInstance != server;
		});
	},

	stopAll: function stopAll(){
		Servers.list.forEach(Servers.stop);
	}

};
