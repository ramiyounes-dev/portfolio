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
- **ACCOUNTS** uses `ORGANIZATION IS INDEXED` with `ACCESS MODE IS DYNAMIC` — supports both keyed random reads and sequential scans (VSAM KSDS analogue)
- **TRANSACTIONS** uses `ORGANIZATION IS SEQUENTIAL` — append-only ledger, read in order (VSAM ESDS analogue)

### 5. File Organization

| File | Org | Access Mode | Record Length | VSAM Analogue | Purpose |
|------|-----|-------------|---------------|---------------|---------|
| `accounts.dat` | INDEXED | DYNAMIC | 120 bytes | KSDS | Master account file — keyed on `ACCT-NUMBER` |
| `transactions.dat` | SEQUENTIAL | SEQUENTIAL | 150 bytes | ESDS | Permanent ledger — append-only committed records |
| `pending.dat` | SEQUENTIAL | SEQUENTIAL | 150 bytes | ESDS | Unsorted buffer — raw transactions awaiting sort |
| `sorted-staging.dat` | SEQUENTIAL | SEQUENTIAL | 150 bytes | ESDS | Sorted batch — output of COBOL SORT, input to appareillage |
| `batch-state.dat` | SEQUENTIAL | SEQUENTIAL | 80 bytes | — | Single-record control file — tracks batch lifecycle state |

#### Record Layouts (Copybooks)

**ACCOUNT-RECORD** (120 bytes) — `ACCOUNT-RECORD.cpy`
```
ACCT-NUMBER        PIC 9(10)              10 bytes   Record key
ACCT-OWNER-NAME    PIC X(30)              30 bytes
ACCT-TYPE          PIC X(8)                8 bytes   CHECKING / SAVINGS / CREDIT
ACCT-CURRENCY      PIC X(3)                3 bytes   USD / EUR / GBP / LBP / JPY
ACCT-BALANCE       PIC S9(13)V99 COMP-3    8 bytes   Packed decimal
ACCT-STATUS        PIC X(8)                8 bytes   ACTIVE / CLOSED / FROZEN
ACCT-OPEN-DATE     PIC 9(8)                8 bytes   YYYYMMDD
FILLER             PIC X(55)              55 bytes
```

**TRANSACTION-RECORD** (150 bytes) — `TRANSACTION-RECORD.cpy`
```
TXN-ID             PIC 9(10)              10 bytes   Unique transaction ID
TXN-TIMESTAMP      PIC 9(14)              14 bytes   YYYYMMDDHHMMSS
TXN-ACCOUNT-NUM    PIC 9(10)              10 bytes   Foreign key → ACCT-NUMBER
TXN-AMOUNT         PIC S9(13)V99 COMP-3    8 bytes   Packed decimal (signed)
TXN-TYPE           PIC X(10)              10 bytes   DEPOSIT / WITHDRAWAL / TRANSFER / PAYMENT / CLOSURE
TXN-DESCRIPTION    PIC X(40)              40 bytes   Locale-aware free text
TXN-CURRENCY       PIC X(3)                3 bytes
TXN-RUNNING-BAL    PIC S9(13)V99 COMP-3    8 bytes   Balance after this transaction
TXN-STATUS         PIC X(8)                8 bytes   PENDING / SORTED / COMMIT
TXN-BATCH-NUM      PIC 9(6)                6 bytes   Batch sequence number
FILLER             PIC X(39)              39 bytes
```

**BATCH-STATE-RECORD** (80 bytes) — `BATCH-STATE.cpy`
```
BATCH-LAST-COMMITTED  PIC 9(10)           10 bytes   Last committed transaction ID
BATCH-SEQUENCE-NUM    PIC 9(6)             6 bytes   Batch counter
BATCH-STATUS          PIC X(8)             8 bytes   IDLE / SORTED / POSTING
BATCH-PENDING-COUNT   PIC 9(10)           10 bytes   Pending transaction count
BATCH-LAST-TXN-ID     PIC 9(10)           10 bytes   Last generated transaction ID
BATCH-TIMESTAMP       PIC 9(14)           14 bytes   YYYYMMDDHHMMSS
FILLER                PIC X(22)           22 bytes
```

