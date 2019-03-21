@echo off
cd /d %~dp0
java -jar webrtc.jar --spring.resources.static-locations=file:%cd%\html


