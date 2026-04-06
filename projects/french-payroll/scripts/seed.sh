#!/usr/bin/env bash
# seed.sh — Generate seed data, compile COBOL programs, run payroll batch
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/data"
COBOL_DIR="$PROJECT_DIR/cobol"
BIN_DIR="$COBOL_DIR/bin"

echo "================================================================"
echo "  French Payroll — Seed Data Generation"
echo "================================================================"
echo ""

# --- Step 1: Generate employee and variable data ---
echo ">>> Step 1: Generating employee and variable data..."
export DATA_DIR
python3 "$SCRIPT_DIR/seed-employees.py"

# Python writes to EMPLOYEES.dat (sequential), rename for loader
mv "$DATA_DIR/EMPLOYEES.dat" "$DATA_DIR/EMPLOYEES-SEQ.dat"
echo ""

# --- Step 2: Compile COBOL programs ---
echo ">>> Step 2: Compiling COBOL programs..."
bash "$COBOL_DIR/build.sh"

# Also compile the loader
echo -n "  Compiling LOAD-EMPLOYEES... "
cobc -x -o "$BIN_DIR/LOAD-EMPLOYEES" \
    -I "$COBOL_DIR/copybooks" \
    "$COBOL_DIR/programs/LOAD-EMPLOYEES.cbl" 2>&1
echo "OK"
echo ""

# --- Step 3: Build indexed employee file ---
echo ">>> Step 3: Building indexed EMPLOYEES.dat..."
export EMPLOYEE_SEQ_FILE="$DATA_DIR/EMPLOYEES-SEQ.dat"
export EMPLOYEE_FILE="$DATA_DIR/EMPLOYEES.dat"
cd "$COBOL_DIR"
"$BIN_DIR/LOAD-EMPLOYEES"
echo ""

# --- Step 4: Run CALC-PAIE ---
echo ">>> Step 4: Running payroll computation (CALC-PAIE)..."
export VARIABLES_FILE="$DATA_DIR/VARIABLES-PAIE.dat"
export BULLETINS_FILE="$DATA_DIR/BULLETINS.dat"
export COTISATIONS_FILE="$DATA_DIR/COTISATIONS-PATRONALES.dat"
"$BIN_DIR/CALC-PAIE"
echo ""

# --- Step 5: Run CALC-JOURNAL ---
echo ">>> Step 5: Generating PCG journal entries (CALC-JOURNAL)..."
export JOURNAL_FILE="$DATA_DIR/JOURNAL-PCG.dat"
"$BIN_DIR/CALC-JOURNAL"
echo ""

# --- Step 6: Run SORT-EMPLOYEES ---
echo ">>> Step 6: Sorting employees (SORT-EMPLOYEES)..."
export SORTED_FILE="$DATA_DIR/EMPLOYEES-SORTED.dat"
"$BIN_DIR/SORT-EMPLOYEES"
echo ""

# --- Step 7: Generate bulletin text ---
echo ">>> Step 7: Generating text bulletins (GENERATE-BULLETIN-TXT)..."
export BULLETIN_TXT_FILE="$DATA_DIR/BULLETINS-TXT.dat"
"$BIN_DIR/GENERATE-BULLETIN-TXT"
echo ""

# --- Step 8: Generate masse salariale report ---
echo ">>> Step 8: Generating payroll mass report (REPORT-MASSE-SALARIALE)..."
export RAPPORT_FILE="$DATA_DIR/RAPPORT-MASSE.dat"
"$BIN_DIR/REPORT-MASSE-SALARIALE"
echo ""

# --- Step 9: Verify output files ---
echo "================================================================"
echo "  Verification"
echo "================================================================"
echo ""

ALL_OK=true
for FILE in EMPLOYEES.dat EMPLOYEES-SEQ.dat EMPLOYEES-SORTED.dat \
            VARIABLES-PAIE.dat BULLETINS.dat COTISATIONS-PATRONALES.dat \
            JOURNAL-PCG.dat BULLETINS-TXT.dat RAPPORT-MASSE.dat; do
    FPATH="$DATA_DIR/$FILE"
    if [ -f "$FPATH" ] && [ -s "$FPATH" ]; then
        SIZE=$(wc -c < "$FPATH" | tr -d ' ')
        printf "  %-30s %10s bytes  OK\n" "$FILE" "$SIZE"
    else
        printf "  %-30s  MISSING OR EMPTY\n" "$FILE"
        ALL_OK=false
    fi
done

echo ""
if [ "$ALL_OK" = true ]; then
    echo "All output files generated successfully."
else
    echo "WARNING: Some files are missing or empty."
    exit 1
fi
echo ""
echo "================================================================"
echo "  Seed complete. Data in: $DATA_DIR/"
echo "================================================================"
