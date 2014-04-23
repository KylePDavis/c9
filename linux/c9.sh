#!/bin/sh
CMD_PWD=$(pwd)
CMD="$0"
CMD_DIR="$(cd "$(dirname "$CMD")" && pwd)"
exec "$CMD_DIR/node-webkit/nw" "$CMD_DIR" "$@"
