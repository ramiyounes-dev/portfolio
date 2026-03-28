"""
seed.py — Generate realistic seed data for the mainframe banking system.
Creates 10 accounts and 100 committed transactions spread across 4 batches.
Enforces banking realism: balance limits, overdraft rules, weighted types,
locale-aware descriptions, transfer/payment legs, weekday time bias.
"""

import os
import random
from datetime import datetime, timedelta

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')

# Record lengths must match COBOL copybook definitions
ACCOUNT_RECORD_LEN = 120
TRANSACTION_RECORD_LEN = 150
BATCH_STATE_RECORD_LEN = 80

# ─── Exchange rates (relative to USD) ───────────────────
FX = {"USD": 1.0, "EUR": 0.92, "GBP": 0.79, "LBP": 89500.0, "JPY": 149.5}

# ─── Balance limits (USD-equivalent) ────────────────────
#   CHECKING: 500–50,000, floor -500
#   SAVINGS:  1,000–500,000, floor 0
#   CREDIT:   -15,000–0 (debt)
LIMITS = {
    "CHECKING": {"floor": -500},
    "SAVINGS":  {"floor": 0},
    "CREDIT":   {"floor": -15000},
}

def to_local(usd, cur):
    return round(usd * FX[cur], 2)

def is_int_cur(cur):
    return cur in ("JPY", "LBP")

def round_amt(v, cur):
    return round(v) if is_int_cur(cur) else round(v, 2)

def get_floor(acct_type, cur):
    return to_local(LIMITS[acct_type.strip()]["floor"], cur)


# ─── Seed accounts: 4 CHECKING, 4 SAVINGS, 2 CREDIT ────
#     3 USD, 2 EUR, 2 GBP, 2 LBP, 1 JPY
SEED_ACCOUNTS = [
    ("1000000001", "Marcus J. Wellington",  "CHECKING", "USD",  12450.75),
    ("1000000002", "Sophia R. Nakamura",    "SAVINGS",  "USD",  48920.30),
    ("1000000003", "Ibrahim K. Al-Rashid",  "CHECKING", "EUR",  7835.50),
    ("1000000004", "Elena V. Petrova",      "CREDIT",   "USD", 0),
    ("1000000005", "Jean-Pierre Dubois",    "SAVINGS",  "EUR", 156780.00),
    ("1000000006", "Nadia H. Mansour",      "CHECKING", "LBP", 267500000),
    ("1000000007", "Takeshi Yamamoto",      "SAVINGS",  "JPY",  3850000),
    ("1000000008", "Catherine A. Brooks",   "CHECKING", "GBP",  23100.45),
    ("1000000009", "Omar F. Haddad",        "CREDIT",   "LBP", 0),
    ("1000000010", "Victoria S. Chen",      "SAVINGS",  "GBP",  89250.00),
]

