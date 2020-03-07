#!/bin/bash
#
# This script enables or disables running Bela when the board starts
# up.

SCRIPTDIR=$(dirname "$0")
[ -z $SCRIPTDIR ] && SCRIPTDIR="./" || SCRIPTDIR=$SCRIPTDIR/ 
. $SCRIPTDIR.bela_common || { echo "You must be in Bela/scripts to run these scripts" | exit 1; }  

ENABLE_STARTUP=1
RUN_IN_LOOP=1

# This path is hard-coded in the Bela image at present.

usage_brief(){
    echo "Usage: $THIS_SCRIPT [-c command-line-args] [-s] [startup|nostartup] projectname"
}
usage()
{
    echo "
    This script enables or disables running a Bela
    project at startup.
Options:
	\`projectname' the name of the project, as saved on the board

	startup : enables the program at startup (default)
	nostartup : disables the program at startup

	-l : runs the program in a loop, so it is restarted in
	     case it crashes (default)
	-s : runs the program in single-shot mode.
	-c : passes command-line arguments to the Bela program. Make sure
	     you enclose the argument string in quotes.
	-m : passes arguments to the Makefile before the run target."
}

ENABLE_STARTUP=1
while [ -n "$1" ]
do
	case $1 in
		-c)
			shift;
			COMMAND_ARGS="$1";
		;;
		-m)
			shift;
			BBB_MAKEFILE_OPTIONS="$BBB_MAKEFILE_OPTIONS $1";
		;;
		-l)
			RUN_IN_LOOP=1
		;;
		-s)
			RUN_IN_LOOP=0
		;;
		--help|-h|-\?)
			usage
			exit
		;;
		-*)
			echo Error: unknown option $1
			usage_brief
			exit 1;
		;;
		startup)
			ENABLE_STARTUP=1
		;;
		nostartup)
			ENABLE_STARTUP=0
		;;
		*)
			BBB_PROJECT_NAME=$1
		;;
    esac
	shift
done

[ -n "$BBB_PROJECT_NAME" ] || {
	echo "Error: you need to specify a project name. Available projects on the board are:"
	list_available_projects
	usage_brief
	exit 1
}
check_project_exists $BBB_PROJECT_NAME || {
	echo "Error: project $BBB_PROJECT_NAME not found. Available projects on the board are:"
	list_available_projects
	exit 1
}
MAKE_COMMAND="make --no-print-directory -C $BBB_BELA_HOME PROJECT=$BBB_PROJECT_NAME CL=\"$COMMAND_ARGS\" $BBB_MAKEFILE_OPTIONS"
if [ $ENABLE_STARTUP -eq 0 ]
then
    ssh $BBB_ADDRESS "$MAKE_COMMAND nostartup"
elif [ $RUN_IN_LOOP -eq 1 ]
then    
    ssh $BBB_ADDRESS "$MAKE_COMMAND startuploop" 
else 
    ssh $BBB_ADDRESS "$MAKE_COMMAND startup" 
fi
