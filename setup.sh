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
	echo "ERROR: Unknown system type $SYS_NAME. Exiting!"
	exit 3;
	;;
esac
echo


# nodeenv
echo "Checking node environment ..."
NODEENV_VER="0.6.21"
NODEENV_DIR="nodeenv"
if [ -d "$NODEENV_DIR" -a -x "$NODEENV_DIR/bin/activate" -a -x "$NODEENV_DIR/bin/node" ] && "$NODEENV_DIR/bin/node" --version | grep -q "^v$NODEENV_VER"; then
	echo "  * Found \"./$NODEENV_DIR/\""
else
	if ! which easy_install >/dev/null; then
		echo "  * Installing easy_install ..."
		sudo apt-get install python-setuptools
	fi

	if ! which nodeenv >/dev/null; then
		echo "  * Installing nodeenv ..."
		# get nodeenv
		sudo easy_install nodeenv
	fi

	echo "  * Building node env in \"./$NODEENV_DIR/\" ..."
	# build node env for your computer
	nodeenv --node="$NODEENV_VER" --jobs=4 --clean-src "./$NODEENV_DIR/"
	#TODO: still randomly breaking on requests?   nodeenv --node=0.8.25 --jobs=4 --clean-src "./$NODEENV_DIR/"
fi
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
			. "$NODEENV_DIR/bin/activate"
			npm update
		)
	fi
else
	echo "  * Installing package dependencies ..."
	(
		. "$NODEENV_DIR/bin/activate"
		npm install
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
	source "./$NODEENV_DIR/bin/activate"
	cd "$CLOUD9_DIR"
	npm install
	cd ..
	deactivate_node
fi
echo


# node-webkit
echo "Checking node-webkit client ..."
NW_VER="0.8.3"
NW_DIR="node-webkit"
if [ -d "$NW_DIR" ]; then
	echo "  * Found \"./$NW_DIR/\""
else
	echo "  * Downloading node-webkit to \"./$NW_DIR/\" ..."
	case "$SYS_NAME" in

	 Linux)
		if [ $(uname -i) = "x86_64" ]; then
			curl "https://s3.amazonaws.com/node-webkit/v$NW_VER/node-webkit-v$NW_VER-linux-x64.tar.gz" | tar -xzf-
			mv "node-webkit-v$NW_VER-linux-x64" "$NW_DIR"
		else
			curl "https://s3.amazonaws.com/node-webkit/v$NW_VER/node-webkit-v$NW_VER-linux-ia32.tar.gz" | tar -xzf-
			mv "node-webkit-v$NW_VER-linux-ia32" "$NW_DIR"
		fi

		if ldd "$NW_DIR/nw" | grep -q 'libudev.so.0 => not found'; then
			echo "  * Installing libudev0 ..."
			sudo apt-get install libudev0
		fi
		;;

	 Darwin)
		#TODO: unzip from piped stdin instead?
		curl -O "https://s3.amazonaws.com/node-webkit/v$NW_VER/node-webkit-v$NW_VER-osx-ia32.zip"
		unzip -n "node-webkit-v$NW_VER-osx-ia32.zip"
		rm "node-webkit-v$NW_VER-osx-ia32.zip"
		mv node-webkit.app C9.app
		cp darwin/Info.plist C9.app/Contents/Info.plist 
		cp darwin/nw.icns C9.app/Contents/Resources/nw.icns 
		;;

	*)
		echo "ERROR: Unknown system type $SYS_NAME. Exiting!"
		exit 3;
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
