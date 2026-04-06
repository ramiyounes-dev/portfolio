namespace FrenchPayroll.Core.Models;

/// <summary>
/// Mirrors COTISATION-RECORD.cpy — employer contributions per employee per month.
/// </summary>
public sealed class CotisationPatronale
{
    public string Matricule { get; set; } = string.Empty;
    public int Periode { get; set; }
    public string Nom { get; set; } = string.Empty;
    public string Prenom { get; set; } = string.Empty;
    public string Departement { get; set; } = string.Empty;
    public string Classification { get; set; } = string.Empty;
    public decimal Brut { get; set; }

    // Maladie-maternité-invalidité-décès — Art. L241-2 CSS
    public decimal MaladiePat { get; set; }
    // Vieillesse plafonnée — 8.55% T1 — Décret n°2014-1531
    public decimal VieillPlafPat { get; set; }
    // Vieillesse déplafonnée — 1.90% — Décret n°2013-1290
    public decimal VieillDeplafPat { get; set; }
    // Allocations familiales — Art. L241-6-1 CSS
    public decimal AllocFamPat { get; set; }
    // AT/MP — Art. L241-5 CSS
    public decimal AtmpPat { get; set; }
    // FNAL — Art. L834-1 CSS
    public decimal FnalPat { get; set; }
    // Retraite complémentaire — ANI 2017
    public decimal RetrT1Pat { get; set; }
    public decimal RetrT2Pat { get; set; }
    // CEG — ANI 2017
    public decimal CegT1Pat { get; set; }
    public decimal CegT2Pat { get; set; }
    // Prévoyance cadres — ANI 1947
    public decimal PrevoyPat { get; set; }
    // Chômage — Convention Unédic
    public decimal ChomagePat { get; set; }
    // AGS — Art. L3253-18 Code du travail
    public decimal AgsPat { get; set; }
    // Total
    public decimal TotalPat { get; set; }
}
