"""
app.py — Flask web layer for the mainframe banking system.
Thin shell over COBOL programs invoked via subprocess.
"""

import os
import subprocess
import json
import struct
from datetime import datetime
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.join(BASE_DIR, '..')
BIN_DIR = os.path.join(PROJECT_DIR, 'bin')
DATA_DIR = os.path.abspath(os.path.join(PROJECT_DIR, 'data'))

# COBOL record lengths (must match copybooks)
ACCOUNT_RECORD_LEN = 120
TRANSACTION_RECORD_LEN = 150
BATCH_STATE_RECORD_LEN = 80


def unpack_comp3(data):
    """Unpack a COMP-3 (packed decimal) value. PIC S9(13)V99 = 8 bytes."""
    nibbles = []
    for byte in data:
        nibbles.append((byte >> 4) & 0x0F)
        nibbles.append(byte & 0x0F)
    sign_nibble = nibbles[-1]
    digit_nibbles = nibbles[:-1]
    value = 0
    for n in digit_nibbles:
        value = value * 10 + n
    # 2 implied decimal places
    value = value / 100.0
    if sign_nibble == 0x0D:
        value = -value
    return value


def parse_account_record(data):
    """Parse a raw ACCOUNT-RECORD (120 bytes) into a dict."""
    if len(data) < ACCOUNT_RECORD_LEN:
        return None
    return {
        'acct_number': data[0:10].decode('ascii', errors='replace').strip(),
        'owner_name': data[10:40].decode('ascii', errors='replace').strip(),
        'acct_type': data[40:48].decode('ascii', errors='replace').strip(),
        'currency': data[48:51].decode('ascii', errors='replace').strip(),
        'balance': unpack_comp3(data[51:59]),
        'status': data[59:67].decode('ascii', errors='replace').strip(),
        'open_date': data[67:75].decode('ascii', errors='replace').strip(),
    }


def parse_transaction_record(data):
    """Parse a raw TRANSACTION-RECORD (150 bytes) into a dict."""
    if len(data) < TRANSACTION_RECORD_LEN:
        return None
    return {
        'txn_id': data[0:10].decode('ascii', errors='replace').strip(),
        'timestamp': data[10:24].decode('ascii', errors='replace').strip(),
        'acct_number': data[24:34].decode('ascii', errors='replace').strip(),
        'amount': unpack_comp3(data[34:42]),
        'txn_type': data[42:52].decode('ascii', errors='replace').strip(),
        'description': data[52:92].decode('ascii', errors='replace').strip(),
        'currency': data[92:95].decode('ascii', errors='replace').strip(),
        'running_bal': unpack_comp3(data[95:103]),
        'status': data[103:111].decode('ascii', errors='replace').strip(),
        'batch_num': data[111:117].decode('ascii', errors='replace').strip(),
    }


def parse_batch_state(data):
    """Parse a raw BATCH-STATE-RECORD (80 bytes) into a dict."""
    if len(data) < BATCH_STATE_RECORD_LEN:
        return None
    return {
        'last_committed': data[0:10].decode('ascii', errors='replace').strip(),
        'sequence_num': data[10:16].decode('ascii', errors='replace').strip(),
        'status': data[16:24].decode('ascii', errors='replace').strip(),
        'pending_count': data[24:34].decode('ascii', errors='replace').strip(),
        'last_txn_id': data[34:44].decode('ascii', errors='replace').strip(),
        'timestamp': data[44:58].decode('ascii', errors='replace').strip(),
    }


def read_all_accounts():
    """Read the indexed accounts file by calling COBOL QUERY or reading raw."""
    # For indexed files, we can't just read raw bytes (ISAM format).
    # We'll use a helper approach: list all accounts via sequential read.
    # GnuCOBOL indexed files have a header, so we call a COBOL program.
    # Alternatively, we iterate with QUERY-ACCOUNT for known account numbers.
    # Best: read the file using the COBOL program for each.
    # For efficiency, let's do a sequential scan via subprocess.
    accounts = []
    # We'll call QUERY-ACCOUNT with a special "ALL" argument
    # Actually, let's just create a simple Python reader that understands
    # GnuCOBOL's ISAM format, or better yet, shell out for each account.

    # Pragmatic approach: maintain a JSON sidecar for quick reads
    sidecar = os.path.join(DATA_DIR, 'accounts.json')
    if os.path.exists(sidecar):
        with open(sidecar, 'r') as f:
            return json.load(f)
    return accounts


