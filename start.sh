#!/bin/bash

# Services Dashboard Startup Script

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR"
SERVER_DIR="$SCRIPT_DIR/server"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}             Services Dashboard Startup Script                  ${NC}"
echo -e "${BLUE}================================================================${NC}"

# Check if this is the first run by checking if node_modules exists
if [ ! -d "$FRONTEND_DIR/node_modules" ] || [ ! -d "$SERVER_DIR/node_modules" ]; then
    echo -e "${YELLOW}First run detected. Installing dependencies...${NC}"
    
    # Install frontend dependencies
    echo -e "${BLUE}Installing frontend dependencies...${NC}"
    cd "$FRONTEND_DIR" && npm install
    
    # Install server dependencies
    echo -e "${BLUE}Installing server dependencies...${NC}"
    cd "$SERVER_DIR" && npm install
    
    echo -e "${GREEN}Dependencies installed successfully!${NC}"
fi

# Start the application
echo -e "${BLUE}Starting the Services Dashboard...${NC}"
cd "$FRONTEND_DIR" && npm run dev:all

# Exit message (this will only execute if npm run dev:all is terminated)
echo -e "${YELLOW}Services Dashboard has been stopped.${NC}" 