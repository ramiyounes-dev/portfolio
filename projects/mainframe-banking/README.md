# Mainframe Banking Transaction System

A portfolio project that simulates a real mainframe banking workload using **GNU COBOL** on macOS. It demonstrates batch processing, sequential and indexed file I/O, packed decimal arithmetic, and the classic mainframe **appareillage** pattern — all driven through a browser-based terminal UI.

**[Live Demo (no backend required)](showcase/)** — runs entirely in the browser.

## Why This Project Matters

Mainframe systems still process **95% of ATM transactions** and **80% of in-person retail transactions** worldwide. The skills demonstrated here — COBOL batch programming, flat-file data management, sorted-file merge processing — are the same ones used in production at banks, insurance companies, and government agencies running z/OS.

This project translates those concepts into a modern, self-contained demo that runs on any Mac with GNU COBOL installed.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Terminal UI)                     │
│  Transaction Ledger │ Accounts Ledger │ Action/Results Log  │
└──────────────┬──────────────────────────────────────────────┘
               │ AJAX (fetch)
┌──────────────▼──────────────────────────────────────────────┐
│              Flask Web Layer (app.py)                        │
│              Thin shell — all logic in COBOL                │
└──────────────┬──────────────────────────────────────────────┘
               │ subprocess (compiled binaries)
┌──────────────▼──────────────────────────────────────────────┐
│              COBOL Programs (7 programs)                     │
│  CREATE-ACCOUNT │ ADD-TRANSACTION │ GENERATE-RANDOM         │
│  SORT-BATCH │ UPDATE-BALANCES │ QUERY-ACCOUNT │ DELETE-ACCOUNT│
└──────────────┬──────────────────────────────────────────────┘
               │ FILE I/O (OPEN/READ/WRITE/REWRITE/CLOSE)
┌──────────────▼──────────────────────────────────────────────┐
│              Data Files                                      │
│  accounts.dat (INDEXED)  │  transactions.dat (SEQUENTIAL)   │
│  pending.dat (SEQUENTIAL)│  sorted-staging.dat (SEQUENTIAL) │
│  batch-state.dat         │                                   │
└─────────────────────────────────────────────────────────────┘
```

## Key Concepts Demonstrated

### 1. Batch Processing Lifecycle
Every transaction goes through a three-phase lifecycle visible in the UI:
- **PENDING** (red) — raw transaction appended to an unsorted buffer
- **SORTED** (orange) — batch sorted by account number using COBOL `SORT` verb
- **COMMITTED** (green) — applied to account balances and written to permanent ledger

### 2. Appareillage (Sorted-File Merge)
The `UPDATE-BALANCES` program walks the sorted transaction file and the indexed accounts file in lockstep — the classic O(N+M) merge pattern used on mainframes to process millions of records without random access.

### 3. Packed Decimal Arithmetic (COMP-3)
All monetary values use `PIC S9(13)V99 COMP-3` — the same packed decimal format used on IBM mainframes. This avoids floating-point rounding errors and matches real production COBOL.

### 4. Indexed vs Sequential Files
- **ACCOUNTS** uses `ORGANIZATION IS INDEXED` with `ACCESS MODE IS DYNAMIC` — supports both keyed random reads and sequential scans
- **TRANSACTIONS** uses `ORGANIZATION IS SEQUENTIAL` — append-only ledger, read in order

### 5. Copybooks
Shared record layouts (`ACCOUNT-RECORD.cpy`, `TRANSACTION-RECORD.cpy`, etc.) are used across all programs via `COPY` statements — the COBOL equivalent of header files or shared type definitions.

### 6. Auto-Create Accounts
When a transaction references an account number that does not exist, the system automatically creates it — both at the COBOL level (`ADD-TRANSACTION`, `UPDATE-BALANCES`) and in the UI. This mirrors real mainframe behaviour where the transaction file is authoritative.

### 7. Batch Inspection
Clicking any batch divider in the transaction ledger shows a detailed breakdown: per-account net deltas, full transaction list, and the equivalent SQL query. Balances that changed during a commit are highlighted in green.

## Features

- **7 COBOL programs** compiled to native binaries via GNU COBOL
- **Three-phase batch lifecycle** with color-coded status (red → orange → green)
- **Selectable batch dividers** — click to inspect per-account impact
- **Auto-create accounts** from transaction data (owner marked UNKNOWN)
- **Balance diff highlighting** — green highlight on changed values after commit
- **Account management** — create, delete (soft-close), query full history
- **Interactive tutorial** — "How It Works" button explains the algorithm and UI
- **Self-contained showcase** — static HTML page deployable anywhere (no backend)
- **Terminal aesthetic** — IBM 3270 green-screen inspired UI with JetBrains Mono

## Getting Started

### Prerequisites
- macOS with Homebrew
- GNU COBOL: `brew install gnucobol`
- Python 3 with Flask: `pip3 install flask`

### Build & Run
```bash
cd projects/mainframe-banking

# Compile all COBOL programs
bash cobol/build.sh

# Start the web server (seeds data automatically on first load)
cd web && python3 app.py
```

Open http://localhost:5001 in your browser.

### Static Demo (no backend)
Open `showcase/index.html` directly in a browser. All logic runs client-side with seeded data.

### Reset Data
```bash
bash scripts/reset.sh
```

## Project Structure
```
mainframe-banking/
├── cobol/
│   ├── copybooks/          # Shared record layouts (.cpy)
│   │   ├── ACCOUNT-RECORD.cpy
│   │   ├── TRANSACTION-RECORD.cpy
│   │   ├── BATCH-STATE.cpy
│   │   └── CURRENCY-TABLE.cpy
│   ├── programs/           # COBOL source files (.cbl)
│   │   ├── CREATE-ACCOUNT.cbl
│   │   ├── ADD-TRANSACTION.cbl
│   │   ├── GENERATE-RANDOM.cbl
│   │   ├── SORT-BATCH.cbl
│   │   ├── UPDATE-BALANCES.cbl
│   │   ├── QUERY-ACCOUNT.cbl
│   │   └── DELETE-ACCOUNT.cbl
│   └── build.sh            # Compile script
├── bin/                    # Compiled COBOL binaries
├── data/                   # Runtime data files
├── web/
│   ├── app.py              # Flask routes (thin shell over COBOL)
│   ├── seed.py             # Seed data generator
│   ├── templates/          # HTML
│   └── static/             # CSS + JS
├── showcase/
│   └── index.html          # Self-contained static demo
├── scripts/
│   └── reset.sh            # Data reset script
└── README.md
```

## COBOL Programs

| Program | Purpose | File I/O |
|---------|---------|----------|
| `CREATE-ACCOUNT` | Generates next incremented account number, writes to indexed file | INDEXED WRITE |
| `ADD-TRANSACTION` | Appends one transaction to pending buffer, auto-creates account if missing | SEQUENTIAL EXTEND, INDEXED READ/WRITE |
| `GENERATE-RANDOM` | Generates N random transactions for active accounts | SEQUENTIAL EXTEND |
| `SORT-BATCH` | Sorts pending batch by account number (COBOL SORT verb) | SORT, SEQUENTIAL READ/WRITE |
| `UPDATE-BALANCES` | Appareillage: applies sorted batch to accounts, auto-creates missing accounts | INDEXED REWRITE/WRITE, SEQUENTIAL READ/WRITE |
| `QUERY-ACCOUNT` | Returns account metadata + full transaction history | INDEXED READ, SEQUENTIAL SCAN |
| `DELETE-ACCOUNT` | Marks account CLOSED, writes closure withdrawal if balance non-zero | INDEXED REWRITE, SEQUENTIAL EXTEND |
