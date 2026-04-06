#!/usr/bin/env bash
# build.sh — Compile all COBOL programs with GNU COBOL (cobc)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="$SCRIPT_DIR/programs"
CPY_DIR="$SCRIPT_DIR/copybooks"
BIN_DIR="$SCRIPT_DIR/bin"

mkdir -p "$BIN_DIR"

echo "=== Building COBOL programs ==="
echo "Copybook path: $CPY_DIR"

PROGRAMS=(
    "CALC-PAIE"
    "CALC-JOURNAL"
    "SORT-EMPLOYEES"
    "GENERATE-BULLETIN-TXT"
    "REPORT-MASSE-SALARIALE"
)

ERRORS=0
for PROG in "${PROGRAMS[@]}"; do
    echo -n "  Compiling $PROG... "
    if cobc -x -o "$BIN_DIR/$PROG" \
        -I "$CPY_DIR" \
        "$SRC_DIR/$PROG.cbl" 2>&1; then
        echo "OK"
    else
        echo "FAILED"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""
if [ $ERRORS -eq 0 ]; then
    echo "All ${#PROGRAMS[@]} programs compiled successfully."
    echo "Binaries in: $BIN_DIR/"
else
    echo "$ERRORS program(s) failed to compile."
    exit 1
fi
