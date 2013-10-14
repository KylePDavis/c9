/*jshint browser:true, node:true*/
var gui = process.gui || require("nw.gui"),
	Tabs = require("./Tabs").init(),
	Dialogs = require("./Dialogs").init(),
	Log = require("./Log").init(),
	Servers = require("./Servers").init(),
	Workspaces = require("./Workspaces").init(),
	$ = window.$;
with({get $() { return window.$; }}){ //NOTE: a HACK to get correct reference after window reload


var Main = module.exports = {

	commands: {
		app:{
			quit: function(){
				gui.App.closeAllWindows();
			}
		},
		workspaces: {
			open: function () {
				setTimeout(function () { //NOTE: needed a bit more time on Mac OS X to avoid a new folder dialog in the open dialog
					Dialogs.getDirectory(function(dir){
						Workspaces.open(dir);
					});
				}, 100);
			},
			reload: function () {
				var $activeTab = Tabs.getActive(),
					$tabElement = $activeTab[0].$element;
				if ($tabElement.is("iframe")) { //NOTE: only do stuff for iframes
					Workspaces.reload($tabElement);
				}
			},
			previous: function () {
				var $activeTab = Tabs.getActive(),
					$previousTab = Tabs.getPrevious($activeTab);
				Tabs.activate($previousTab);
			},
			next: function () {
				var $activeTab = Tabs.getActive(),
					$nextTab = Tabs.getNext($activeTab);
				Tabs.activate($nextTab);
			},
			close: function () {
				var $activeTab = Tabs.getActive(),
					$nextTab = Tabs.getNext($activeTab);
				Tabs.remove($activeTab);
				Tabs.activate($nextTab);
			}
		},
		"window": {
			zoom: function () {
				var win = gui.Window.get();
				if (win._isMaximized) {
					win.unmaximize();
				} else {
					win.maximize();
				}
			}
		}
	},

	init: function(){

		//TODO: save / restore  window size
		//TODO: save / restore  open workspaces

		// Get window
		var win = gui.Window.get();

		win.on("maximize", function(){
			win._isMaximized = true;
		});
		win.on("unmaximize", function(){
			win._isMaximized = false;
		});


		// Setup menubar
		var menubar = new gui.Menu({type:"menubar"});

		// Add the Workspace menu
		var item = new gui.MenuItem({label:"Workspace"});
		menubar.append(item);
		var submenu = new gui.Menu();
		item.submenu = submenu;
		submenu.append(new gui.MenuItem({label:"Open ..."}).on("click", Main.commands.workspaces.open));
		submenu.append(new gui.MenuItem({label:"Reload"}).on("click", Main.commands.workspaces.reload));
		submenu.append(new gui.MenuItem({label:"Previous"}).on("click", Main.commands.workspaces.previous));
		submenu.append(new gui.MenuItem({label:"Next"}).on("click", Main.commands.workspaces.next));
		submenu.append(new gui.MenuItem({label:"Close"}).on("click", Main.commands.workspaces.close));

		if(process.platform === "darwin"){
			// Add the Window menu
			item = new gui.MenuItem({label:"Window"});
			menubar.append(item);
			submenu = item.submenu = new gui.Menu();
			submenu.append(new gui.MenuItem({label:"Zoom"}).on("click", Main.commands.window.zoom));
		}

		// Attach menu to (and extend) the default node-webkit menu
		win.menu = menubar;


		// Initialize
		$(function(){

			var $welcomeTab = Tabs.activate(Tabs.add("Welcome"));
			$welcomeTab[0].$element = $("#main #welcome");

			Tabs
				.on("activated", function(e, $tab){
					if($tab[0] === $welcomeTab[0]){
						Log.$logs.show();
					}else{
						Log.$logs.hide();
					}
					Tabs.$tabs.each(function(){
						this.$element.hide();
					});
					$tab[0].$element.show();
					$tab[0].$element.focus();
				})
				.on("removed", function(e, $tab){
					var $tabElement = $tab[0].$element;
					if ($tabElement.is("iframe")) { //NOTE: only do stuff for iframes
						Workspaces.close($tabElement);
					}
				});

			Workspaces
				.on("opened", function(e, $frame){
					var server = $frame[0].server,
						$tab = Tabs.add(server.id);
					$frame[0].$tab = $tab;
					$tab[0].$element = $frame;
					Tabs.setTooltip($tab, server.dir);
					Tabs.activate($tab);
				})
				.on("closed", function(e, $frame){
					var $tab = $frame[0].$tab;
					Tabs.remove($tab);
				});

			// Trigger ready styles
			setTimeout(function(){
				$(window.document.body).removeClass("notready").addClass("ready");
			}, 0);

		});


		window.onkeydown = function(e) {
			var cmdKeyName = process.platform == "darwin" ? "metaKey" : "ctrlKey",
				cmdKey = e[cmdKeyName];

			if (cmdKey && !e.altKey && !e.shiftKey && e.keyCode === 81) { // Cmd+Q
				//TODO: prompt before quit? only if unsaved changes...  if(confirm("Quit?"))
				Main.commands.app.quit();
			}


			if (cmdKey && !e.altKey && e.shiftKey && e.keyCode === 79) { // Cmd+Shift+O
				Main.commands.workspaces.open();
				return false;
			}

			// if (cmdKey && e.shiftKey && e.keyCode === 82) { // Cmd+Shift+R -- TODO: need another key...this is macro record
			// Tabs.getActive()
			// //TODO: reload workspace?
			// }

			if (cmdKey && !e.altKey && e.shiftKey && e.keyCode === 219) { // Cmd+Shift+[
				Main.commands.workspaces.previous();
				return false;
			}

			if (cmdKey && !e.altKey && e.shiftKey && e.keyCode === 221) { // Cmd+Shift+]
				Main.commands.workspaces.next();
				return false;
			}

			if (cmdKey && !e.altKey && e.shiftKey && e.keyCode === 87) { // Cmd+Shift+W
				Main.commands.workspaces.close();
				return false;
			}

			//
			// Translate keys for common OS operations to the correct keys in the active C9 workspace
			//
			var $activeTab = Tabs.getActive(),
				$tabElement = $activeTab[0].$element,
				frameEl = $tabElement.is("iframe") ? $tabElement[0] : null;

			// remap for close tab
			if (cmdKey && !e.altKey && !e.shiftKey && e.keyCode === 87) { // Cmd+W (to iframe as Alt+W)
				if (frameEl) { //NOTE: only do stuff for iframes
					e = $.Event(e);
					e.view = frameEl.contentWindow;
					e.altKey = true;
					e[cmdKeyName] = false;
					frameEl.contentWindow.document.body.dispatchEvent(e);
				}
				return false;
			}
			// remap for new file
			if (cmdKey && !e.altKey && !e.shiftKey && e.keyCode === 78) { // Cmd+N (to iframe as Alt+Shift+N)
				if (frameEl) { //NOTE: only do stuff for iframes
					e = $.Event(e);
					e.view = frameEl.contentWindow;
					e.altKey = true;
					e.shiftKey = true;
					e[cmdKeyName] = false;
					frameEl.contentWindow.document.body.dispatchEvent(e);
				}
				return false;
			}

			// remap for new folder
			if (cmdKey && !e.altKey && e.shiftKey && e.keyCode === 78) { // Cmd+Shift+N (to iframe as Ctrl+Alt+Shift+N)
				if (frameEl) { //NOTE: only do stuff for iframes
					e = $.Event(e);
					e.view = frameEl.contentWindow;
					e.ctrlKey = true
					e.altKey = true;
					e.shiftKey = true;
					e[cmdKeyName] = false;
					frameEl.contentWindow.document.body.dispatchEvent(e);
				}
				return false;
			}

		};

		//TODO: make user-level actions a separate module of Commands or something
		//TODO: add logging to user-level actions


	}

};

}