# ─── Locale-aware descriptions ──────────────────────────
DESC_POOL = {
    "DEPOSIT": {
        "USD": ["Payroll - Accenture Ltd", "Wire transfer received", "Freelance invoice #2041",
                "Tax refund - IRS", "Dividend income - Vanguard", "Mobile deposit - check #4419",
                "Consulting fee received", "Royalty payment - Wiley"],
        "EUR": ["Virement salaire - Capgemini", "Remboursement impots", "Freelance facture #887",
                "Dividendes - BNP Paribas", "CAF allocation logement", "Virement recu - famille",
                "Prime annuelle", "Remboursement Secu"],
        "GBP": ["Payroll - Barclays PLC", "HMRC tax refund", "Freelance invoice #312",
                "Dividend - FTSE fund", "Pension credit received", "Wire from parent account",
                "Rental income - flat 4B", "ISA interest credit"],
        "LBP": ["Virement salaire - BDL", "Transfert Western Union", "Depot especes - Hamra",
                "Paiement recu - OMT", "Remise cheque #2201", "Virement familial",
                "Indemnite fin service", "Loyer percu - Achrafieh"],
        "JPY": ["Payroll - Sony Corp", "Tax refund - NTA", "Freelance payment received",
                "Dividend - Nikkei fund", "Bonus payment - Q4", "Wire from savings",
                "Rental income - Shibuya", "Interest credit - MUFG"],
    },
    "WITHDRAWAL": {
        "USD": ["ATM withdrawal - Chase", "POS - Whole Foods Market", "Online purchase - Amazon",
                "Monthly rent payment", "Utility bill - ConEd", "Gym membership - Equinox",
                "Fuel station - Shell", "Restaurant - Capital Grille"],
        "EUR": ["Retrait DAB - BNP Paribas", "Achat CB - Carrefour", "Amazon.fr commande",
                "Loyer mensuel", "EDF facture electricite", "Abonnement Basic-Fit",
                "Station essence - TotalEnergies", "Restaurant - Le Comptoir"],
        "GBP": ["ATM withdrawal - HSBC", "POS - Tesco Express", "Online purchase - Amazon.co.uk",
                "Monthly rent - flat share", "Utility bill - British Gas", "Gym - PureGym",
                "Fuel - BP station", "Restaurant - Dishoom"],
        "LBP": ["Retrait DAB - Verdun", "POS - Spinneys Achrafieh", "Online - Amazon.ae",
                "Loyer - Hamra", "Facture EDL", "Abonnement FitZone",
                "Station Medco - Jounieh", "Restaurant - Em Sherif"],
        "JPY": ["ATM - Mizuho Bank", "POS - Lawson convenience", "Online - Amazon.co.jp",
                "Monthly rent - Minato", "Utility - TEPCO bill", "Gym - Anytime Fitness",
                "Fuel - ENEOS station", "Restaurant - Ichiran Ramen"],
    },
    "PAYMENT": {
        "USD": ["Credit card payment", "Online bill pay - VISA", "Minimum payment - Amex",
                "Statement balance payment"],
        "EUR": ["Paiement carte credit", "Reglement CB - VISA", "Paiement minimum mensuel",
                "Solde releve carte"],
        "GBP": ["Credit card payment", "Online bill pay - VISA", "Minimum payment due",
                "Statement balance payment"],
        "LBP": ["Paiement carte credit", "Reglement mensuel CB", "Paiement minimum",
                "Solde carte de credit"],
        "JPY": ["Credit card payment", "VISA bill payment", "Minimum payment - JCB",
                "Statement balance payment"],
    },
    "CHARGE": {
        "USD": ["CC purchase - Amazon", "CC purchase - Uber Eats", "CC purchase - Netflix",
                "CC purchase - Target", "CC purchase - Costco", "CC charge - Delta Airlines",
                "CC purchase - Apple Store", "CC charge - Hilton Hotels"],
        "EUR": ["Achat CB - Amazon.fr", "Achat CB - Fnac", "Achat CB - Booking.com",
                "Achat CB - Zara", "Abonnement CB - Canal+", "Achat CB - SNCF",
                "Achat CB - Decathlon", "Achat CB - Air France"],
        "GBP": ["CC purchase - Amazon.co.uk", "CC purchase - Deliveroo", "CC purchase - Sky",
                "CC purchase - John Lewis", "CC charge - EasyJet", "CC purchase - Boots",
                "CC charge - Premier Inn", "CC purchase - Sainsburys"],
        "LBP": ["Achat CB - Spinneys", "Achat CB - ABC Achrafieh", "Achat CB - Roadster",
                "Achat CB - Virgin Megastore", "Achat CB - MEA Airlines",
                "Achat CB - Le Gray Hotel", "Achat CB - Patchi", "Achat CB - Aishti"],
        "JPY": ["CC purchase - Amazon.co.jp", "CC purchase - Uniqlo", "CC charge - ANA",
                "CC purchase - Don Quijote", "CC purchase - Muji", "CC charge - Tokyo Metro",
                "CC purchase - Lawson", "CC charge - Hotel Okura"],
    },
}


# ─── Pack COMP-3 ─────────────────────────────────────────
def pack_comp3(value, pic_digits=15, pic_decimals=2):
    """Pack a decimal value into COMP-3 (packed decimal) format.
    PIC S9(13)V99 COMP-3 = 15 digits + sign = 8 bytes.
    """
    is_negative = value < 0
    scaled = int(round(abs(value) * (10 ** pic_decimals)))
    total_nibbles = pic_digits + 1
    total_bytes = (total_nibbles + 1) // 2

    digits_str = str(scaled).zfill(pic_digits)
    if len(digits_str) > pic_digits:
        digits_str = digits_str[:pic_digits]

    sign_nibble = 0x0D if is_negative else 0x0C
    nibbles = [int(d) for d in digits_str]
    nibbles.append(sign_nibble)

    packed = bytearray(total_bytes)
    for i in range(total_bytes):
        high = nibbles[i * 2] if i * 2 < len(nibbles) else 0
        low = nibbles[i * 2 + 1] if i * 2 + 1 < len(nibbles) else 0
        packed[i] = (high << 4) | low

    return bytes(packed)


