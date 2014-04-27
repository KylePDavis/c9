/*jshint browser:true, node:true*/
var util = require("util"),
	$ = window.$;
with({get $() { return window.$; }}){ //NOTE: a HACK to get correct reference after window reload


var Log = module.exports = {

	$logs: null,

	get isInitialized(){
		return $("body>#logs").length > 0;
	},

	init: function init(){
		if(Log.isInitialized) return Log;
		Log.$logs = $('<div id="logs" class="rounded"/>').appendTo(window.document.body);
		Log.$logs.append("<h2>Logs</h2>");
		Log.$logsMsgs = $("<pre/>").appendTo(Log.$logs);
		return Log;
	},

	msg: function msg(isErr/*, args*/){
		var args = [].slice.call(arguments, 1),
			str = util.format.apply(util, args) + "\n",
// 			stream = isErr ? process.stderr : process.stdout,
			logger = isErr ? console.error : console.log;
		logger.apply(console, args);
		Log.$logsMsgs[0].innerHTML += str;
		Log.$logsMsgs[0].scrollTop = Log.$logsMsgs[0].scrollHeight;
// 		stream.write(str);
	},

	out: function out(/*args*/){
		Log.msg.apply(Log, [].concat.apply([false], arguments));
	},

	err: function err(/*args*/){
		Log.msg.apply(Log, [].concat.apply([true], arguments));
	},

	isDebugEnabled: true,

	dbg: function dbg(/*args*/){
		if(Log.isDebugEnabled) Log.msg.apply(Log, [].concat.apply([true], arguments));
	}

};


}
