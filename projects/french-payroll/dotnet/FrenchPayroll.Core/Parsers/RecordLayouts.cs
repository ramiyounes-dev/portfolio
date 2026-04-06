using FrenchPayroll.Core.Models;

namespace FrenchPayroll.Core.Parsers;

/// <summary>
/// Field definitions matching COBOL copybook layouts exactly.
/// Offsets are byte positions within each fixed-width record.
/// </summary>
public static class RecordLayouts
{
    // ================================================================
    // EMPLOYEE-RECORD.cpy — 200 bytes
    // ================================================================
    public const int EmployeeRecordLength = 200;

    public static readonly FieldDef[] EmployeeFields =
    [
        new("Matricule",        0,   8, FieldType.Alphanumeric),
        new("Ntt",              8,  15, FieldType.Alphanumeric),
        new("Nom",             23,  30, FieldType.Alphanumeric),
        new("Prenom",          53,  25, FieldType.Alphanumeric),
        new("Departement",     78,  12, FieldType.Alphanumeric),
        new("Classification",  90,  10, FieldType.Alphanumeric),
        new("TauxHoraire",    100,   4, FieldType.Comp3, 2),   // S9(5)V99
        new("ForfaitMensuel", 104,   5, FieldType.Comp3, 2),   // S9(7)V99
        new("TauxPas",        109,   3, FieldType.Comp3, 2),   // S9(3)V99
        new("DateEntree",     112,   8, FieldType.Alphanumeric),
        new("Anciennete",     120,   2, FieldType.Numeric),
        new("Statut",         122,   7, FieldType.Alphanumeric),
        new("HeuresMensuelles",129,  4, FieldType.Comp3, 2),   // 9(5)V99
    ];

    public static Employee MapEmployee(Dictionary<string, object> r) => new()
    {
        Matricule        = FlatFileParser.GetString(r, "Matricule"),
        Ntt              = FlatFileParser.GetString(r, "Ntt"),
        Nom              = FlatFileParser.GetString(r, "Nom"),
        Prenom           = FlatFileParser.GetString(r, "Prenom"),
        Departement      = FlatFileParser.GetString(r, "Departement"),
        Classification   = FlatFileParser.GetString(r, "Classification"),
        TauxHoraire      = FlatFileParser.GetDecimal(r, "TauxHoraire"),
        ForfaitMensuel   = FlatFileParser.GetDecimal(r, "ForfaitMensuel"),
        TauxPas          = FlatFileParser.GetDecimal(r, "TauxPas"),
        DateEntree       = FlatFileParser.GetString(r, "DateEntree"),
        AncienneteAnnees = FlatFileParser.GetInt(r, "Anciennete"),
        Statut           = FlatFileParser.GetString(r, "Statut"),
        HeuresMensuelles = FlatFileParser.GetDecimal(r, "HeuresMensuelles"),
    };

    // ================================================================
    // PAIE-RECORD.cpy — 500 bytes (with COMP-3 packing actual ~365)
    // We compute actual byte offsets from the copybook structure.
    // ================================================================
    public const int PaieRecordLength = 500;