# ─── Record builders ─────────────────────────────────────
def make_account_record(acct_num, owner, acct_type, currency, balance,
                        status="ACTIVE  ", open_date="20241001"):
    rec = bytearray(ACCOUNT_RECORD_LEN)
    rec[0:10] = acct_num.encode('ascii').ljust(10, b'0')
    rec[10:40] = owner.encode('ascii').ljust(30)[:30]
    rec[40:48] = acct_type.encode('ascii').ljust(8)[:8]
    rec[48:51] = currency.encode('ascii').ljust(3)[:3]
    rec[51:59] = pack_comp3(balance)
    rec[59:67] = status.encode('ascii').ljust(8)[:8]
    rec[67:75] = open_date.encode('ascii').ljust(8)[:8]
    rec[75:120] = b' ' * 45
    return bytes(rec)


def make_transaction_record(txn_id, timestamp, acct_num, amount, txn_type,
                            description, currency, running_bal,
                            status="COMMIT  ", batch_num=1):
    rec = bytearray(TRANSACTION_RECORD_LEN)
    rec[0:10] = str(txn_id).zfill(10).encode('ascii')
    rec[10:24] = str(timestamp).zfill(14).encode('ascii')
    rec[24:34] = str(acct_num).zfill(10).encode('ascii')
    rec[34:42] = pack_comp3(amount)
    rec[42:52] = txn_type.encode('ascii').ljust(10)[:10]
    rec[52:92] = description.encode('ascii').ljust(40)[:40]
    rec[92:95] = currency.encode('ascii').ljust(3)[:3]
    rec[95:103] = pack_comp3(running_bal)
    rec[103:111] = status.encode('ascii').ljust(8)[:8]
    rec[111:117] = str(batch_num).zfill(6).encode('ascii')
    rec[117:150] = b' ' * 33
    return bytes(rec)


def make_batch_state_record(last_committed, seq_num, status, pending_count,
                            last_txn_id, timestamp):
    rec = bytearray(BATCH_STATE_RECORD_LEN)
    rec[0:10] = str(last_committed).zfill(10).encode('ascii')
    rec[10:16] = str(seq_num).zfill(6).encode('ascii')
    rec[16:24] = status.encode('ascii').ljust(8)[:8]
    rec[24:34] = str(pending_count).zfill(10).encode('ascii')
    rec[34:44] = str(last_txn_id).zfill(10).encode('ascii')
    rec[44:58] = str(timestamp).zfill(14).encode('ascii')
    rec[58:80] = b' ' * 22
    return bytes(rec)


# ─── Transaction generation ──────────────────────────────
def get_desc(txn_type, cur):
    pool = DESC_POOL.get(txn_type, {})
    descs = pool.get(cur, pool.get("USD", [txn_type]))
    return random.choice(descs)


