#!/bin/bash
set -e

echo "Building backend..."
npm install
cd backend
npm run build
echo "Backend built successfully!"
