#!/bin/bash
set -e

echo "Current directory: $(pwd)"
echo "Listing files:"
ls -la

# Check if we're in the root or backend directory
if [ -f "backend/dist/index.js" ]; then
  echo "Found dist in backend directory"
  cd backend
elif [ -f "dist/index.js" ]; then
  echo "Found dist in current directory"
else
  echo "Error: dist/index.js not found in any expected location"
  echo "Checking backend directory:"
  ls -la backend/ || echo "backend directory not found"
  echo "Checking for dist:"
  find . -name "index.js" -type f || echo "No index.js found"
  exit 1
fi

# Start the server
echo "Starting backend server from: $(pwd)"
node dist/index.js