    public static readonly FieldDef[] PaieFields =
    [
        new("Matricule",       0,   8, FieldType.Alphanumeric),
        new("Periode",         8,   6, FieldType.Numeric),
        new("Nom",            14,  30, FieldType.Alphanumeric),
        new("Prenom",         44,  25, FieldType.Alphanumeric),
        new("Departement",    69,  12, FieldType.Alphanumeric),
        new("Classification", 81,  10, FieldType.Alphanumeric),
        new("DatePaiement",   91,   8, FieldType.Alphanumeric),
        // Salaire de base
        new("HeuresBase",     99,   4, FieldType.Comp3, 2),    // S9(5)V99
        new("TauxHoraire",   103,   4, FieldType.Comp3, 2),    // S9(5)V99
        new("ForfaitMensuel",107,   5, FieldType.Comp3, 2),    // S9(7)V99
        new("SalaireBase",   112,   6, FieldType.Comp3, 2),    // S9(9)V99
        // Éléments variables
        new("HeuresSup25",   118,   4, FieldType.Comp3, 2),
        new("MontantHs25",   122,   6, FieldType.Comp3, 2),
        new("HeuresSup50",   128,   4, FieldType.Comp3, 2),
        new("MontantHs50",   132,   6, FieldType.Comp3, 2),
        new("PrimeAnc",      138,   6, FieldType.Comp3, 2),
        new("PrimeExcept",   144,   6, FieldType.Comp3, 2),
        new("AbsenceHeures", 150,   4, FieldType.Comp3, 2),
        new("AbsenceMontant",154,   6, FieldType.Comp3, 2),
        new("Brut",          160,   6, FieldType.Comp3, 2),
        // Cotisations salariales
        new("CotMaladieSal", 166,   6, FieldType.Comp3, 2),
        new("CotVieillPlaf", 172,   6, FieldType.Comp3, 2),
        new("CotVieillDeplaf",178,  6, FieldType.Comp3, 2),
        new("CsgDeductible", 184,   6, FieldType.Comp3, 2),
        new("CsgNonDeduct",  190,   6, FieldType.Comp3, 2),
        new("CotMutuelleSal",196,   6, FieldType.Comp3, 2),
        new("CotRetrT1Sal",  202,   6, FieldType.Comp3, 2),
        new("CotRetrT2Sal",  208,   6, FieldType.Comp3, 2),
        new("CotPrevoySal",  214,   6, FieldType.Comp3, 2),
        new("CotChomageSal", 220,   6, FieldType.Comp3, 2),
        new("CotCegT1Sal",   226,   6, FieldType.Comp3, 2),
        new("CotCegT2Sal",   232,   6, FieldType.Comp3, 2),
        new("TotalCotSal",   238,   6, FieldType.Comp3, 2),
        new("ExonerHs",      244,   6, FieldType.Comp3, 2),
        // Net imposable / PAS
        new("NetImposable",  250,   6, FieldType.Comp3, 2),
        new("TauxPas",       256,   3, FieldType.Comp3, 2),    // S9(3)V99
        new("MontantPas",    259,   6, FieldType.Comp3, 2),
        new("NetAvantPas",   265,   6, FieldType.Comp3, 2),
        new("NetAPayer",     271,   6, FieldType.Comp3, 2),
        // Tranches
        new("Tranche1",      277,   6, FieldType.Comp3, 2),
        new("Tranche2",      283,   6, FieldType.Comp3, 2),
    ];

    public static BulletinDePaie MapBulletin(Dictionary<string, object> r) => new()
    {
        Matricule       = FlatFileParser.GetString(r, "Matricule"),
        Periode         = FlatFileParser.GetInt(r, "Periode"),
        Nom             = FlatFileParser.GetString(r, "Nom"),
        Prenom          = FlatFileParser.GetString(r, "Prenom"),
        Departement     = FlatFileParser.GetString(r, "Departement"),
        Classification  = FlatFileParser.GetString(r, "Classification"),
        DatePaiement    = FlatFileParser.GetString(r, "DatePaiement"),
        HeuresBase      = FlatFileParser.GetDecimal(r, "HeuresBase"),
        TauxHoraire     = FlatFileParser.GetDecimal(r, "TauxHoraire"),
        ForfaitMensuel  = FlatFileParser.GetDecimal(r, "ForfaitMensuel"),
        SalaireBase     = FlatFileParser.GetDecimal(r, "SalaireBase"),
        HeuresSup25     = FlatFileParser.GetDecimal(r, "HeuresSup25"),
        MontantHs25     = FlatFileParser.GetDecimal(r, "MontantHs25"),
        HeuresSup50     = FlatFileParser.GetDecimal(r, "HeuresSup50"),
        MontantHs50     = FlatFileParser.GetDecimal(r, "MontantHs50"),
        PrimeAnciennete = FlatFileParser.GetDecimal(r, "PrimeAnc"),
        PrimeExcept     = FlatFileParser.GetDecimal(r, "PrimeExcept"),
        AbsenceHeures   = FlatFileParser.GetDecimal(r, "AbsenceHeures"),
        AbsenceMontant  = FlatFileParser.GetDecimal(r, "AbsenceMontant"),
        Brut            = FlatFileParser.GetDecimal(r, "Brut"),
        CotMaladieSal   = FlatFileParser.GetDecimal(r, "CotMaladieSal"),
        CotVieillPlaf   = FlatFileParser.GetDecimal(r, "CotVieillPlaf"),
        CotVieillDeplaf = FlatFileParser.GetDecimal(r, "CotVieillDeplaf"),
        CsgDeductible   = FlatFileParser.GetDecimal(r, "CsgDeductible"),
        CsgNonDeduct    = FlatFileParser.GetDecimal(r, "CsgNonDeduct"),
        CotMutuelleSal  = FlatFileParser.GetDecimal(r, "CotMutuelleSal"),
        CotRetrT1Sal    = FlatFileParser.GetDecimal(r, "CotRetrT1Sal"),
        CotRetrT2Sal    = FlatFileParser.GetDecimal(r, "CotRetrT2Sal"),
        CotPrevoySal    = FlatFileParser.GetDecimal(r, "CotPrevoySal"),
        CotChomageSal   = FlatFileParser.GetDecimal(r, "CotChomageSal"),
        CotCegT1Sal     = FlatFileParser.GetDecimal(r, "CotCegT1Sal"),
        CotCegT2Sal     = FlatFileParser.GetDecimal(r, "CotCegT2Sal"),
        TotalCotSal     = FlatFileParser.GetDecimal(r, "TotalCotSal"),
        ExonerHs        = FlatFileParser.GetDecimal(r, "ExonerHs"),
        NetImposable    = FlatFileParser.GetDecimal(r, "NetImposable"),
        TauxPas         = FlatFileParser.GetDecimal(r, "TauxPas"),
        MontantPas      = FlatFileParser.GetDecimal(r, "MontantPas"),
        NetAvantPas     = FlatFileParser.GetDecimal(r, "NetAvantPas"),
        NetAPayer       = FlatFileParser.GetDecimal(r, "NetAPayer"),
        Tranche1        = FlatFileParser.GetDecimal(r, "Tranche1"),
        Tranche2        = FlatFileParser.GetDecimal(r, "Tranche2"),
    };

