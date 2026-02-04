#!/bin/bash
set -e

# Navigate to backend directory
cd "$(dirname "$0")"

# Check if dist folder exists
if [ ! -d "dist" ]; then
  echo "Error: dist folder not found. Build may have failed."
  exit 1
fi

# Check if index.js exists
if [ ! -f "dist/index.js" ]; then
  echo "Error: dist/index.js not found. Build may have failed."
  exit 1
fi

# Start the server
echo "Starting backend server..."
node dist/index.js
