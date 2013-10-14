/*jshint browser:true, node:true*/
var Dialogs = require("./Dialogs").init(),
	Servers = require("./Servers").init(),
	$ = window.$;
with({get $() { return window.$; }}){ //NOTE: a HACK to get correct reference after window reload


var Workspaces = module.exports = {	//TODO: rename to Workspaces

	$container: null,

	get isInitialized(){
		return $("body>#main>#workspaces").length > 0;
	},

	init: function init(){
		if(Workspaces.isInitialized) return Workspaces;
		Workspaces.$container = $('<div id="workspaces"/>').appendTo("body>#main");
		return Workspaces;
	},

	on: function on(eventName, handlerFn){
		return Workspaces.$container.on(eventName, handlerFn);
	},

	open: function open(dir){
		//TODO: if dir already open just trigger opened
		Servers.findNextPort(function(port){
			var server = Servers.start(dir, port).on("ready", function(){
				var $frame = $("<iframe nwdisable src='" + server.url + "' onload='this.contentWindow.onkeydown=window.top.onkeydown'/>")
					.appendTo(Workspaces.$container);
				$frame[0].server = server;
				Workspaces.$container.triggerHandler("opened", [$frame]);
			});
		});
	},

	close: function close($frame){
		if ($frame.parent()[0] !== Workspaces.$container[0]) return;
		$frame.remove();
		Servers.stop($frame[0].server);
		Workspaces.$container.triggerHandler("closed", [$frame]);
	},

	reload: function reload($frame){
		$frame[0].contentWindow.location.reload();
	}

};


}
