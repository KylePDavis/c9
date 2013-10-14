C9
==
A wrapper app for running the Cloud9 IDE locally


Installation
------------
```
./setup.sh    # This should take care of things for most apt-based systems

./c9.sh       # A command-line launcher
```
**NOTE:** The `setup.sh` script builds a `C9.app` on Mac OS X but there is a limitation so it will only work within this directory.


TODO
----
* c9: use defaults.xml for new workspaces that do not already have a ".settings" file
* c9: save history of most recently used workspace directories
* c9: open workspaces save on quit, restore on load
* c9: workspace tab close button
* c9: workspace context menu on right click
* c9: new workspace if user drags a directory into c9 (but do not break cloud9 drags)
* cloud9: session timeouts occur after a while and require workspace reload
* cloud9: make node repl work
