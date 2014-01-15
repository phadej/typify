#!/bin/sh

set -e
# set -x

COMMITS=`git log master.. --oneline | cut -d " " -f 1 | tail -r`

for COMMIT in $COMMITS; do
	echo "Checking commit" $COMMIT
	git checkout $COMMIT
	npm install
	npm test
done
