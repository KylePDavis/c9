/*jshint browser:true, node:true*/
var path = require("path"),
	net = require("net"),
	gui = process.gui || require("nw.gui"),
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

	findNextPort: function findNextPort(callback){
		Log.dbg("Servers.findNextPort port=%s available?", Servers._nextPort);
		var svr = net.createServer()
			.on("listening", function(){
				Log.dbg("Servers.findNextPort port=%s AVAILABLE!", Servers._nextPort);
				var port = Servers._nextPort;
				Servers._nextPort++;
				svr.once("close", function(){
					callback(port);
				});
				svr.close();
			})
			.on("error", function(err){
				Log.dbg("Servers.findNextPort port=%s error (%s); next ...", Servers._nextPort, err);
				Servers._nextPort++; // skip this one, it seems to be taken
				return Servers.findNextPort(callback);
			})
			.listen(Servers._nextPort);
	},

	/**
	 * @method start
	 * @static
	 * @param dir
	 * @param [port]
	 * @param [ip]
	 **/
	start: function start(dir, port, ip){
		var childProcess = require("child_process"),
			readline = require("readline"),
			nodeEnvDir = process.cwd() + "/nodeenv",
			nodeBin = nodeEnvDir + "/bin/node",
			nodeArgs = [process.cwd() + "/cloud9/server.js", process.cwd() + "/serverConfig", "-w", dir];
		if (!ip) ip = Config.current.ip;
		Log.out("Starting new C9 server process: ", {bin:nodeBin, args:nodeArgs, env:process.env});
		process.env.IP = ip;
		process.env.PORT = port;
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

		server.id = path.basename(dir); //Servers.list.length; //TODO: handle collisions
		server.dir = dir;
		server.url = "http://" + ip + ":" + port + "/?noworker=1";

		Servers.list.push(server);

		return server;
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
