"""
seed.py — Generate realistic seed data for the mainframe banking system.
Creates 10 accounts and 100 committed transactions spread across them.
Writes directly to flat files in the data/ directory.
"""

import os
import struct
import random
import time
from datetime import datetime, timedelta

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')

# Record lengths must match COBOL copybook definitions
ACCOUNT_RECORD_LEN = 120
TRANSACTION_RECORD_LEN = 150
BATCH_STATE_RECORD_LEN = 80

SEED_ACCOUNTS = [
    ("1000000001", "Marcus J. Wellington", "CHECKING", "USD", 12450.75),
    ("1000000002", "Sophia R. Nakamura", "SAVINGS ", "USD", 48920.30),
    ("1000000003", "Ibrahim K. Al-Rashid", "CHECKING", "EUR", 7835.50),
    ("1000000004", "Elena V. Petrova", "CREDIT  ", "USD", -2150.00),
    ("1000000005", "Jean-Pierre Dubois", "SAVINGS ", "EUR", 156780.00),
    ("1000000006", "Nadia H. Mansour", "CHECKING", "LBP", 45000000.00),
    ("1000000007", "Takeshi Yamamoto", "SAVINGS ", "JPY", 3850000.00),
    ("1000000008", "Catherine A. Brooks", "CHECKING", "GBP", 23100.45),
    ("1000000009", "Omar F. Haddad", "CREDIT  ", "LBP", -12500000.00),
    ("1000000010", "Victoria S. Chen", "SAVINGS ", "GBP", 89250.00),
]

TXN_TEMPLATES = [
    ("DEPOSIT   ", "Payroll direct deposit", 1500.00, 8500.00),
    ("DEPOSIT   ", "Wire transfer received", 500.00, 25000.00),
    ("DEPOSIT   ", "Cash deposit at branch", 100.00, 5000.00),
    ("DEPOSIT   ", "Tax refund credit", 800.00, 4200.00),
    ("DEPOSIT   ", "Dividend income credit", 50.00, 2000.00),
    ("DEPOSIT   ", "Mobile payment received", 20.00, 500.00),
    ("WITHDRAWAL", "ATM withdrawal", 40.00, 500.00),
    ("WITHDRAWAL", "Online purchase", 15.00, 800.00),
    ("WITHDRAWAL", "Grocery store payment", 25.00, 250.00),
    ("WITHDRAWAL", "Monthly rent payment", 800.00, 3500.00),
    ("WITHDRAWAL", "Utility bill payment", 50.00, 350.00),
    ("WITHDRAWAL", "Restaurant charge", 15.00, 150.00),
    ("WITHDRAWAL", "Insurance premium", 100.00, 600.00),
    ("WITHDRAWAL", "Fuel station charge", 30.00, 80.00),
    ("PAYMENT   ", "Subscription service", 5.00, 50.00),
    ("PAYMENT   ", "Annual membership fee", 25.00, 200.00),
    ("PAYMENT   ", "Loan installment", 200.00, 1500.00),
    ("PAYMENT   ", "Medical expense payment", 50.00, 800.00),
    ("TRANSFER  ", "Interbank transfer", 100.00, 10000.00),
    ("TRANSFER  ", "Travel expense airline", 200.00, 2000.00),
]

# LBP and JPY use much larger amounts
CURRENCY_MULTIPLIERS = {
    "USD": 1.0,
    "EUR": 0.92,
    "GBP": 0.79,
    "LBP": 89500.0,
    "JPY": 149.0,
}


def pack_comp3(value, pic_digits=15, pic_decimals=2):
    """Pack a decimal value into COMP-3 (packed decimal) format.
    PIC S9(13)V99 COMP-3 = 15 digits + sign = 8 bytes.
    """
    is_negative = value < 0
    # Scale to remove decimal point
    scaled = int(round(abs(value) * (10 ** pic_decimals)))
    # Total digits in packed decimal
    total_digits = pic_digits
    # Packed decimal: each byte holds 2 digits, last nibble is sign
    # Total nibbles = digits + 1 (for sign)
    total_nibbles = total_digits + 1
    total_bytes = (total_nibbles + 1) // 2

    digits_str = str(scaled).zfill(total_digits)
    if len(digits_str) > total_digits:
        digits_str = digits_str[:total_digits]

    # Sign nibble: 0xD for negative, 0xC for positive
    sign_nibble = 0x0D if is_negative else 0x0C

    # Build packed bytes
    nibbles = [int(d) for d in digits_str]
    nibbles.append(sign_nibble)

    packed = bytearray(total_bytes)
    for i in range(total_bytes):
        high = nibbles[i * 2] if i * 2 < len(nibbles) else 0
        low = nibbles[i * 2 + 1] if i * 2 + 1 < len(nibbles) else 0
        packed[i] = (high << 4) | low

    return bytes(packed)


