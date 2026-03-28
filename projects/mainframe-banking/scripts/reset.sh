#!/bin/bash
# reset.sh — Wipe data directory and re-seed
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/.."
DATA_DIR="$PROJECT_DIR/data"

echo "=== Resetting mainframe banking data ==="

# Wipe data files
rm -f "$DATA_DIR"/*.dat "$DATA_DIR"/*.json
echo "  Cleared data files"

# Rebuild COBOL if needed
if [ ! -f "$PROJECT_DIR/bin/CREATE-ACCOUNT" ]; then
    echo "  Building COBOL programs..."
    bash "$PROJECT_DIR/cobol/build.sh"
fi

# Re-seed
echo "  Running seed..."
cd "$PROJECT_DIR/web"
python3 seed.py

echo "=== Reset complete ==="
