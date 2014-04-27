/*jshint browser:true, node:true*/
var $ = window.$;
with({get $() { return window.$; }}){ //NOTE: a HACK to get correct reference after window reload


var Dialogs = module.exports = {

	$dialogs: null,

	get isInitialized(){
		return $("body>#dialogs").length > 0;
	},

	init: function init(){
		if(Dialogs.isInitialized) return Dialogs;
		Dialogs.$dialogs = $('<div id="dialogs"/>').hide().appendTo(window.document.body);
		return Dialogs;
	},

	getDirectory: function getDirectory(callback){
		Dialogs.$dialogs.remove("input[nwdirectory]");
		var $dialog = $('<input type="file" nwdirectory />')
			.appendTo(Dialogs.$dialogs)
			.click() // trigger dialog show
			.one("change", function(e){
				var dir = $dialog.val();
				return callback(dir);
			});
	}

};


}
