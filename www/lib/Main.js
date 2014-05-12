/*jshint browser:true, node:true*/
var gui = process.gui || require("nw.gui"),
	Tabs = require("./Tabs").init(),
	Dialogs = require("./Dialogs").init(),
	Log = require("./Log").init(),
	Servers = require("./Servers").init(),
	Workspaces = require("./Workspaces").init(),
	fs = require("fs"),
	$ = window.$;
with({get $() { return window.$; }}){ //NOTE: a HACK to get correct reference after window reload


var Main = module.exports = {

	commands: {

		app: {

			quit: function() {
				gui.App.closeAllWindows();
			}

		},

		workspace: {

			open: function () {
				setTimeout(function () { //NOTE: needed a bit more time on Mac OS X to avoid a new folder dialog in the open dialog
					Dialogs.getDirectory(function(dir){ //TODO: BUG: if you cancel these callbacks get queued up somehow ...
						Workspaces.open(dir, function(err, $workspaceFrame){
							if(err) return window.alert("ERROR: Unable to open workspace to " + JSON.stringify(dir) + "\nMESSAGE:\n" + err);
						});
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
				var $activeTab = Tabs.getActive();
				Tabs.remove($activeTab);
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

		},

		debug: {

			reload: function() { //TODO: currently broken
				window.location.reload();
			},

			tools: function() {
				var win = gui.Window.get();
				if (win.isDevToolsOpen()) {
					win.closeDevTools();
				} else {
					win.showDevTools();
				}
			}

		}

	},

	init: function(){

		//TODO: save / restore  window size
		//TODO: save / restore  open workspaces


		// Handle startup args
		gui.App.argv.forEach(function(dir, i) {
			fs.stat(dir, function(err, stat) {
				if (err) return Log.err("Unable to open workspace for %j; ERROR: %j", err);
				Workspaces.open(dir, function(err, $workspaceFrame) {
					if (err) return alert("ERROR: Unable to open workspace to " + JSON.stringify(dir) + "\nMESSAGE:\n" + err);
				});
			});
		});
		//// TODO: Listen to `open` event for subsequent runs
		//gui.App.on("open", function(cmdline) {
		//	Log.out("Got command line: %j", cmdline);
		//});


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
		var item, submenu;

		// Add the main menu
		if(process.platform !== "darwin"){
			item = new gui.MenuItem({label:"App"});
			menubar.append(item);
			submenu = new gui.Menu();
			item.submenu = submenu;
			submenu.append(new gui.MenuItem({label:"Quit"}).on("click", Main.commands.app.quit));
		}

		// Add the Workspace menu
		item = new gui.MenuItem({label:"Workspace"});
		menubar.append(item);
		submenu = new gui.Menu();
		item.submenu = submenu;
		submenu.append(new gui.MenuItem({label:"Open ..."}).on("click", Main.commands.workspace.open));
		submenu.append(new gui.MenuItem({label:"Reload"}).on("click", Main.commands.workspace.reload));
		submenu.append(new gui.MenuItem({label:"Previous"}).on("click", Main.commands.workspace.previous));
		submenu.append(new gui.MenuItem({label:"Next"}).on("click", Main.commands.workspace.next));
		submenu.append(new gui.MenuItem({label:"Close"}).on("click", Main.commands.workspace.close));

		// Add the Window menu
		if(process.platform === "darwin"){
			item = new gui.MenuItem({label:"Window"});
			menubar.append(item);
			submenu = item.submenu = new gui.Menu();
			submenu.append(new gui.MenuItem({label:"Zoom"}).on("click", Main.commands.window.zoom));
		}

		// Add the Debug menu
		item = new gui.MenuItem({label:"Debug"});
		menubar.append(item);
		submenu = item.submenu = new gui.Menu();
		submenu.append(new gui.MenuItem({label:"Tools"}).on("click", Main.commands.debug.tools));
		//TODO: submenu.append(new gui.MenuItem({label:"Reload"}).on("click", Main.commands.debug.reload));

		// Attach menu to (and extend) the default node-webkit menu
		win.menu = menubar;


		// Initialize
		$(function(){

			var $welcomeTab = Tabs.add({
				title: "Welcome",
				tooltip: "Welcome to C9"
			});
			$welcomeTab[0].$element = $("#main #welcome");
			Tabs.activate($welcomeTab);

			var $tabActivated,
				$prevTabActivated;
			Tabs
				.on("activated", function(e, $tab){
					// track pointer to previous tab
					$prevTabActivated = $tabActivated;
					$tabActivated = $tab;
					// toggle the logs based on if this is the welcome tab
					Log.$logs.toggle($tab[0] === $welcomeTab[0]);
					// toggle the logs based on if this is the correct tab
					Tabs.$tabs.each(function(i, t) {
						t.$element.toggle($tab[0] === t);
					});
					$tab[0].$element.focus();
				})
				.on("removed", function(e, $tab){
					// close the workspace for the tab
					var $tabElement = $tab[0].$element;
					if ($tabElement.is("iframe")) { //NOTE: only do stuff for iframes
						Workspaces.close($tabElement);
					}
					// if active tab was removed then select a new tab
					if ($tab[0] === $tabActivated[0]){
						Tabs.activate($prevTabActivated || Tabs.$tabs.first());
					}
				});

		// disable default drag and drop which would change the URL
		$(window)
			.on("dragover", function(e){
				e.preventDefault();
				return false;
			})
			.on("drop", function(e){
				e.preventDefault();
				return false;
			});

		// enable drags on tabs
		Tabs
			.on("dragenter", function(e) {
				$(window.document.body).addClass("draghover");
			})
			.on("dragleave dragend drop", function(e){
				$(window.document.body).removeClass("draghover");
			})
			.on("drop", function(e){
				e.preventDefault();
				var files = Array.apply(null, e.dataTransfer.files);
				files.forEach(function(file) {
					if (fs.statSync(file.path).isDirectory()) {
						Workspaces.open(file.path, function(err, $workspaceFrame) {
							if (err) return alert("ERROR: Unable to open workspace to " + JSON.stringify(file.path) + "\nMESSAGE:\n" + err);
						});
					} else {
						window.alert("ERROR: Unable to create workspace tabs for files; only directories are supported.\n" +
							"Drag directories into the tabs for a new workspace.\n" +
							"Drag files into a workspace's editor to import.");
					}
				});
				return false;
			});

			Workspaces
				.on("opened", function(e, $frame){
					var server = $frame[0].server,
						$tab = Tabs.add({
							title: server.id,
							tooltip: server.dir
						});
					$frame[0].$tab = $tab;
					$tab[0].$element = $frame;
					Tabs.activate($tab);
					Log.out("Opened workspace " + JSON.stringify(server.id) + "; ", {dir:server.dir, url:server.url});
				})
				.on("closed", function(e, $frame){
					var server = $frame[0].server,
						$tab = $frame[0].$tab;
					Tabs.remove($tab);
					Log.out("Closed workspace " + JSON.stringify(server.id) + "; ", {dir:server.dir, url:server.url});
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
				Main.commands.workspace.open();
				return false;
			}

			// if (cmdKey && e.shiftKey && e.keyCode === 82) { // Cmd+Shift+R -- TODO: need another key...this is macro record
			// Tabs.getActive()
			// //TODO: reload workspace?
			// }

			if (cmdKey && !e.altKey && e.shiftKey && e.keyCode === 219) { // Cmd+Shift+[
				Main.commands.workspace.previous();
				return false;
			}

			if (cmdKey && !e.altKey && e.shiftKey && e.keyCode === 221) { // Cmd+Shift+]
				Main.commands.workspace.next();
				return false;
			}

			if (cmdKey && !e.altKey && e.shiftKey && e.keyCode === 87) { // Cmd+Shift+W
				Main.commands.workspace.close();
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