def read_all_transactions():
    """Read the sequential transactions file."""
    path = os.path.join(DATA_DIR, 'transactions.dat')
    transactions = []
    if not os.path.exists(path):
        return transactions
    with open(path, 'rb') as f:
        while True:
            data = f.read(TRANSACTION_RECORD_LEN)
            if len(data) < TRANSACTION_RECORD_LEN:
                break
            rec = parse_transaction_record(data)
            if rec:
                transactions.append(rec)
    return transactions


def read_pending_transactions():
    """Read the pending transactions file."""
    path = os.path.join(DATA_DIR, 'pending.dat')
    transactions = []
    if not os.path.exists(path):
        return transactions
    with open(path, 'rb') as f:
        while True:
            data = f.read(TRANSACTION_RECORD_LEN)
            if len(data) < TRANSACTION_RECORD_LEN:
                break
            rec = parse_transaction_record(data)
            if rec:
                transactions.append(rec)
    return transactions


def read_sorted_transactions():
    """Read the sorted staging file."""
    path = os.path.join(DATA_DIR, 'sorted-staging.dat')
    transactions = []
    if not os.path.exists(path):
        return transactions
    with open(path, 'rb') as f:
        while True:
            data = f.read(TRANSACTION_RECORD_LEN)
            if len(data) < TRANSACTION_RECORD_LEN:
                break
            rec = parse_transaction_record(data)
            if rec:
                transactions.append(rec)
    return transactions


def read_batch_state():
    """Read the batch state file."""
    path = os.path.join(DATA_DIR, 'batch-state.dat')
    if not os.path.exists(path):
        return None
    with open(path, 'rb') as f:
        data = f.read(BATCH_STATE_RECORD_LEN)
    if len(data) < BATCH_STATE_RECORD_LEN:
        return None
    return parse_batch_state(data)


def run_cobol(program, args=None):
    """Run a compiled COBOL program and return its stdout output."""
    prog_path = os.path.join(BIN_DIR, program)
    if not os.path.exists(prog_path):
        return {'error': f'Program not found: {program}'}

    cmd = [prog_path] + (args or [])
    env = os.environ.copy()
    env['DATA_DIR'] = DATA_DIR

    result = subprocess.run(
        cmd, capture_output=True, text=True, env=env, timeout=30
    )

    lines = result.stdout.strip().split('\n') if result.stdout.strip() else []
    return {
        'lines': lines,
        'stderr': result.stderr.strip() if result.stderr else '',
        'returncode': result.returncode,
    }


def parse_cobol_output(lines):
    """Parse pipe-delimited COBOL output lines into structured data."""
    records = []
    metadata = {}
    for line in lines:
        parts = line.split('|')
        if not parts:
            continue
        tag = parts[0].strip()
        if tag == 'OK':
            records.append([p.strip() for p in parts[1:]])
        elif tag == 'ACCOUNT':
            metadata['account'] = [p.strip() for p in parts[1:]]
        elif tag == 'TXN':
            records.append([p.strip() for p in parts[1:]])
        elif tag == 'ERROR':
            metadata['error'] = '|'.join(parts[1:]).strip()
        elif tag in ('SORT-COMPLETE', 'UPDATE-COMPLETE', 'QUERY-COMPLETE'):
            metadata['message'] = '|'.join(parts[1:]).strip()
        elif tag == 'CLOSURE-TXN':
            metadata['closure_txn'] = [p.strip() for p in parts[1:]]
        elif tag == 'ALERT':
            if 'alerts' not in metadata:
                metadata['alerts'] = []
            metadata['alerts'].append(
                [p.strip() for p in parts[1:]])
    return records, metadata