    // ================================================================
    // COTISATION-RECORD.cpy — 300 bytes
    // ================================================================
    public const int CotisationRecordLength = 300;

    public static readonly FieldDef[] CotisationFields =
    [
        new("Matricule",        0,   8, FieldType.Alphanumeric),
        new("Periode",          8,   6, FieldType.Numeric),
        new("Nom",             14,  30, FieldType.Alphanumeric),
        new("Prenom",          44,  25, FieldType.Alphanumeric),
        new("Departement",     69,  12, FieldType.Alphanumeric),
        new("Classification",  81,  10, FieldType.Alphanumeric),
        new("Brut",            91,   6, FieldType.Comp3, 2),
        new("MaladiePat",      97,   6, FieldType.Comp3, 2),
        new("VieillPlafPat",  103,   6, FieldType.Comp3, 2),
        new("VieillDeplafPat",109,   6, FieldType.Comp3, 2),
        new("AllocFamPat",    115,   6, FieldType.Comp3, 2),
        new("AtmpPat",        121,   6, FieldType.Comp3, 2),
        new("FnalPat",        127,   6, FieldType.Comp3, 2),
        new("RetrT1Pat",      133,   6, FieldType.Comp3, 2),
        new("RetrT2Pat",      139,   6, FieldType.Comp3, 2),
        new("CegT1Pat",       145,   6, FieldType.Comp3, 2),
        new("CegT2Pat",       151,   6, FieldType.Comp3, 2),
        new("PrevoyPat",      157,   6, FieldType.Comp3, 2),
        new("ChomagePat",     163,   6, FieldType.Comp3, 2),
        new("AgsPat",         169,   6, FieldType.Comp3, 2),
        new("TotalPat",       175,   6, FieldType.Comp3, 2),
    ];

