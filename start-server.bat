@echo off
echo Starting API server...
cd /d "%~dp0server"
set NODE_PATH="%~dp0server\node_modules"
node index.js 