def save_accounts_sidecar(accounts):
    """Save accounts list to JSON sidecar for quick reads."""
    path = os.path.join(DATA_DIR, 'accounts.json')
    with open(path, 'w') as f:
        json.dump(accounts, f, indent=2)


def refresh_accounts_from_cobol():
    """Rebuild accounts sidecar by querying each known account."""
    sidecar = os.path.join(DATA_DIR, 'accounts.json')
    if not os.path.exists(sidecar):
        return []

    with open(sidecar, 'r') as f:
        old_accounts = json.load(f)

    acct_numbers = [a['acct_number'] for a in old_accounts]
    new_accounts = []
    for acct_num in acct_numbers:
        result = run_cobol('QUERY-ACCOUNT', [acct_num])
        records, meta = parse_cobol_output(result['lines'])
        if 'account' in meta:
            a = meta['account']
            new_accounts.append({
                'acct_number': a[0] if len(a) > 0 else '',
                'owner_name': a[1] if len(a) > 1 else '',
                'acct_type': a[2] if len(a) > 2 else '',
                'currency': a[3] if len(a) > 3 else '',
                'balance': float(a[4]) if len(a) > 4 else 0.0,
                'status': a[5] if len(a) > 5 else '',
                'open_date': a[6] if len(a) > 6 else '',
            })
        else:
            # Keep old data if query fails
            old = next((x for x in old_accounts if x['acct_number'] == acct_num), None)
            if old:
                new_accounts.append(old)

    save_accounts_sidecar(new_accounts)
    return new_accounts


# ─── Routes ───────────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/init', methods=['POST'])
def api_init():
    """Initialize/reset seed data. Called on full page load."""
    from seed import generate_seed_data, create_accounts_via_cobol

    result = generate_seed_data()
    create_accounts_via_cobol(result)

    # Build accounts sidecar from the COBOL-created indexed file
    accounts = []
    for acct_num, owner, acct_type, currency, balance in result['accounts']:
        final_bal = result['balances'].get(acct_num, balance)
        accounts.append({
            'acct_number': acct_num,
            'owner_name': owner,
            'acct_type': acct_type.strip(),
            'currency': currency,
            'balance': round(final_bal, 2),
            'status': 'ACTIVE',
            'open_date': '20240115',
        })
    save_accounts_sidecar(accounts)

    # Read back committed transactions
    transactions = read_all_transactions()
    batch_state = read_batch_state()

    return jsonify({
        'accounts': accounts,
        'transactions': transactions,
        'batch_boundaries': [
            {'batch_num': b[0], 'last_txn_id': b[1], 'timestamp': b[2]}
            for b in result['batch_boundaries']
        ],
        'batch_state': batch_state,
    })


@app.route('/api/state')
def api_state():
    """Get current system state."""
    accounts = read_all_accounts()
    transactions = read_all_transactions()
    pending = read_pending_transactions()
    sorted_txns = read_sorted_transactions()
    batch_state = read_batch_state()

    return jsonify({
        'accounts': accounts,
        'transactions': transactions,
        'pending': pending,
        'sorted': sorted_txns,
        'batch_state': batch_state,
    })


@app.route('/api/add-random', methods=['POST'])
def api_add_random():
    """Generate N random transactions."""
    count = request.json.get('count', 1) if request.json else 1
    result = run_cobol('GENERATE-RANDOM', [str(count)])
    records, meta = parse_cobol_output(result['lines'])

    if 'error' in meta:
        return jsonify({'error': meta['error']}), 400

    pending_txns = []
    for rec in records:
        pending_txns.append({
            'txn_id': rec[0] if len(rec) > 0 else '',
            'timestamp': rec[1] if len(rec) > 1 else '',
            'acct_number': rec[2] if len(rec) > 2 else '',
            'txn_type': rec[3] if len(rec) > 3 else '',
            'amount': float(rec[4]) if len(rec) > 4 else 0.0,
            'currency': rec[5] if len(rec) > 5 else '',
            'description': rec[6] if len(rec) > 6 else '',
            'status': rec[7] if len(rec) > 7 else 'PENDING',
            'batch_num': rec[8] if len(rec) > 8 else '',
        })

    # COBOL action log
    action_log = [
        "PROCEDURE DIVISION.",
        "GENERATE-ONE-TXN.",
        f"    COMPUTE WS-RAND = FUNCTION RANDOM",
        f"    OPEN EXTEND PENDING-FILE",
        f"    WRITE TRANSACTION-RECORD",
        f"    * Generated {count} transaction(s)",
        f"    * Appended to pending.dat (unsorted buffer)",
        f"    CLOSE PENDING-FILE.",
    ]

    return jsonify({
        'transactions': pending_txns,
        'action_log': action_log,
        'cobol_output': result['lines'],
    })


