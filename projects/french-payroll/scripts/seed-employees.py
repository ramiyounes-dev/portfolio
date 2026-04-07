#!/usr/bin/env python3
"""
seed-employees.py — Generate EMPLOYEES.dat and VARIABLES-PAIE.dat
for the French Payroll COBOL system.

Produces fixed-width flat files matching COBOL copybook layouts.
80 employees across 4 departments with realistic French payroll data.
"""

import struct
import sys
import os
import random
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

# --- Output paths ---
DATA_DIR = os.environ.get("DATA_DIR", os.path.join(os.path.dirname(__file__), "..", "data"))
EMPLOYEE_FILE = os.path.join(DATA_DIR, "EMPLOYEES.dat")
VARIABLES_FILE = os.path.join(DATA_DIR, "VARIABLES-PAIE.dat")
PERIODE = os.environ.get("PERIODE", date.today().strftime("%Y%m"))

# --- Reference values 2024 ---
PMSS = Decimal("3864.00")
SMIC_MENSUEL = Decimal("1766.92")

# --- Employee name pools (realistic French diversity) ---
NOMS = [
    "MARTIN", "BERNARD", "THOMAS", "PETIT", "ROBERT", "RICHARD",
    "DURAND", "DUBOIS", "MOREAU", "LAURENT", "SIMON", "MICHEL",
    "LEFEVRE", "LEROY", "ROUX", "DAVID", "BERTRAND", "MOREL",
    "FOURNIER", "GIRARD", "BONNET", "DUPONT", "LAMBERT", "FONTAINE",
    "ROUSSEAU", "VINCENT", "MULLER", "LEFEVRE", "FAURE", "ANDRE",
    "MERCIER", "BLANC", "GUERIN", "BOYER", "GARNIER", "CHEVALIER",
    "FRANCOIS", "LEGRAND", "GAUTHIER", "GARCIA", "PERRIN", "ROBIN",
    "CLEMENT", "MORIN", "NICOLAS", "HENRY", "ROUSSEL", "MATHIEU",
    "GAUTIER", "MASSON", "MARCHAND", "DUVAL", "DENIS", "DUMONT",
    "MARIE", "LEMAIRE", "NOEL", "MEYER", "DUFOUR", "MEUNIER",
    "BRUN", "BLANCHARD", "GIRAUD", "JOLY", "RIVIERE", "LUCAS",
    "BRUNET", "GAILLARD", "BARBIER", "ARNAUD", "MARTINEZ", "GERARD",
    "ROCHE", "RENARD", "SCHMITT", "ROY", "LEROUX", "COLIN",
    "VIDAL", "CARON", "PICARD", "ROGER", "FABRE", "AUBERT",
]

PRENOMS = [
    "Jean", "Pierre", "Michel", "Philippe", "Alain", "Patrick",
    "Jacques", "Christophe", "Nicolas", "Laurent", "Frederic", "Eric",
    "Stephane", "Olivier", "David", "Franck", "Bruno", "Pascal",
    "Didier", "Thierry", "Marie", "Nathalie", "Isabelle", "Catherine",
    "Sylvie", "Sandrine", "Valerie", "Sophie", "Veronique", "Christine",
    "Anne", "Celine", "Emilie", "Julie", "Claire", "Marion",
    "Laure", "Delphine", "Camille", "Antoine", "Thomas", "Alexandre",
    "Maxime", "Julien", "Romain", "Sebastien", "Guillaume", "Vincent",
    "Helene", "Aurelien", "Fabrice", "Yannick", "Rachid", "Karim",
    "Fatima", "Amina", "Mohamed", "Samir", "Leila", "Aicha",
    "Paolo", "Marco", "Elena", "Carla", "Andrei", "Svetlana",
    "Luc", "Benoit", "Estelle", "Mathilde", "Hugo", "Lucas",
    "Manon", "Charlotte", "Arthur", "Louis", "Emma", "Lea",
    "Paul", "Gabriel",
]

# --- Department definitions ---
DEPARTMENTS = {
    "COMMERCIAL":  {"count": 22, "nc": 17, "c": 4, "cd": 1},
    "TECHNIQUE":   {"count": 28, "nc": 20, "c": 7, "cd": 1},
    "RH":          {"count": 15, "nc": 10, "c": 4, "cd": 1},
    "DIRECTION":   {"count": 15, "nc":  8, "c": 5, "cd": 2},
}

# Salary ranges by classification (monthly brut)
SALARY_RANGES = {
    "NON-CADRE": (Decimal("1900.00"), Decimal("3200.00")),
    "CADRE":     (Decimal("3500.00"), Decimal("6500.00")),
    "CADRE-DIR": (Decimal("7500.00"), Decimal("14000.00")),
}

