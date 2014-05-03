/*jshint browser:true, node:true*/
var Dialogs = require("./Dialogs").init(),
	Servers = require("./Servers").init(),
	$ = window.$;
with({get $() { return window.$; }}){ //NOTE: a HACK to get correct reference after window reload


var Workspaces = module.exports = {

	$container: null,

	get isInitialized() {
		return $("body>#main>#workspaces").length > 0;
	},

	init: function init() {
		if (Workspaces.isInitialized) return Workspaces;
		Workspaces.$container = $('<div id="workspaces"/>').appendTo("body>#main");
		return Workspaces;
	},

	on: function on(eventName, handlerFn) {
		return Workspaces.$container.on(eventName, handlerFn);
	},

	open: function open(dir, callback) {
		//TODO: if dir already open just trigger opened
		Servers.start(dir, function(err, server){
			if(err) return callback(err);
			server.on("ready", function() {
				var $workspaceFrame = $("<iframe nwdisable nwfaketop src='" + server.url + "' onload='this.contentWindow.onkeydown=window.top.onkeydown'/>")
					.appendTo(Workspaces.$container);
				$workspaceFrame[0].server = server;
				Workspaces.$container.triggerHandler("opened", [$workspaceFrame]);
				return callback(null, $workspaceFrame);
			});
		})
	},

	close: function close($workspaceFrame) {
		if ($workspaceFrame.parent()[0] !== Workspaces.$container[0]) return;
		$workspaceFrame.remove();
		Servers.stop($workspaceFrame[0].server);
		Workspaces.$container.triggerHandler("closed", [$workspaceFrame]);
	},

	reload: function reload($workspaceFrame) {
		$workspaceFrame[0].contentWindow.location.reload();
	}

};


}