    public static CotisationPatronale MapCotisation(Dictionary<string, object> r) => new()
    {
        Matricule       = FlatFileParser.GetString(r, "Matricule"),
        Periode         = FlatFileParser.GetInt(r, "Periode"),
        Nom             = FlatFileParser.GetString(r, "Nom"),
        Prenom          = FlatFileParser.GetString(r, "Prenom"),
        Departement     = FlatFileParser.GetString(r, "Departement"),
        Classification  = FlatFileParser.GetString(r, "Classification"),
        Brut            = FlatFileParser.GetDecimal(r, "Brut"),
        MaladiePat      = FlatFileParser.GetDecimal(r, "MaladiePat"),
        VieillPlafPat   = FlatFileParser.GetDecimal(r, "VieillPlafPat"),
        VieillDeplafPat = FlatFileParser.GetDecimal(r, "VieillDeplafPat"),
        AllocFamPat     = FlatFileParser.GetDecimal(r, "AllocFamPat"),
        AtmpPat         = FlatFileParser.GetDecimal(r, "AtmpPat"),
        FnalPat         = FlatFileParser.GetDecimal(r, "FnalPat"),
        RetrT1Pat       = FlatFileParser.GetDecimal(r, "RetrT1Pat"),
        RetrT2Pat       = FlatFileParser.GetDecimal(r, "RetrT2Pat"),
        CegT1Pat        = FlatFileParser.GetDecimal(r, "CegT1Pat"),
        CegT2Pat        = FlatFileParser.GetDecimal(r, "CegT2Pat"),
        PrevoyPat       = FlatFileParser.GetDecimal(r, "PrevoyPat"),
        ChomagePat      = FlatFileParser.GetDecimal(r, "ChomagePat"),
        AgsPat          = FlatFileParser.GetDecimal(r, "AgsPat"),
        TotalPat        = FlatFileParser.GetDecimal(r, "TotalPat"),
    };

    // ================================================================
    // JOURNAL-RECORD.cpy — 150 bytes
    // ================================================================
    public const int JournalRecordLength = 150;

    public static readonly FieldDef[] JournalFields =
    [
        new("Date",           0,   8, FieldType.Alphanumeric),
        new("NumeroPiece",    8,  12, FieldType.Alphanumeric),
        new("Matricule",     20,   8, FieldType.Alphanumeric),
        new("CompteDebit",   28,   6, FieldType.Alphanumeric),
        new("CompteCredit",  34,   6, FieldType.Alphanumeric),
        new("Montant",       40,   7, FieldType.Comp3, 2),     // S9(11)V99
        new("Libelle",       47,  50, FieldType.Alphanumeric),
        new("TypeEcriture",  97,   3, FieldType.Alphanumeric),
    ];

    public static JournalEntry MapJournal(Dictionary<string, object> r) => new()
    {
        Date          = FlatFileParser.GetString(r, "Date"),
        NumeroPiece   = FlatFileParser.GetString(r, "NumeroPiece"),
        Matricule     = FlatFileParser.GetString(r, "Matricule"),
        CompteDebit   = FlatFileParser.GetString(r, "CompteDebit"),
        CompteCredit  = FlatFileParser.GetString(r, "CompteCredit"),
        Montant       = FlatFileParser.GetDecimal(r, "Montant"),
        Libelle       = FlatFileParser.GetString(r, "Libelle"),
        TypeEcriture  = FlatFileParser.GetString(r, "TypeEcriture"),
    };

    // ================================================================
    // RAPPORT-MASSE record — 104 bytes
    // ================================================================
    public const int RapportRecordLength = 104;

    public static readonly FieldDef[] RapportFields =
    [
        new("Departement",   0,  12, FieldType.Alphanumeric),
        new("Effectif",     12,   4, FieldType.Numeric),
        new("BrutTotal",    16,   7, FieldType.Comp3, 2),     // S9(11)V99
        new("CotSalTotal",  23,   7, FieldType.Comp3, 2),
        new("CotPatTotal",  30,   7, FieldType.Comp3, 2),
        new("NetTotal",     37,   7, FieldType.Comp3, 2),
        new("PasTotal",     44,   7, FieldType.Comp3, 2),
        new("CoutEmployeur",51,   7, FieldType.Comp3, 2),
    ];

    public static RapportMasse MapRapport(Dictionary<string, object> r) => new()
    {
        Departement    = FlatFileParser.GetString(r, "Departement"),
        Effectif       = FlatFileParser.GetInt(r, "Effectif"),
        BrutTotal      = FlatFileParser.GetDecimal(r, "BrutTotal"),
        CotSalTotal    = FlatFileParser.GetDecimal(r, "CotSalTotal"),
        CotPatTotal    = FlatFileParser.GetDecimal(r, "CotPatTotal"),
        NetTotal       = FlatFileParser.GetDecimal(r, "NetTotal"),
        PasTotal       = FlatFileParser.GetDecimal(r, "PasTotal"),
        CoutEmployeur  = FlatFileParser.GetDecimal(r, "CoutEmployeur"),
    };
}
