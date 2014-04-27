#!/bin/bash
# Clean script for the c9 app
###############################################################################


# Shell options
set -o pipefail  # Capture fail exit codes in piped commands


# Get command info
CMD_PWD=$(pwd)
CMD="$0"
CMD_DIR="$(cd "$(dirname "$CMD")" && pwd)"


# help
[ "$#" -gt 0 ] && awk 'NR>1,/^(###|$)/{print $0; exit}' "$CMD" && exit 1


OUTPUTS="
cloud9/
nodeenv/
node_modules/
node-webkit/
c9.sh
C9.app/
credits.html
nwsnapshot
"

for OUTPUT in $OUTPUTS; do
	echo "rm -fr $OUTPUT ..."
	rm -fr "$OUTPUT"
done