def generate_one_txn(accts, balances):
    """Generate one logical transaction (may produce 1 or 2 rows for transfers/payments).
    Returns list of dicts or empty list if no valid txn could be made."""
    active = [a for a in accts if a[3] != "CLOSED"]

    acct_num, owner, acct_type, cur, _ = random.choice(active)
    atype = acct_type.strip()
    bal = balances[acct_num]
    mul = FX[cur]
    floor = get_floor(atype, cur)

    # Weighted type: DEPOSIT 35%, WITHDRAWAL 40%, TRANSFER 15%, PAYMENT 10%
    r = random.random()
    if r < 0.35:
        txn_type = "DEPOSIT"
    elif r < 0.75:
        txn_type = "WITHDRAWAL"
    elif r < 0.90:
        txn_type = "TRANSFER"
    else:
        txn_type = "PAYMENT"

    # CREDIT accounts: 60% charge (increase debt), 40% payment (reduce debt)
    if atype == "CREDIT":
        txn_type = "CHARGE" if random.random() < 0.6 else "PAYMENT"

    # PAYMENT requires a CREDIT account with debt
    credit_accts = [(a[0], a[2].strip(), a[3]) for a in active
                    if a[2].strip() == "CREDIT" and balances[a[0]] < 0]
    if txn_type == "PAYMENT" and not credit_accts:
        txn_type = "DEPOSIT" if atype != "CREDIT" else "CHARGE"

    results = []

    if txn_type == "CHARGE":
        # Credit card purchase — increases debt (balance goes more negative)
        credit_limit = abs(get_floor(atype, cur))  # e.g. 15000 USD equiv
        current_debt = abs(bal)
        headroom = credit_limit - current_debt
        if headroom <= 0:
            return []
        max_charge = min(round_amt(random.uniform(20, 2000) * mul, cur), headroom)
        min_charge = to_local(5, cur) if not is_int_cur(cur) else to_local(2, cur)
        if max_charge < min_charge:
            return []
        charge = round_amt(random.uniform(min_charge, max_charge), cur)
        results.append({
            "acct": acct_num, "type": "WITHDRAWAL", "amt": -charge,
            "cur": cur, "desc": get_desc("CHARGE", cur)
        })
        return results

    if txn_type == "DEPOSIT":
        if atype == "CREDIT":
            return []
        amt = round_amt(random.uniform(50, 5000) * mul, cur)
        results.append({
            "acct": acct_num, "type": "DEPOSIT   ", "amt": amt,
            "cur": cur, "desc": get_desc("DEPOSIT", cur)
        })

    elif txn_type == "WITHDRAWAL":
        if atype == "CREDIT":
            return []
        headroom = bal - floor
        if headroom <= 0:
            return []
        max_w = min(round_amt(random.uniform(50, 5000) * mul, cur), headroom)
        min_w = to_local(10, cur) if not is_int_cur(cur) else to_local(5, cur)
        if max_w < min_w:
            return []
        amt = round_amt(random.uniform(min_w, max_w), cur)
        results.append({
            "acct": acct_num, "type": "WITHDRAWAL", "amt": -amt,
            "cur": cur, "desc": get_desc("WITHDRAWAL", cur)
        })

    elif txn_type == "TRANSFER":
        if atype == "CREDIT":
            return []
        dests = [a for a in active
                 if a[0] != acct_num and a[2].strip() != "CREDIT"]
        if not dests:
            return []
        dest = random.choice(dests)
        dest_num, _, _, dest_cur, _ = dest
        headroom = bal - floor
        if headroom <= 0:
            return []
        max_t = min(round_amt(random.uniform(50, 3000) * mul, cur), headroom)
        min_t = to_local(10, cur) if not is_int_cur(cur) else to_local(5, cur)
        if max_t < min_t:
            return []
        amt = round_amt(random.uniform(min_t, max_t), cur)
        dest_amt = round_amt(amt / FX[cur] * FX[dest_cur], dest_cur)
        results.append({
            "acct": acct_num, "type": "TRANSFER  ", "amt": -amt,
            "cur": cur, "desc": f"Transfer to acct #{dest_num}"
        })
        results.append({
            "acct": dest_num, "type": "TRANSFER  ", "amt": dest_amt,
            "cur": dest_cur, "desc": f"Transfer from acct #{acct_num}"
        })

    elif txn_type == "PAYMENT":
        # Pay down a credit account from a checking/savings
        if atype == "CREDIT":
            credit = (acct_num, atype, cur)
            sources = [a for a in active
                       if a[0] != acct_num and a[2].strip() in ("CHECKING", "SAVINGS")]
            if not sources:
                return []
            src = random.choice(sources)
            src_num, _, src_type, src_cur, _ = src
        else:
            if not credit_accts:
                return []
            credit_num, _, credit_cur = random.choice(credit_accts)
            credit = (credit_num, "CREDIT", credit_cur)
            src_num, src_type, src_cur = acct_num, atype, cur

        credit_num, _, credit_cur = credit
        debt = abs(balances[credit_num])
        if debt <= 0:
            return []
        src_floor = get_floor(src_type, src_cur)
        src_headroom = balances[src_num] - src_floor
        if src_headroom <= 0:
            return []
        max_pay = min(
            round_amt(random.uniform(50, 3000) * FX[src_cur], src_cur),
            src_headroom
        )
        # Don't overpay the credit
        max_pay_credit = round_amt(debt / FX[credit_cur] * FX[src_cur], src_cur)
        max_pay = min(max_pay, max_pay_credit)
        min_pay = to_local(10, src_cur) if not is_int_cur(src_cur) else to_local(5, src_cur)
        if max_pay < min_pay:
            return []
        pay_amt = round_amt(random.uniform(min_pay, max_pay), src_cur)
        credit_amt = round_amt(pay_amt / FX[src_cur] * FX[credit_cur], credit_cur)
        if credit_amt > debt:
            return []
        results.append({
            "acct": src_num, "type": "PAYMENT   ", "amt": -pay_amt,
            "cur": src_cur, "desc": f"Credit card payment to #{credit_num}"
        })
        results.append({
            "acct": credit_num, "type": "PAYMENT   ", "amt": credit_amt,
            "cur": credit_cur, "desc": f"Payment received from #{src_num}"
        })

    return results