# PAS neutral rate brackets 2024
PAS_BRACKETS = [
    (Decimal("1592.00"), Decimal("0.00")),
    (Decimal("1944.00"), Decimal("2.50")),
    (Decimal("2592.00"), Decimal("10.00")),
    (Decimal("3584.00"), Decimal("15.00")),
    (Decimal("4897.00"), Decimal("20.00")),
    (Decimal("6893.00"), Decimal("25.00")),
    (Decimal("9085.00"), Decimal("35.00")),
    (Decimal("12112.00"), Decimal("38.00")),
    (Decimal("999999.00"), Decimal("43.00")),
]


def random_decimal(low, high):
    """Generate a random Decimal in range, rounded to 2 places."""
    val = Decimal(str(random.uniform(float(low), float(high))))
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def estimate_net_imposable(brut):
    """Rough estimate of net imposable for PAS rate lookup."""
    # ~22% total cotisations salariales on average
    return (brut * Decimal("0.78")).quantize(Decimal("0.01"))


def get_pas_rate(net_imposable):
    """Look up taux neutre PAS from barème 2024."""
    for limit, rate in PAS_BRACKETS:
        if net_imposable <= limit:
            return rate
    return Decimal("43.00")


def pack_comp3(value, digits_before, digits_after):
    """
    Pack a decimal value into COBOL COMP-3 (packed decimal) format.
    PIC S9(digits_before)V99 COMP-3
    Total nibbles = digits_before + digits_after + 1 (sign)
    Total bytes = ceil((total_nibbles) / 2) ... actually (n+1)/2 rounded up
    """
    total_digits = digits_before + digits_after
    total_nibbles = total_digits + 1  # +1 for sign nibble
    total_bytes = (total_nibbles + 1) // 2

    # Convert to integer representation (remove decimal point)
    int_val = int(value * (10 ** digits_after))
    is_negative = int_val < 0
    int_val = abs(int_val)

    # Create digit string
    digit_str = str(int_val).zfill(total_digits)
    if len(digit_str) > total_digits:
        digit_str = digit_str[-total_digits:]  # truncate overflow

    # Sign nibble: C = positive, D = negative
    sign = 'D' if is_negative else 'C'
    packed_str = digit_str + sign

    # Convert pairs of hex nibbles to bytes
    result = bytearray()
    for i in range(0, len(packed_str), 2):
        pair = packed_str[i:i+2]
        byte_val = int(pair[0]) * 16 + (int(pair[1]) if pair[1].isdigit() else
                   (0xC if pair[1] == 'C' else 0xD))
        result.append(byte_val)

    return bytes(result)


def make_employee_record(matricule, ntt, nom, prenom, departement,
                         classification, taux_horaire, forfait_mensuel,
                         taux_pas, date_entree, anciennete, statut,
                         heures_mensuelles):
    """Build a 200-byte EMPLOYEE-RECORD matching the copybook layout."""
    rec = bytearray(200)
    pos = 0

    # EMP-MATRICULE PIC X(8)
    rec[pos:pos+8] = matricule.ljust(8).encode('ascii')[:8]
    pos += 8

    # EMP-NTT PIC X(15)
    rec[pos:pos+15] = ntt.ljust(15).encode('ascii')[:15]
    pos += 15

    # EMP-NOM PIC X(30)
    rec[pos:pos+30] = nom.ljust(30).encode('ascii')[:30]
    pos += 30

    # EMP-PRENOM PIC X(25)
    rec[pos:pos+25] = prenom.ljust(25).encode('ascii')[:25]
    pos += 25

    # EMP-DEPARTEMENT PIC X(12)
    rec[pos:pos+12] = departement.ljust(12).encode('ascii')[:12]
    pos += 12

    # EMP-CLASSIFICATION PIC X(10)
    rec[pos:pos+10] = classification.ljust(10).encode('ascii')[:10]
    pos += 10

    # EMP-TAUX-HORAIRE PIC S9(5)V99 COMP-3 => 4 bytes
    rec[pos:pos+4] = pack_comp3(taux_horaire, 5, 2)
    pos += 4

    # EMP-FORFAIT-MENSUEL PIC S9(7)V99 COMP-3 => 5 bytes
    rec[pos:pos+5] = pack_comp3(forfait_mensuel, 7, 2)
    pos += 5

    # EMP-TAUX-PAS PIC S9(3)V99 COMP-3 => 3 bytes
    rec[pos:pos+3] = pack_comp3(taux_pas, 3, 2)
    pos += 3

    # EMP-DATE-ENTREE PIC 9(8)
    rec[pos:pos+8] = date_entree.encode('ascii')[:8]
    pos += 8

    # EMP-ANCIENNETE-ANNEES PIC 9(2)
    rec[pos:pos+2] = str(anciennete).zfill(2).encode('ascii')[:2]
    pos += 2

    # EMP-STATUT PIC X(7)
    rec[pos:pos+7] = statut.ljust(7).encode('ascii')[:7]
    pos += 7

    # EMP-HEURES-MENSUELLES PIC 9(5)V99 COMP-3 => 4 bytes
    rec[pos:pos+4] = pack_comp3(heures_mensuelles, 5, 2)
    pos += 4

    # FILLER PIC X(68)
    # Already zeroed

    return bytes(rec)


