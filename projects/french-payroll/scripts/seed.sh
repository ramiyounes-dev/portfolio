#!/usr/bin/env bash
# seed.sh — Generate seed data, compile COBOL programs, run payroll batch
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/data"
COBOL_DIR="$PROJECT_DIR/cobol"
BIN_DIR="$COBOL_DIR/bin"

PERIODES=("${@:-202603 202604}")
if [ $# -eq 0 ]; then
  PERIODES=(202603 202604)
fi

echo "================================================================"
echo "  French Payroll — Seed Data Generation"
echo "  Periods: ${PERIODES[*]}"
echo "================================================================"
echo ""

# --- Step 1: Compile COBOL programs (once) ---
echo ">>> Step 1: Compiling COBOL programs..."
bash "$COBOL_DIR/build.sh"

echo -n "  Compiling LOAD-EMPLOYEES... "
cobc -x -o "$BIN_DIR/LOAD-EMPLOYEES" \
    -I "$COBOL_DIR/copybooks" \
    "$COBOL_DIR/programs/LOAD-EMPLOYEES.cbl" 2>&1
echo "OK"
echo ""

# --- Run payroll batch for each period ---
run_period() {
  local PERIODE=$1
  echo "================================================================"
  echo "  Processing period: $PERIODE"
  echo "================================================================"
  echo ""

  # Generate employee and variable data
  echo ">>> Generating employee and variable data..."
  export DATA_DIR PERIODE
  python3 "$SCRIPT_DIR/seed-employees.py"
  mv "$DATA_DIR/EMPLOYEES.dat" "$DATA_DIR/EMPLOYEES-SEQ.dat"
  echo ""

  # Build indexed employee file
  echo ">>> Building indexed EMPLOYEES.dat..."
  export EMPLOYEE_SEQ_FILE="$DATA_DIR/EMPLOYEES-SEQ.dat"
  export EMPLOYEE_FILE="$DATA_DIR/EMPLOYEES.dat"
  cd "$COBOL_DIR"
  "$BIN_DIR/LOAD-EMPLOYEES"
  echo ""

  # Run CALC-PAIE
  echo ">>> Running payroll computation (CALC-PAIE)..."
  export VARIABLES_FILE="$DATA_DIR/VARIABLES-PAIE.dat"
  export BULLETINS_FILE="$DATA_DIR/BULLETINS.dat"
  export COTISATIONS_FILE="$DATA_DIR/COTISATIONS-PATRONALES.dat"
  "$BIN_DIR/CALC-PAIE"
  echo ""

  # Run CALC-JOURNAL
  echo ">>> Generating PCG journal entries (CALC-JOURNAL)..."
  export JOURNAL_FILE="$DATA_DIR/JOURNAL-PCG.dat"
  "$BIN_DIR/CALC-JOURNAL"
  echo ""

  # Run SORT-EMPLOYEES
  echo ">>> Sorting employees (SORT-EMPLOYEES)..."
  export SORTED_FILE="$DATA_DIR/EMPLOYEES-SORTED.dat"
  "$BIN_DIR/SORT-EMPLOYEES"
  echo ""

  # Generate bulletin text
  echo ">>> Generating text bulletins (GENERATE-BULLETIN-TXT)..."
  export BULLETIN_TXT_FILE="$DATA_DIR/BULLETINS-TXT.dat"
  "$BIN_DIR/GENERATE-BULLETIN-TXT"
  echo ""

  # Generate masse salariale report
  echo ">>> Generating payroll mass report (REPORT-MASSE-SALARIALE)..."
  export RAPPORT_FILE="$DATA_DIR/RAPPORT-MASSE.dat"
  "$BIN_DIR/REPORT-MASSE-SALARIALE"
  echo ""

  # Export payroll data to JSON for showcase
  echo ">>> Exporting payroll data to JSON..."
  dotnet run --project "$PROJECT_DIR/dotnet/FrenchPayroll.Export" -- "$DATA_DIR" "$PROJECT_DIR/showcase/data"
  echo ""
}

for P in "${PERIODES[@]}"; do
  run_period "$P"
done

# --- Verification ---
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

for P in "${PERIODES[@]}"; do
    JPATH="$PROJECT_DIR/showcase/data/payroll-${P}.json"
    if [ -f "$JPATH" ] && [ -s "$JPATH" ]; then
        SIZE=$(wc -c < "$JPATH" | tr -d ' ')
        printf "  %-30s %10s bytes  OK\n" "payroll-${P}.json" "$SIZE"
    else
        printf "  %-30s  MISSING OR EMPTY\n" "payroll-${P}.json"
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
