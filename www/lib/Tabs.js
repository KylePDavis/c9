/*jshint browser:true, node:true*/
var Log = require("./Log").init(),
	$ = window.$;
with({get $() { return window.$; }}){ //NOTE: a HACK to get correct reference after window reload

//TODO: add the plus button

var Tabs = module.exports = {	//TODO: rename to Tabs

	TAB_HTML: '<div class="tab">' +
		'	<div class="tab_middle">' +
		'		<div class="tab_title"/>' +
		'		<div class="tab_x"/>' +
		'	</div>' +
		'	<div class="tab_left"/>' +
		'	<div class="tab_right"/>' +
		'</div>',

	$container: null,

	get $tabs(){
        return Tabs.$container.children();
    },

	get isInitialized(){
		return $("body>#tabs").length > 0;
	},

	init: function init(){
		if(Tabs.isInitialized) return Tabs;
		Tabs.$container = $('<div id="tabs"/>').appendTo(window.document.body);
		return Tabs;
	},

	on: function on(eventName, handlerFn){
		return Tabs.$container.on(eventName, handlerFn);
	},

	add: function add(opts){
		var $tab = $(Tabs.TAB_HTML).appendTo(Tabs.$container);
		if (opts.title) Tabs.setTitle($tab, opts.title);
		if (opts.tooltip) Tabs.setTooltip($tab, opts.tooltip);
		$tab.on("click", Tabs.activate.bind(Tabs, $tab));
		$tab.find(".tab_x").on("click", function(e) {
			Tabs.remove($tab);
			return false;
		});
		Tabs.$container.triggerHandler("added", [$tab]);
		return $tab;
	},

	remove: function remove($tab){
		if ($tab.parent()[0] !== Tabs.$container[0]) return;
		$tab.remove();
		Tabs.$container.triggerHandler("removed", [$tab]);
	},

	setTitle: function setTitle($tab, title){
		$tab.find(".tab_title").text(title || "");
		return $tab;
	},

	setTooltip: function setTooltip($tab, text){
		$tab.attr("title", text);
	},

	activate: function activate($tab){
		var $oldTab = Tabs.$container.children(".tab.active");
		if ($oldTab[0] === $tab[0]) return;
		if ($oldTab[0]) {
			$oldTab.removeClass("active");
			$oldTab.triggerHandler("deactivated", [$oldTab]);
			Tabs.$container.triggerHandler("deactivated", $oldTab);
		}
		$tab.addClass("active");
		$tab.triggerHandler("activated", [$tab]);
		Tabs.$container.triggerHandler("activated", [$tab]);
		return $tab;
	},

	getActive: function getActive(){
		return Tabs.$container.children(".active");
	},

	getNext: function getNext($tab){
		var $nextTab = $tab.next();
		if($nextTab.length > 0) return $nextTab;
		return Tabs.$container.children().first();
	},

	getPrevious: function getPrevious($tab){
		var $prevTab = $tab.prev();
		if($prevTab.length > 0) return $prevTab;
		return Tabs.$container.children().last();
	}

};


}