def make_account_record(acct_num, owner, acct_type, currency, balance, status="ACTIVE  ", open_date="20240115"):
    """Build a fixed-width account record matching ACCOUNT-RECORD.cpy (120 bytes)."""
    rec = bytearray(ACCOUNT_RECORD_LEN)

    # ACCT-NUMBER PIC 9(10)
    rec[0:10] = acct_num.encode('ascii').ljust(10, b'0')
    # ACCT-OWNER-NAME PIC X(30)
    rec[10:40] = owner.encode('ascii').ljust(30)[:30]
    # ACCT-TYPE PIC X(8)
    rec[40:48] = acct_type.encode('ascii').ljust(8)[:8]
    # ACCT-CURRENCY PIC X(3)
    rec[48:51] = currency.encode('ascii').ljust(3)[:3]
    # ACCT-BALANCE PIC S9(13)V99 COMP-3 (8 bytes)
    rec[51:59] = pack_comp3(balance)
    # ACCT-STATUS PIC X(8)
    rec[59:67] = status.encode('ascii').ljust(8)[:8]
    # ACCT-OPEN-DATE PIC 9(8)
    rec[67:75] = open_date.encode('ascii').ljust(8)[:8]
    # FILLER PIC X(55)
    rec[75:120] = b' ' * 45

    return bytes(rec)


def make_transaction_record(txn_id, timestamp, acct_num, amount, txn_type, description, currency, running_bal, status="COMMIT  ", batch_num=1):
    """Build a fixed-width transaction record matching TRANSACTION-RECORD.cpy (150 bytes)."""
    rec = bytearray(TRANSACTION_RECORD_LEN)

    # TXN-ID PIC 9(10)
    rec[0:10] = str(txn_id).zfill(10).encode('ascii')
    # TXN-TIMESTAMP PIC 9(14)
    rec[10:24] = str(timestamp).zfill(14).encode('ascii')
    # TXN-ACCOUNT-NUM PIC 9(10)
    rec[24:34] = str(acct_num).zfill(10).encode('ascii')
    # TXN-AMOUNT PIC S9(13)V99 COMP-3 (8 bytes)
    rec[34:42] = pack_comp3(amount)
    # TXN-TYPE PIC X(10)
    rec[42:52] = txn_type.encode('ascii').ljust(10)[:10]
    # TXN-DESCRIPTION PIC X(40)
    rec[52:92] = description.encode('ascii').ljust(40)[:40]
    # TXN-CURRENCY PIC X(3)
    rec[92:95] = currency.encode('ascii').ljust(3)[:3]
    # TXN-RUNNING-BAL PIC S9(13)V99 COMP-3 (8 bytes)
    rec[95:103] = pack_comp3(running_bal)
    # TXN-STATUS PIC X(8)
    rec[103:111] = status.encode('ascii').ljust(8)[:8]
    # TXN-BATCH-NUM PIC 9(6)
    rec[111:117] = str(batch_num).zfill(6).encode('ascii')
    # FILLER PIC X(39)
    rec[117:150] = b' ' * 33

    return bytes(rec)


