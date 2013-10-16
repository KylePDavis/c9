#!/bin/bash
# Finds and execs the desired version of node (symlink to this and exec THAT)
###############################################################################
CMD="$0"
CMD_DIR="$(cd "$(dirname "$CMD")" && pwd)"
CMD_NAME=$(basename "$CMD")

# Find the desired version from the command symlink name
CMD_VER=$(basename "$CMD_NAME" .sh | cut -d. -f2-)

# Adjust path to ensure we find other node binaries
export PATH="$PATH:/usr/local/bin:$CMD_DIR/../nodeenv/bin"

# Find the appropriate node binary and return it in a variable
NODE_BIN=$(
	which -a node | while read NODE_BIN; do
		NODE_VER=$("$NODE_BIN" --version)
		NODE_VER_SHORT=$(echo "$NODE_VER" | cut -dv -f2 -dv | cut -d. -f1-2)
		if [ "$CMD_VER" = "auto" -o "$NODE_VER_SHORT" = "$CMD_VER" ]; then
			echo "$NODE_BIN"
			exit
		fi
	done
)

# Launch if found or error if not
if [ -x "$NODE_BIN" ]; then
	echo "Launching node executable $NODE_BIN ($("$NODE_BIN" --version)) ..."
	exec "$NODE_BIN" "$@"
else
	echo "Unable to find node executable version $CMD_VER in PATH!"
	exit 1
fi
