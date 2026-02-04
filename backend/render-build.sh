#!/usr/bin/env bash
# Render build script for backend

set -e

echo "Installing dependencies..."
npm install

echo "Building backend..."
npm run build

echo "Build completed successfully!"