@app.route('/api/sort-batch', methods=['POST'])
def api_sort_batch():
    """Sort the pending batch."""
    result = run_cobol('SORT-BATCH')
    records, meta = parse_cobol_output(result['lines'])

    if 'error' in meta:
        return jsonify({'error': meta['error']}), 400

    sorted_txns = []
    for rec in records:
        sorted_txns.append({
            'txn_id': rec[0] if len(rec) > 0 else '',
            'timestamp': rec[1] if len(rec) > 1 else '',
            'acct_number': rec[2] if len(rec) > 2 else '',
            'txn_type': rec[3] if len(rec) > 3 else '',
            'amount': float(rec[4]) if len(rec) > 4 else 0.0,
            'currency': rec[5] if len(rec) > 5 else '',
            'description': rec[6] if len(rec) > 6 else '',
            'status': 'SORTED',
            'batch_num': rec[8] if len(rec) > 8 else '',
        })

    action_log = [
        "PROCEDURE DIVISION.",
        "EXECUTE-SORT.",
        "    SORT SORT-WORK",
        "        ON ASCENDING KEY SW-TXN-ACCOUNT-NUM",
        "        ON ASCENDING KEY SW-TXN-TIMESTAMP",
        "        USING PENDING-FILE",
        "        GIVING SORTED-FILE.",
        "",
        f"    * {meta.get('message', 'Sort complete')}",
        "    * Batch state updated to SORTED",
        "    * Pending transactions now in sorted-staging.dat",
    ]

    return jsonify({
        'transactions': sorted_txns,
        'action_log': action_log,
        'message': meta.get('message', ''),
        'cobol_output': result['lines'],
    })


@app.route('/api/update-balances', methods=['POST'])
def api_update_balances():
    """Apply sorted batch to accounts (appareillage)."""
    result = run_cobol('UPDATE-BALANCES')
    records, meta = parse_cobol_output(result['lines'])

    if 'error' in meta:
        return jsonify({'error': meta['error']}), 400

    committed = []
    alerts = []
    for rec in records:
        committed.append({
            'txn_id': rec[0] if len(rec) > 0 else '',
            'timestamp': rec[1] if len(rec) > 1 else '',
            'acct_number': rec[2] if len(rec) > 2 else '',
            'txn_type': rec[3] if len(rec) > 3 else '',
            'amount': float(rec[4]) if len(rec) > 4 else 0.0,
            'currency': rec[5] if len(rec) > 5 else '',
            'description': rec[6] if len(rec) > 6 else '',
            'status': 'COMMIT',
            'batch_num': rec[8] if len(rec) > 8 else '',
            'running_bal': float(rec[9]) if len(rec) > 9 else 0.0,
        })

    # Collect alert-flagged transactions (account not found)
    if 'alerts' in meta:
        for al in meta['alerts']:
            alerts.append({
                'txn_id': al[0] if len(al) > 0 else '',
                'timestamp': al[1] if len(al) > 1 else '',
                'acct_number': al[2] if len(al) > 2 else '',
                'txn_type': al[3] if len(al) > 3 else '',
                'amount': float(al[4]) if len(al) > 4 else 0.0,
                'currency': al[5] if len(al) > 5 else '',
                'description': al[6] if len(al) > 6 else '',
                'status': 'ALERT',
                'batch_num': al[8] if len(al) > 8 else '',
            })

    # Refresh accounts from COBOL
    accounts = refresh_accounts_from_cobol()

    # Clear pending file (batch is committed)
    pending_path = os.path.join(DATA_DIR, 'pending.dat')
    if os.path.exists(pending_path):
        open(pending_path, 'wb').close()

    batch_state = read_batch_state()

    # Build action log noting any alert-flagged transactions
    alert_lines = []
    if alerts:
        for al in alerts:
            alert_lines.append(
                f"    * ALERT: account {al['acct_number']}"
                f" not found — txn {al['txn_id']} skipped")

    action_log = [
        "PROCEDURE DIVISION.",
        "APPLY-TRANSACTIONS.",
        "    * Appareillage: sorted transactions vs indexed accounts",
        "    OPEN INPUT SORTED-FILE",
        "    OPEN I-O ACCOUNT-FILE",
        "    OPEN EXTEND TRANS-FILE",
        "",
        "PROCESS-ONE-TRANSACTION.",
        "    READ ACCOUNT-FILE  (by key: ACCT-NUMBER)",
        "    IF INVALID KEY",
        "        PERFORM LOG-MISSING-ACCOUNT",
        "    END-IF",
        "    ADD SR-TXN-AMOUNT TO ACCT-BALANCE",
        "    REWRITE ACCOUNT-RECORD",
        "    WRITE COMMITTED-RECORD",
        "",
    ] + alert_lines + [
        "",
        f"    * {meta.get('message', 'Update complete')}",
        "    * Batch pointer advanced",
        "    * Pending buffer cleared",
    ]

    return jsonify({
        'transactions': committed,
        'alerts': alerts,
        'accounts': accounts,
        'batch_state': batch_state,
        'action_log': action_log,
        'message': meta.get('message', ''),
        'cobol_output': result['lines'],
    })


