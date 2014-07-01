#!/bin/sh

# Generate dist/typify.standalone.js and friends
make dist

if [ -n "`git status --porcelain`" ]; then
	echo "Error: dirty repository"
	exit 1
fi

NCOMMITS=`git describe --tags --match "v*" --dirty --long | cut -d "-" -f 2`

if [ $NCOMMITS -ne 0 ]; then
	echo "Commits after last tag"
	exit 1
fi
