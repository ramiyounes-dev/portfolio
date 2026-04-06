namespace FrenchPayroll.Core.Models;

/// <summary>
/// Mirrors PAIE-RECORD.cpy — bulletin de paie mensuel.
/// All monetary fields are decimal (never float/double).
/// </summary>
public sealed class BulletinDePaie
{
    // --- Identification ---
    public string Matricule { get; set; } = string.Empty;
    public int Periode { get; set; }
    public string Nom { get; set; } = string.Empty;
    public string Prenom { get; set; } = string.Empty;
    public string Departement { get; set; } = string.Empty;
    public string Classification { get; set; } = string.Empty;
    public string DatePaiement { get; set; } = string.Empty;

    // --- Salaire de base ---
    public decimal HeuresBase { get; set; }
    public decimal TauxHoraire { get; set; }
    public decimal ForfaitMensuel { get; set; }
    public decimal SalaireBase { get; set; }

    // --- Éléments variables ---
    public decimal HeuresSup25 { get; set; }
    public decimal MontantHs25 { get; set; }
    public decimal HeuresSup50 { get; set; }
    public decimal MontantHs50 { get; set; }
    public decimal PrimeAnciennete { get; set; }
    public decimal PrimeExcept { get; set; }
    public decimal AbsenceHeures { get; set; }
    public decimal AbsenceMontant { get; set; }
    public decimal Brut { get; set; }

    // --- Cotisations salariales ---
    public decimal CotMaladieSal { get; set; }
    public decimal CotVieillPlaf { get; set; }
    public decimal CotVieillDeplaf { get; set; }
    public decimal CsgDeductible { get; set; }
    public decimal CsgNonDeduct { get; set; }
    public decimal CotMutuelleSal { get; set; }
    public decimal CotRetrT1Sal { get; set; }
    public decimal CotRetrT2Sal { get; set; }
    public decimal CotPrevoySal { get; set; }
    public decimal CotChomageSal { get; set; }
    public decimal CotCegT1Sal { get; set; }
    public decimal CotCegT2Sal { get; set; }
    public decimal TotalCotSal { get; set; }

    // --- Exonération HS ---
    public decimal ExonerHs { get; set; }

    // --- Net imposable et PAS ---
    public decimal NetImposable { get; set; }
    public decimal TauxPas { get; set; }
    public decimal MontantPas { get; set; }
    public decimal NetAvantPas { get; set; }
    public decimal NetAPayer { get; set; }

    // --- Tranches ---
    public decimal Tranche1 { get; set; }
    public decimal Tranche2 { get; set; }
}
