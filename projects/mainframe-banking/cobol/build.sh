#!/bin/bash
# build.sh — Compile all COBOL programs with GnuCOBOL
# Usage: ./build.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROGRAMS_DIR="$SCRIPT_DIR/programs"
COPYBOOKS_DIR="$SCRIPT_DIR/copybooks"
BIN_DIR="$SCRIPT_DIR/../bin"

mkdir -p "$BIN_DIR"

COBC_FLAGS="-x -std=default -I $COPYBOOKS_DIR"

PROGRAMS=(
    "CREATE-ACCOUNT"
    "ADD-TRANSACTION"
    "GENERATE-RANDOM"
    "SORT-BATCH"
    "UPDATE-BALANCES"
    "QUERY-ACCOUNT"
    "DELETE-ACCOUNT"
)

echo "=== Building COBOL programs ==="
echo "Compiler: $(cobc --version | head -1)"
echo "Copybooks: $COPYBOOKS_DIR"
echo ""

FAILED=0
for PROG in "${PROGRAMS[@]}"; do
    SRC="$PROGRAMS_DIR/$PROG.cbl"
    OUT="$BIN_DIR/$PROG"
    printf "  %-25s ... " "$PROG"
    if cobc $COBC_FLAGS -o "$OUT" "$SRC" 2>&1; then
        echo "OK"
    else
        echo "FAILED"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
if [ $FAILED -eq 0 ]; then
    echo "=== All ${#PROGRAMS[@]} programs compiled successfully ==="
else
    echo "=== $FAILED program(s) failed to compile ==="
    exit 1
fi