@app.route('/api/create-account', methods=['POST'])
def api_create_account():
    """Create a new account."""
    data = request.json or {}
    owner = data.get('owner', 'New Account Holder')
    acct_type = data.get('acct_type', 'CHECKING')
    currency = data.get('currency', 'USD')
    balance = str(data.get('balance', '0'))

    result = run_cobol('CREATE-ACCOUNT', [owner, acct_type, currency, balance])
    records, meta = parse_cobol_output(result['lines'])

    if 'error' in meta:
        return jsonify({'error': meta['error']}), 400

    new_account = None
    if records:
        rec = records[0]
        new_account = {
            'acct_number': rec[0] if len(rec) > 0 else '',
            'owner_name': rec[1] if len(rec) > 1 else '',
            'acct_type': rec[2] if len(rec) > 2 else '',
            'currency': rec[3] if len(rec) > 3 else '',
            'balance': float(rec[4]) if len(rec) > 4 else 0.0,
            'status': rec[5] if len(rec) > 5 else '',
            'open_date': rec[6] if len(rec) > 6 else '',
        }
        # Update sidecar
        accounts = read_all_accounts()
        accounts.append(new_account)
        save_accounts_sidecar(accounts)

    action_log = [
        "PROCEDURE DIVISION.",
        "WRITE-NEW-ACCOUNT.",
        f"    MOVE '{owner}' TO ACCT-OWNER-NAME",
        f"    MOVE '{acct_type}' TO ACCT-TYPE",
        f"    MOVE '{currency}' TO ACCT-CURRENCY",
        f"    MOVE {balance} TO ACCT-BALANCE",
        "    WRITE ACCOUNT-RECORD",
        "",
        "    * Record written to indexed ACCOUNTS file",
        f"    * New account number: {new_account['acct_number'] if new_account else 'N/A'}",
    ]

    return jsonify({
        'account': new_account,
        'action_log': action_log,
        'cobol_output': result['lines'],
    })