def make_batch_state_record(last_committed, seq_num, status, pending_count, last_txn_id, timestamp):
    """Build batch state record matching BATCH-STATE.cpy (80 bytes)."""
    rec = bytearray(BATCH_STATE_RECORD_LEN)

    # BATCH-LAST-COMMITTED PIC 9(10)
    rec[0:10] = str(last_committed).zfill(10).encode('ascii')
    # BATCH-SEQUENCE-NUM PIC 9(6)
    rec[10:16] = str(seq_num).zfill(6).encode('ascii')
    # BATCH-STATUS PIC X(8)
    rec[16:24] = status.encode('ascii').ljust(8)[:8]
    # BATCH-PENDING-COUNT PIC 9(10)
    rec[24:34] = str(pending_count).zfill(10).encode('ascii')
    # BATCH-LAST-TXN-ID PIC 9(10)
    rec[34:44] = str(last_txn_id).zfill(10).encode('ascii')
    # BATCH-TIMESTAMP PIC 9(14)
    rec[44:58] = str(timestamp).zfill(14).encode('ascii')
    # FILLER PIC X(22)
    rec[58:80] = b' ' * 22

    return bytes(rec)


def generate_seed_data():
    """Generate all seed files."""
    os.makedirs(DATA_DIR, exist_ok=True)

    # Clear any existing pending/sorted files
    for f in ['pending.dat', 'sorted-staging.dat']:
        path = os.path.join(DATA_DIR, f)
        if os.path.exists(path):
            os.remove(path)

    # Track running balances per account
    balances = {}
    # Start with opening balances (these represent the state AFTER seed transactions)
    # We'll work backwards: generate transactions that lead to the final balances

    # Initial balances (before any transactions)
    initial_balances = {}
    for acct_num, owner, acct_type, currency, final_balance in SEED_ACCOUNTS:
        # Start at about 60-80% of final balance for deposits, or 0 for credit
        if acct_type.strip() == "CREDIT":
            initial_balances[acct_num] = 0.0
        else:
            initial_balances[acct_num] = final_balance * 0.4
        balances[acct_num] = initial_balances[acct_num]

    # Generate 100 transactions across 5 batches
    transactions = []
    txn_id = 1
    base_time = datetime(2024, 1, 15, 8, 30, 0)
    batch_boundaries = []  # (batch_num, last_txn_id, timestamp)

    random.seed(42)  # Reproducible seed data

    txns_per_batch = [25, 20, 20, 15, 20]

    for batch_idx, count in enumerate(txns_per_batch):
        batch_num = batch_idx + 1
        batch_txns = []

        for i in range(count):
            # Pick a random account
            acct = random.choice(SEED_ACCOUNTS)
            acct_num, owner, acct_type, currency, _ = acct
            multiplier = CURRENCY_MULTIPLIERS.get(currency, 1.0)

            # Pick a transaction template
            template = random.choice(TXN_TEMPLATES)
            txn_type, description, min_amt, max_amt = template

            # Scale amount by currency
            raw_amount = round(random.uniform(min_amt, max_amt), 2)
            amount = round(raw_amount * multiplier, 2)

            # For credit accounts, flip deposit/withdrawal semantics
            if acct_type.strip() == "CREDIT":
                if txn_type in ("WITHDRAWAL", "PAYMENT   "):
                    amount = abs(amount)  # charges increase debt (negative bal)
                    txn_type = "PAYMENT   "
                else:
                    amount = -abs(amount)
                    amount = abs(amount)  # payments reduce debt
                    txn_type = "DEPOSIT   "

            # Determine sign
            if txn_type in ("DEPOSIT   ",):
                signed_amount = abs(amount)
            else:
                signed_amount = -abs(amount)

            # Update running balance
            balances[acct_num] = round(balances[acct_num] + signed_amount, 2)

            # Generate timestamp
            time_offset = timedelta(
                hours=random.randint(0, 8),
                minutes=random.randint(0, 59),
                seconds=random.randint(0, 59)
            )
            txn_time = base_time + time_offset
            timestamp = txn_time.strftime("%Y%m%d%H%M%S")

            batch_txns.append({
                'id': txn_id,
                'timestamp': timestamp,
                'acct_num': acct_num,
                'amount': signed_amount,
                'type': txn_type,
                'description': description,
                'currency': currency,
                'running_bal': balances[acct_num],
                'batch_num': batch_num,
            })
            txn_id += 1

        # Sort by account number (as SORT-BATCH would do)
        batch_txns.sort(key=lambda t: (t['acct_num'], t['timestamp']))

        # Recalculate running balances after sort
        temp_balances = dict(balances)
        for acct_num in temp_balances:
            temp_balances[acct_num] = balances[acct_num]

        transactions.extend(batch_txns)
        batch_boundaries.append((batch_num, txn_id - 1, batch_txns[-1]['timestamp']))

        # Advance base time for next batch
        base_time += timedelta(days=random.randint(2, 7))

    # Write accounts file (indexed — need special handling)
    # For GnuCOBOL indexed files, we write via the COBOL program
    # But for seed, we'll write sequential and let COBOL re-index
    # Actually, let's write the indexed file properly by calling CREATE-ACCOUNT
    # Or we write raw records sorted by key — GnuCOBOL ISAM (BDB/VBISAM) has its own format

    # Simplest approach: use the COBOL CREATE-ACCOUNT program to create each account
    # Then write transactions directly as sequential file

    # First, write transactions (sequential file — straightforward)
    trans_path = os.path.join(DATA_DIR, 'transactions.dat')
    with open(trans_path, 'wb') as f:
        for txn in transactions:
            rec = make_transaction_record(
                txn['id'], txn['timestamp'], txn['acct_num'],
                txn['amount'], txn['type'], txn['description'],
                txn['currency'], txn['running_bal'],
                status="COMMIT  ", batch_num=txn['batch_num']
            )
            f.write(rec)

    # Write batch state
    last_txn = transactions[-1]
    batch_path = os.path.join(DATA_DIR, 'batch-state.dat')
    with open(batch_path, 'wb') as f:
        now_str = datetime.now().strftime("%Y%m%d%H%M%S")
        rec = make_batch_state_record(
            last_committed=100,
            seq_num=6,  # Next batch will be #6
            status="IDLE",
            pending_count=0,
            last_txn_id=100,
            timestamp=now_str
        )
        f.write(rec)

    # Create empty pending and sorted-staging files
    open(os.path.join(DATA_DIR, 'pending.dat'), 'wb').close()
    open(os.path.join(DATA_DIR, 'sorted-staging.dat'), 'wb').close()

    return {
        'accounts': SEED_ACCOUNTS,
        'transactions': transactions,
        'batch_boundaries': batch_boundaries,
        'balances': balances,
    }