# ─── Seed generation ─────────────────────────────────────
def generate_seed_data():
    os.makedirs(DATA_DIR, exist_ok=True)

    for f in ['pending.dat', 'sorted-staging.dat']:
        path = os.path.join(DATA_DIR, f)
        if os.path.exists(path):
            os.remove(path)

    # Start with initial balances (before seed transactions)
    balances = {}
    for acct_num, owner, acct_type, currency, final_bal in SEED_ACCOUNTS:
        atype = acct_type.strip()
        if atype == "CREDIT":
            balances[acct_num] = 0.0  # start at zero debt
        else:
            balances[acct_num] = round_amt(final_bal * 0.4, currency)

    random.seed(42)

    transactions = []
    txn_id = 1
    base_date = datetime(2024, 10, 1, 8, 0, 0)
    batch_boundaries = []
    batch_sizes = [28, 25, 25, 22]

    for batch_idx, target_size in enumerate(batch_sizes):
        batch_num = batch_idx + 1
        batch_txns = []
        generated = 0
        attempts = 0

        while generated < target_size and attempts < target_size * 5:
            attempts += 1

            # Timestamp: weekday bias, business hours bias
            day_offset = random.randint(0, 17)
            d = base_date + timedelta(days=day_offset)
            dow = d.weekday()  # 0=Mon, 6=Sun
            if dow >= 5 and random.random() > 0.3:
                continue  # reduce weekend activity

            hour_roll = random.random()
            if hour_roll < 0.80:
                hour = random.randint(8, 17)
            elif hour_roll < 0.95:
                hour = random.randint(18, 22)
            else:
                hour = 23 if random.random() < 0.5 else random.randint(0, 5)

            d = d.replace(hour=hour, minute=random.randint(0, 59),
                          second=random.randint(0, 59))
            ts = d.strftime("%Y%m%d%H%M%S")

            txn_group = generate_one_txn(SEED_ACCOUNTS, balances)
            if not txn_group:
                continue

            for t in txn_group:
                balances[t["acct"]] = round_amt(
                    balances[t["acct"]] + t["amt"], t["cur"]
                )
                batch_txns.append({
                    "id": txn_id,
                    "timestamp": ts,
                    "acct_num": t["acct"],
                    "amount": t["amt"],
                    "type": t["type"],
                    "description": t["desc"],
                    "currency": t["cur"],
                    "running_bal": balances[t["acct"]],
                    "batch_num": batch_num,
                })
                txn_id += 1
            generated += 1

        # Sort as SORT-BATCH would
        batch_txns.sort(key=lambda t: (t["acct_num"], t["timestamp"]))
        transactions.extend(batch_txns)
        batch_boundaries.append((batch_num, txn_id - 1, batch_txns[-1]["timestamp"]))
        base_date += timedelta(days=18 + random.randint(0, 4))

    # Write transactions file
    trans_path = os.path.join(DATA_DIR, 'transactions.dat')
    with open(trans_path, 'wb') as f:
        for txn in transactions:
            rec = make_transaction_record(
                txn["id"], txn["timestamp"], txn["acct_num"],
                txn["amount"], txn["type"], txn["description"],
                txn["currency"], txn["running_bal"],
                status="COMMIT  ", batch_num=txn["batch_num"]
            )
            f.write(rec)

    # Write batch state
    batch_path = os.path.join(DATA_DIR, 'batch-state.dat')
    with open(batch_path, 'wb') as f:
        now_str = datetime.now().strftime("%Y%m%d%H%M%S")
        total_txns = len(transactions)
        rec = make_batch_state_record(
            last_committed=total_txns,
            seq_num=len(batch_sizes) + 1,
            status="IDLE",
            pending_count=0,
            last_txn_id=total_txns,
            timestamp=now_str
        )
        f.write(rec)

    # Create empty files
    open(os.path.join(DATA_DIR, 'pending.dat'), 'wb').close()
    open(os.path.join(DATA_DIR, 'sorted-staging.dat'), 'wb').close()

    return {
        "accounts": SEED_ACCOUNTS,
        "transactions": transactions,
        "batch_boundaries": batch_boundaries,
        "balances": balances,
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
    acct_file = os.path.join(data_dir, 'accounts.dat')
    if os.path.exists(acct_file):
        os.remove(acct_file)

    env = os.environ.copy()
    env['DATA_DIR'] = data_dir

    for acct_num, owner, acct_type, currency, _ in seed_result["accounts"]:
        final_bal = seed_result["balances"].get(acct_num, 0)
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
        for acct_num, owner, acct_type, currency, _ in seed_result["accounts"]:
            final_bal = seed_result["balances"].get(acct_num, 0)
            rec = make_account_record(
                acct_num, owner, acct_type, currency, final_bal,
                status="ACTIVE  ", open_date="20241001"
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
