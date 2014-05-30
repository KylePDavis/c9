// Augment default cloud9 server settings
var plugins = require("./cloud9/configs/default");

// Make sure that /usr/local/bin/ is in the PATH since launching via the GUI doesn't usually include it on OS X
if(/\/usr\/local\/bin\/?/.test(process.env.PATH)){
	process.env.PATH = process.env.PATH + ":/usr/local/bin";
}

// Augment plugin settings
plugins.forEach(function(plugin) {
    if (plugin.packagePath) {
		switch (plugin.packagePath) {

			// setup util scripts for running and debugging node which will detect the proper versions
			case "./cloud9.run.node-debug":
			case "./cloud9.run.node":
				plugin.nodeVersions = {
					"auto": __dirname + "/utils/node.auto.sh",
					"0.10": __dirname + "/utils/node.0.10.sh",
					"0.8": __dirname + "/utils/node.0.8.sh",
					"0.6": __dirname + "/utils/node.0.6.sh"
				};
				break;

			// replace session files with in-memory implementation because it seems to behave more consistently
			case "./connect.session.file":
				plugin.packagePath = "./connect.session.memory";
				break;

        }
    }
});

module.exports = plugins;
