#!/bin/bash
basepath=$(cd `dirname $0`; pwd)
cd $basepath
java -jar webrtc.jar --spring.resources.static-locations=file:${basepath}/html