def make_variables_record(matricule, periode, heures_sup, prime_except,
                          absence_heures, absence_type):
    """Build a VARIABLES-PAIE record matching the FD layout."""
    # Total record: 8 + 6 + 4 + 6 + 4 + 10 + 50 = 88 bytes
    rec = bytearray(88)
    pos = 0

    # VAR-MATRICULE PIC X(8)
    rec[pos:pos+8] = matricule.ljust(8).encode('ascii')[:8]
    pos += 8

    # VAR-PERIODE PIC 9(6)
    rec[pos:pos+6] = periode.encode('ascii')[:6]
    pos += 6

    # VAR-HEURES-SUP PIC S9(5)V99 COMP-3 => 4 bytes
    rec[pos:pos+4] = pack_comp3(heures_sup, 5, 2)
    pos += 4

    # VAR-PRIME-EXCEPT PIC S9(9)V99 COMP-3 => 6 bytes
    rec[pos:pos+6] = pack_comp3(prime_except, 9, 2)
    pos += 6

    # VAR-ABSENCE-HEURES PIC S9(5)V99 COMP-3 => 4 bytes
    rec[pos:pos+4] = pack_comp3(absence_heures, 5, 2)
    pos += 4

    # VAR-ABSENCE-TYPE PIC X(10)
    rec[pos:pos+10] = absence_type.ljust(10).encode('ascii')[:10]
    pos += 10

    # FILLER PIC X(50)
    # Already zeroed

    return bytes(rec)


def generate_employees():
    """Generate 80 employee records."""
    employees = []
    matricule_num = 1
    used_names = set()

    for dept_name, dept_info in DEPARTMENTS.items():
        classifications = (
            [("NON-CADRE", dept_info["nc"])] +
            [("CADRE", dept_info["c"])] +
            [("CADRE-DIR", dept_info["cd"])]
        )

        for classif, count in classifications:
            for _ in range(count):
                matricule = f"E{matricule_num:07d}"
                matricule_num += 1

                # Pick unique name
                while True:
                    nom = random.choice(NOMS)
                    prenom = random.choice(PRENOMS)
                    key = (nom, prenom)
                    if key not in used_names:
                        used_names.add(key)
                        break

                # NTT (NIR) — fictional
                gender = "2" if prenom in [
                    "Marie", "Nathalie", "Isabelle", "Catherine", "Sylvie",
                    "Sandrine", "Valerie", "Sophie", "Veronique", "Christine",
                    "Anne", "Celine", "Emilie", "Julie", "Claire", "Marion",
                    "Laure", "Delphine", "Camille", "Helene", "Estelle",
                    "Mathilde", "Manon", "Charlotte", "Emma", "Lea",
                    "Fatima", "Amina", "Leila", "Aicha", "Elena", "Carla",
                    "Svetlana",
                ] else "1"
                birth_year = random.randint(65, 99)
                birth_month = random.randint(1, 12)
                dept_code = random.randint(1, 95)
                ntt = f"{gender}{birth_year:02d}{birth_month:02d}{dept_code:02d}{random.randint(100, 999):03d}{random.randint(10, 99):02d}"

                # Salary
                low, high = SALARY_RANGES[classif]
                if classif == "NON-CADRE":
                    brut = random_decimal(low, high)
                    taux_horaire = (brut / Decimal("151.67")).quantize(
                        Decimal("0.01"), rounding=ROUND_HALF_UP)
                    forfait = Decimal("0.00")
                    heures = Decimal("151.67")
                else:
                    forfait = random_decimal(low, high)
                    brut = forfait
                    taux_horaire = Decimal("0.00")
                    heures = Decimal("0.00")

                # Ancienneté
                anciennete = random.randint(0, 25)
                years_ago = anciennete + random.randint(0, 2)
                entry_date = date.today().replace(year=date.today().year - years_ago)
                # Clamp to valid date
                try:
                    entry_str = entry_date.strftime("%Y%m%d")
                except ValueError:
                    entry_date = entry_date.replace(day=28)
                    entry_str = entry_date.strftime("%Y%m%d")

                # PAS rate based on estimated net imposable
                net_imp_est = estimate_net_imposable(brut)
                taux_pas = get_pas_rate(net_imp_est)

                employees.append({
                    "matricule": matricule,
                    "ntt": ntt,
                    "nom": nom,
                    "prenom": prenom,
                    "departement": dept_name,
                    "classification": classif,
                    "taux_horaire": taux_horaire,
                    "forfait": forfait,
                    "taux_pas": taux_pas,
                    "date_entree": entry_str,
                    "anciennete": anciennete,
                    "heures": heures,
                    "brut": brut,
                })

    return employees


