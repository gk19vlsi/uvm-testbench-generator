#!/usr/bin/env bash
# Render build script for frontend

set -e

echo "Installing dependencies..."
npm install

echo "Building frontend..."
npm run build

echo "Build completed successfully!"
