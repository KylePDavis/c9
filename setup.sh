#!/bin/bash
# Setup script for the c9 app
###############################################################################


# Shell options
set -o pipefail  # Capture fail exit codes in piped commands


# Get command info
CMD_PWD=$(pwd)
CMD="$0"
CMD_DIR="$(cd "$(dirname "$CMD")" && pwd)"


# help
[ "$#" -gt 0 ] && awk 'NR>1,/^(###|$)/{print $0; exit}' "$CMD" && exit 1


# Intro
cd "$CMD_DIR"
echo


# OS
echo "Checking OS ..."
SYS_NAME=$(uname -s)
case "$SYS_NAME" in
 Linux)
	echo "  * Found Linux."
	;;
 Darwin)
	echo "  * Found Darwin."
	;;
*)
	echo "ERROR: Unknown system type $SYS_NAME. Exiting!" 1>&2
	exit 3
	;;
esac
echo


# dependency checks
DEPS="
python
curl
"
for DEP in $DEPS; do
	if ! which $DEP >/dev/null; then
		echo "ERROR: Unable to find the '$DEP' binary in your PATH!" 1>&2
		exit 4
	fi
done
# optional dependencies
OPT_DEPS="
php
"
for DEP in $OPT_DEPS; do
	if ! which $DEP >/dev/null; then
		echo "WARNING: Unable to find the '$DEP' binary in your PATH! Some features may not be available without it."
	fi
done


# virtualenv (python)
echo "Checking python environment ..."
VIRTUALENV_VER="1.9.1"
VIRTUALENV_DIR="nodeenv"	# kept the nodeenv name because it's more for node than for python
if [ -d "$VIRTUALENV_DIR" -a -x "$VIRTUALENV_DIR/bin/activate" -a -x "$VIRTUALENV_DIR/bin/python" ]; then
	echo "  * Found \"./$VIRTUALENV_DIR/\""
else
	echo "  * Configuring Python env in \"./$VIRTUALENV_DIR/\" ..."
	curl -L "https://raw.githubusercontent.com/pypa/virtualenv/$VIRTUALENV_VER/virtualenv.py" | python - "$VIRTUALENV_DIR"
fi
source "$VIRTUALENV_DIR/bin/activate"
echo


# pylint
PYLINT_BIN="./$VIRTUALENV_DIR/bin/pylint"
if [ -x "$PYLINT_BIN" ]; then
	echo "  * Found \"$PYLINT_BIN\""
else
	echo "  * Configuring pylint ..."
	pip install pylint
fi


# nodeenv (node)
echo "Checking node environment ..."
NODE_VER="0.8.26"
NODEENV_VER="0.9.4"
NODEENV_DIR="$VIRTUALENV_DIR"
if [ -d "$NODEENV_DIR" -a -x "$NODEENV_DIR/bin/activate" -a -x "$NODEENV_DIR/bin/node" ] && "$NODEENV_DIR/bin/node" --version | grep -q "^v$NODE_VER"; then
	echo "  * Found \"./$NODEENV_DIR/\""
else
	echo "  * Configuring NodeJS env in \"./$NODEENV_DIR/\" ..."
	curl -L "https://raw.githubusercontent.com/ekalinin/nodeenv/$NODEENV_VER/nodeenv.py" | python - --node="$NODE_VER" --python-virtualenv --prebuilt --clean-src
fi
source "$NODEENV_DIR/bin/activate"
echo


# package dependencies
#TODO: this is kind of a hack since node-webkit is using a much newer version of node but it works for now
echo "Checking package dependencies ..."
if [ -d "node_modules" ]; then
	echo "  * Found \"./node_modules/\""
	if [ "$npm_lifecycle_event" != "install" ]; then
		echo "    * Updating package dependencies ..."
		(
			unset IFS; unset $(env | grep '^npm_' | cut -f1 -d=) #NOTE: to avoid weird issues with npm calling a script that calls npm
			npm --ca="" update
		)
	fi
else
	echo "  * Installing package dependencies ..."
	(
		unset IFS; unset $(env | grep '^npm_' | cut -f1 -d=) #NOTE: to avoid weird issues with npm calling a script that calls npm
		npm --ca="" install
	)
fi
echo


# cloud9
CLOUD9_VER="master"
CLOUD9_DIR="cloud9"
echo "Checking cloud9 server ..."
if [ -d "$CLOUD9_DIR" ]; then
	echo "  * Found \"./$CLOUD9_DIR/\""
