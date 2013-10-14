#!/bin/sh
CMD_PWD=$(pwd)
CMD="$0"
CMD_DIR="$(cd "$(dirname "$CMD")" && pwd)"
exec "$CMD_DIR/C9.app/Contents/MacOS/node-webkit"