### 6. Access Patterns

Each COBOL program opens only the files it needs, with the minimum access mode required:

| Program | accounts.dat | pending.dat | sorted-staging.dat | transactions.dat | batch-state.dat |
|---------|-------------|-------------|-------------------|-----------------|----------------|
| `CREATE-ACCOUNT` | DYNAMIC, I-O (READ NEXT to find max key, then WRITE) | — | — | — | — |
| `ADD-TRANSACTION` | RANDOM, I-O (READ to verify, reject if missing) | EXTEND (WRITE) | — | — | READ → WRITE |
| `GENERATE-RANDOM` | DYNAMIC, INPUT (READ NEXT to load active accounts) | EXTEND (WRITE) | — | — | READ → WRITE |
| `SORT-BATCH` | — | INPUT (read all) | OUTPUT (write sorted) | — | READ → WRITE |
| `UPDATE-BALANCES` | DYNAMIC, I-O (random READ by key, REWRITE; ALERT if missing/closed) | — | INPUT (sequential read) | EXTEND (WRITE) | READ → WRITE |
| `QUERY-ACCOUNT` | RANDOM, INPUT (READ by key) | — | — | INPUT (sequential scan) | — |
| `DELETE-ACCOUNT` | RANDOM, I-O (READ + REWRITE) | — | — | EXTEND (WRITE closure) | READ |

Key observations:
- **`accounts.dat`** is the only indexed file — all others are sequential
- **`UPDATE-BALANCES`** reads `sorted-staging.dat` sequentially but does **random keyed reads** on `accounts.dat` for each transaction (the appareillage pattern)
- **`batch-state.dat`** is a single-record control file — programs read it at start, write it back at end to track lifecycle state (IDLE → SORTED → POSTING → IDLE)
- **`pending.dat`** is always opened with EXTEND (append-only) — never overwritten mid-batch
- **COMP-3 packed decimal** (`PIC S9(13)V99 COMP-3` = 8 bytes) avoids floating-point rounding on all monetary values

### 7. Copybooks
Shared record layouts (`ACCOUNT-RECORD.cpy`, `TRANSACTION-RECORD.cpy`, `BATCH-STATE.cpy`, `CURRENCY-TABLE.cpy`) are used across all programs via `COPY` statements — the COBOL equivalent of header files or shared type definitions.

### 8. Error Handling & Alert Flagging
When a transaction references an account that does not exist or is closed, the system rejects it instead of silently proceeding:
- **`ADD-TRANSACTION`** rejects the transaction with an error if the account is not found
- **`UPDATE-BALANCES`** flags the transaction as **ALERT** (yellow) in the ledger if the account is missing or closed, logs a warning, and skips it
This makes orphaned or invalid transactions immediately visible for investigation.

### 9. Batch Inspection
Clicking any batch divider in the transaction ledger shows a detailed breakdown: per-account net deltas, full transaction list, and the equivalent SQL query. Balances that changed during a commit are highlighted in green.

## Features

- **7 COBOL programs** compiled to native binaries via GNU COBOL
- **Three-phase batch lifecycle** with color-coded status (red → orange → green)
- **Selectable batch dividers** — click to inspect per-account impact
- **Alert flagging** — transactions referencing missing or closed accounts are flagged yellow (ALERT) in the ledger
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
| `ADD-TRANSACTION` | Appends one transaction to pending buffer, rejects if account not found | SEQUENTIAL EXTEND, INDEXED READ |
| `GENERATE-RANDOM` | Generates N random transactions for active accounts | SEQUENTIAL EXTEND |
| `SORT-BATCH` | Sorts pending batch by account number (COBOL SORT verb) | SORT, SEQUENTIAL READ/WRITE |
| `UPDATE-BALANCES` | Appareillage: applies sorted batch to accounts, flags missing/closed as ALERT | INDEXED REWRITE, SEQUENTIAL READ/WRITE |
| `QUERY-ACCOUNT` | Returns account metadata + full transaction history | INDEXED READ, SEQUENTIAL SCAN |
| `DELETE-ACCOUNT` | Marks account CLOSED, writes closure withdrawal if balance non-zero | INDEXED REWRITE, SEQUENTIAL EXTEND |