else
	if ! which git >/dev/null; then
		echo "  * Installing git ..."
		sudo apt-get install git
	fi

	echo "  * Downloading cloud9 ..."
	git clone --branch="$CLOUD9_VER" --depth 1 https://github.com/ajaxorg/cloud9.git "$CLOUD9_DIR"

	echo "  * Building cloud9 in \"./$CLOUD9_DIR/\" ..."
	cd "$CLOUD9_DIR"
	(
		unset IFS; unset $(env | grep '^npm_' | cut -f1 -d=) #NOTE: to avoid weird issues with npm calling a script that calls npm
		npm install
	)
	cd ..
fi
echo


# cloud9 extensions
echo "Installing cloud9 extensions (server) ..."
for PLUGIN_DIR in cloud9_ext/plugins-server/*/; do
	PLUGIN_NAME=$(basename "$PLUGIN_DIR")
	echo "  * $PLUGIN_NAME ..."
	cp -a "$PLUGIN_DIR" "./cloud9/plugins-server/$PLUGIN_NAME"
done
echo


# node-webkit
echo "Checking node-webkit client ..."
NW_VER="0.9.2"
NW_DIR="node-webkit"
if [ -d "$NW_DIR" ]; then
	echo "  * Found \"./$NW_DIR/\""
else
	echo "  * Downloading node-webkit to \"./$NW_DIR/\" ..."
	case "$SYS_NAME" in

	Linux)
		if [ $(uname -i) = "x86_64" ]; then
			curl "http://dl.node-webkit.org/v$NW_VER/node-webkit-v$NW_VER-linux-x64.tar.gz" | tar -xzf-
			mv "node-webkit-v$NW_VER-linux-x64" "$NW_DIR"
		else
			curl "http://dl.node-webkit.org/v$NW_VER/node-webkit-v$NW_VER-linux-ia32.tar.gz" | tar -xzf-
			mv "node-webkit-v$NW_VER-linux-ia32" "$NW_DIR"
		fi

		if ldd "$NW_DIR/nw" | grep -q 'libudev.so.0 => not found'; then
			echo "  * Installing libudev ..."
			sudo apt-get install libudev?
			if ldd "$NW_DIR/nw" | grep -q 'libudev.so.0 => not found'; then
				# rewrite libudev.so.0 as libudev.so.1 internally -- https://github.com/rogerwang/node-webkit/wiki/The-solution-of-lacking-libudev.so.0
				sed -i 's/\x75\x64\x65\x76\x2E\x73\x6F\x2E\x30/\x75\x64\x65\x76\x2E\x73\x6F\x2E\x31/g' "$NW_DIR/nw"
			fi
		fi
		;;

	Darwin)
		#TODO: unzip from piped stdin instead?
		NW_NAME="node-webkit-v$NW_VER-osx-ia32"
		curl -O "http://dl.node-webkit.org/v$NW_VER/$NW_NAME.zip"
		unzip -n "$NW_NAME.zip"
		rm "$NW_NAME.zip"
		if [ -d "node-webkit.app" ]; then	# older packages
			mv "node-webkit.app" "C9.app"
		else	# newer packages
			mv "$NW_NAME/node-webkit.app" "C9.app"
			rm -fr "$NW_NAME"
		fi
		cp darwin/Info.plist C9.app/Contents/Info.plist
		cp darwin/nw.icns C9.app/Contents/Resources/nw.icns
		mkdir "$NW_DIR"
		echo "The existence of this dir prevents 'setup.sh' from installing 'node-webkit' again;  See the C9.app instead" >> "$NW_DIR/README"
		;;

	*)
		echo "ERROR: Unknown system type $SYS_NAME. Exiting!" 1>&2
		exit 3
		;;

	esac
fi
echo


# c9.sh symlink
echo "Checking links ..."
SYS_NAME_DIR=$(echo "$SYS_NAME" | tr [A-Z] [a-z])
if [ -L c9.sh ]; then
	echo "  * Found ./c9.sh symlink"
else
	echo "  * Creating ./c9.sh symlink"
	ln -s "$SYS_NAME_DIR/c9.sh" c9.sh
fi
echo


# Outro
echo "Now you can run:"
case "$SYS_NAME" in
	Linux)
		echo "  ./c9.sh"
		;;
	Darwin)
		echo "  open ./C9.app    # to open from here, or open via Finder, or using Spotlight"
		;;
esac
