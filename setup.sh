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
	echo "Detected Linux."
	;;
 Darwin)
	echo "Detected Darwin."
	;;
*)
	echo "Unknown system type $SYS_NAME. Exiting!"
	exit 3;
	;;
esac


# nodeenv
echo "Checking node environment ..."
if [ -d nodeenv ]; then
	echo "  * Found ./nodeenv/"
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

	echo "  * Building node env in ./nodeenv/ ..."
	# build node env for your computer
	nodeenv --node=0.6.21 --jobs=4 --clean-src ./nodeenv/
	#TODO: still randomly breaking on requests?   nodeenv --node=0.8.25 --jobs=4 --clean-src ./nodeenv/
fi
echo


# cloud9
echo "Checking cloud9 server ..."
if [ -d cloud9 ]; then
	echo "  * Found ./cloud9/"
else
	if ! which git >/dev/null; then
		echo "  * Installing git ..."
		sudo apt-get install git
	fi

	echo "  * Downloading cloud9 ..."
	git clone https://github.com/ajaxorg/cloud9.git cloud9

	echo "  * Building cloud9 in ./cloud9/ ..."
	source ./nodeenv/bin/activate
	cd cloud9
	npm install
	cd ..
	deactivate_node
fi
echo


# node-webkit
echo "Checking node-webkit client ..."
if [ -d node-webkit ]; then
	echo "  * Found ./node-webkit/"
else
	echo "  * Downloading node-webkit to ./node-webkit/ ..."
	case "$SYS_NAME" in

	 Linux)
		if [ $(uname -i) = "x86_64" ]; then
			curl https://s3.amazonaws.com/node-webkit/v0.7.5/node-webkit-v0.7.5-linux-x64.tar.gz | tar -xzf-
			mv node-webkit-v0.7.5-linux-x64 node-webkit
		else
			curl https://s3.amazonaws.com/node-webkit/v0.7.5/node-webkit-v0.7.5-linux-ia32.tar.gz | tar -xzf-
			mv node-webkit-v0.7.5-linux-ia32 node-webkit
		fi

		if ldd node-webkit/nw | grep -q 'libudev.so.0 => not found'; then
			echo "  * Installing libudev0 ..."
			sudo apt-get install libudev0
		fi
		;;

	 Darwin)
		#TODO: unzip from piped stdin instead?
		curl -O https://s3.amazonaws.com/node-webkit/v0.7.5/node-webkit-v0.7.5-osx-ia32.zip
		unzip node-webkit-v0.7.5-osx-ia32.zip
		rm node-webkit-v0.7.5-osx-ia32.zip
		mv node-webkit.app C9.app
		cp darwin/Info.plist C9.app/Contents/Info.plist 
		cp darwin/nw.icns C9.app/Contents/Resources/nw.icns 
		;;

	*)
		echo "Unknown system type $SYS_NAME. Exiting!"
		exit 3;
		;;

	esac
fi
echo


# Outro
echo "Now you can run:"
case "$SYS_NAME" in
 Linux)
	echo "  ./c9.sh"
	;;
 Darwin)
	echo "  open ./C9.app    # to open from here, or open via Finder or Spotlight"
	;;
esac
