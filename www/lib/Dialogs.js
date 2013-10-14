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
		Dialogs.$dialogs.append('<input type="file" nwdirectory />');
		return Dialogs;
	},

	getDirectory: function getDirectory(callback){
		var $dialog = Dialogs.$dialogs.children("input[nwdirectory]")
			.val("") // clear old value
			.click() // trigger dialog show
			.one("change", function(){
				var dir = $dialog.val();
				return callback(dir);
			});
	}

};


}