@app.route('/api/delete-account', methods=['POST'])
def api_delete_account():
    """Delete (close) an account."""
    data = request.json or {}
    acct_num = data.get('acct_number', '')

    if not acct_num:
        return jsonify({'error': 'No account number provided'}), 400

    result = run_cobol('DELETE-ACCOUNT', [acct_num])
    records, meta = parse_cobol_output(result['lines'])

    if 'error' in meta:
        return jsonify({'error': meta['error']}), 400

    # Update sidecar
    accounts = read_all_accounts()
    for acct in accounts:
        if acct['acct_number'] == acct_num:
            acct['status'] = 'CLOSED'
            acct['balance'] = 0.0
            break
    save_accounts_sidecar(accounts)

    action_log = [
        "PROCEDURE DIVISION.",
        "CLOSE-ACCOUNT.",
        f"    MOVE {acct_num} TO ACCT-NUMBER",
        "    READ ACCOUNT-FILE (by key)",
        "    IF ACCT-BALANCE NOT = ZERO",
        "        PERFORM WRITE-CLOSURE-TXN",
        "    END-IF",
        "    MOVE 'CLOSED' TO ACCT-STATUS",
        "    MOVE ZERO TO ACCT-BALANCE",
        "    REWRITE ACCOUNT-RECORD",
        "",
        f"    * Account {acct_num} marked CLOSED",
        "    * Past transactions preserved in ledger",
        "    * CLOSURE withdrawal appended if balance > 0",
    ]

    closure_txn = meta.get('closure_txn')

    return jsonify({
        'acct_number': acct_num,
        'closure_txn': closure_txn,
        'action_log': action_log,
        'cobol_output': result['lines'],
    })


@app.route('/api/query-account', methods=['POST'])
def api_query_account():
    """Query account details and transaction history."""
    data = request.json or {}
    acct_num = data.get('acct_number', '')

    if not acct_num:
        return jsonify({'error': 'No account number provided'}), 400

    result = run_cobol('QUERY-ACCOUNT', [acct_num])
    records, meta = parse_cobol_output(result['lines'])

    if 'error' in meta:
        return jsonify({'error': meta['error']}), 400

    account = None
    if 'account' in meta:
        a = meta['account']
        account = {
            'acct_number': a[0] if len(a) > 0 else '',
            'owner_name': a[1] if len(a) > 1 else '',
            'acct_type': a[2] if len(a) > 2 else '',
            'currency': a[3] if len(a) > 3 else '',
            'balance': float(a[4]) if len(a) > 4 else 0.0,
            'status': a[5] if len(a) > 5 else '',
            'open_date': a[6] if len(a) > 6 else '',
        }

    txn_history = []
    for rec in records:
        txn_history.append({
            'txn_id': rec[0] if len(rec) > 0 else '',
            'timestamp': rec[1] if len(rec) > 1 else '',
            'acct_number': rec[2] if len(rec) > 2 else '',
            'txn_type': rec[3] if len(rec) > 3 else '',
            'amount': float(rec[4]) if len(rec) > 4 else 0.0,
            'currency': rec[5] if len(rec) > 5 else '',
            'description': rec[6] if len(rec) > 6 else '',
            'status': rec[7] if len(rec) > 7 else '',
            'batch_num': rec[8] if len(rec) > 8 else '',
            'running_bal': float(rec[9]) if len(rec) > 9 else 0.0,
        })

    sql_preview = (
        f"SELECT * FROM TRANSACTIONS\n"
        f" WHERE ACCOUNT_NUMBER = '{acct_num}'\n"
        f" ORDER BY TIMESTAMP ASC;"
    )

    action_log = [
        "PROCEDURE DIVISION.",
        "QUERY-ACCOUNT-RECORD.",
        f"    MOVE {acct_num} TO ACCT-NUMBER",
        "    READ ACCOUNT-FILE (indexed, by key)",
        "",
        "QUERY-TRANSACTIONS.",
        "    OPEN INPUT TRANS-FILE",
        "    PERFORM UNTIL WS-EOF = 1",
        "        READ TRANS-FILE NEXT",
        f"        IF TXN-ACCOUNT-NUM = {acct_num}",
        "            DISPLAY TXN record",
        "        END-IF",
        "    END-PERFORM",
        "",
        "    -- Equivalent SQL:",
        f"    {sql_preview}",
    ]

    return jsonify({
        'account': account,
        'transactions': txn_history,
        'action_log': action_log,
        'sql_preview': sql_preview,
        'message': meta.get('message', ''),
    })


if __name__ == '__main__':
    app.run(debug=True, port=5001)