def create_accounts_via_cobol(seed_result):
    """Create accounts using the COBOL CREATE-ACCOUNT program."""
    import subprocess

    bin_dir = os.path.join(os.path.dirname(__file__), '..', 'bin')
    create_prog = os.path.join(bin_dir, 'CREATE-ACCOUNT')

    if not os.path.exists(create_prog):
        print("WARN: CREATE-ACCOUNT not compiled, writing raw accounts file")
        write_accounts_raw(seed_result)
        return

    data_dir = os.path.abspath(DATA_DIR)
    # Remove existing accounts file so we start fresh
    acct_file = os.path.join(data_dir, 'accounts.dat')
    if os.path.exists(acct_file):
        os.remove(acct_file)

    env = os.environ.copy()
    env['DATA_DIR'] = data_dir

    for acct_num, owner, acct_type, currency, balance in seed_result['accounts']:
        # Use the final computed balance from seed
        final_bal = seed_result['balances'].get(acct_num, balance)
        result = subprocess.run(
            [create_prog, owner, acct_type.strip(), currency, str(round(final_bal, 2))],
            capture_output=True, text=True, env=env
        )
        if result.returncode != 0:
            print(f"ERROR creating account {acct_num}: {result.stdout} {result.stderr}")
        else:
            print(f"  Created account: {result.stdout.strip()}")


def write_accounts_raw(seed_result):
    """Fallback: write raw accounts file (won't work with indexed COBOL reads)."""
    acct_path = os.path.join(DATA_DIR, 'accounts.dat')
    with open(acct_path, 'wb') as f:
        for acct_num, owner, acct_type, currency, balance in seed_result['accounts']:
            final_bal = seed_result['balances'].get(acct_num, balance)
            rec = make_account_record(
                acct_num, owner, acct_type, currency, final_bal,
                status="ACTIVE  ", open_date="20240115"
            )
            f.write(rec)


if __name__ == '__main__':
    print("=== Generating seed data ===")
    result = generate_seed_data()
    print(f"  Generated {len(result['transactions'])} transactions")
    print(f"  Across {len(result['batch_boundaries'])} batches")
    print("  Creating accounts via COBOL...")
    create_accounts_via_cobol(result)
    print("=== Seed complete ===")