def generate_variables(employees, periode):
    """Generate monthly variable records."""
    variables = []
    non_cadres = [e for e in employees if e["classification"] == "NON-CADRE"]
    all_emps = employees[:]

    # 30% of non-cadres have HS
    hs_employees = random.sample(non_cadres, k=int(len(non_cadres) * 0.30))
    hs_matricules = {e["matricule"] for e in hs_employees}

    # 10% have absence
    absence_employees = random.sample(all_emps, k=int(len(all_emps) * 0.10))
    absence_matricules = {e["matricule"] for e in absence_employees}

    # 5 have prime exceptionnelle
    prime_employees = random.sample(all_emps, k=5)
    prime_matricules = {e["matricule"] for e in prime_employees}

    for emp in employees:
        mat = emp["matricule"]
        hs = Decimal("0.00")
        prime = Decimal("0.00")
        abs_h = Decimal("0.00")
        abs_type = ""

        if mat in hs_matricules:
            hs = random_decimal(Decimal("2.00"), Decimal("15.00"))

        if mat in prime_matricules:
            prime = random_decimal(Decimal("500.00"), Decimal("2000.00"))

        if mat in absence_matricules:
            abs_h = random_decimal(Decimal("7.00"), Decimal("35.00"))
            abs_type = "MALADIE"

        variables.append({
            "matricule": mat,
            "periode": periode,
            "heures_sup": hs,
            "prime_except": prime,
            "absence_heures": abs_h,
            "absence_type": abs_type,
        })

    return variables


def write_indexed_file(employees, filepath):
    """
    Write EMPLOYEES.dat as a sequential file (GnuCOBOL will build the
    index when the COBOL program opens it for I-O/OUTPUT with INDEXED org).
    For seed purposes we write a sequential version and let a small COBOL
    utility build the indexed file.

    Actually, for simplicity with GnuCOBOL, we write as sequential and
    the CALC-PAIE program uses it. We'll adjust the COBOL to read
    sequentially or we'll produce the indexed file via a COBOL loader.
    """
    records = []
    for emp in employees:
        rec = make_employee_record(
            emp["matricule"], emp["ntt"], emp["nom"], emp["prenom"],
            emp["departement"], emp["classification"],
            emp["taux_horaire"], emp["forfait"],
            emp["taux_pas"], emp["date_entree"], emp["anciennete"],
            "ACTIF", emp["heures"]
        )
        records.append(rec)

    # Sort by matricule for indexed file
    records.sort(key=lambda r: r[:8])

    with open(filepath, "wb") as f:
        for rec in records:
            f.write(rec)

    return len(records)


def write_variables_file(variables, filepath):
    """Write VARIABLES-PAIE.dat as sequential fixed-width."""
    with open(filepath, "wb") as f:
        for var in variables:
            rec = make_variables_record(
                var["matricule"], var["periode"],
                var["heures_sup"], var["prime_except"],
                var["absence_heures"], var["absence_type"]
            )
            f.write(rec)
    return len(variables)


def main():
    os.makedirs(DATA_DIR, exist_ok=True)

    print(f"Generating seed data for period {PERIODE}...")
    print(f"Output directory: {DATA_DIR}")

    employees = generate_employees()
    variables = generate_variables(employees, PERIODE)

    n_emp = write_indexed_file(employees, EMPLOYEE_FILE)
    print(f"  EMPLOYEES.dat: {n_emp} records written")

    n_var = write_variables_file(variables, VARIABLES_FILE)
    print(f"  VARIABLES-PAIE.dat: {n_var} records written")

    # Print summary
    dept_counts = {}
    classif_counts = {}
    for emp in employees:
        dept_counts[emp["departement"]] = dept_counts.get(emp["departement"], 0) + 1
        classif_counts[emp["classification"]] = classif_counts.get(emp["classification"], 0) + 1

    print("\n  Department breakdown:")
    for dept, count in sorted(dept_counts.items()):
        print(f"    {dept:12s}: {count}")

    print("\n  Classification breakdown:")
    for classif, count in sorted(classif_counts.items()):
        print(f"    {classif:12s}: {count}")

    hs_count = sum(1 for v in variables if v["heures_sup"] > 0)
    abs_count = sum(1 for v in variables if v["absence_heures"] > 0)
    prime_count = sum(1 for v in variables if v["prime_except"] > 0)
    print(f"\n  Monthly variables:")
    print(f"    Heures sup: {hs_count} employees")
    print(f"    Absences:   {abs_count} employees")
    print(f"    Primes:     {prime_count} employees")


if __name__ == "__main__":
    main()
