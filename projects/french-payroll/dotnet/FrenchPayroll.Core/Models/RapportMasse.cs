namespace FrenchPayroll.Core.Models;

/// <summary>
/// Mirrors RAPPORT-MASSE.dat record — payroll mass summary by department.
/// </summary>
public sealed class RapportMasse
{
    public string Departement { get; set; } = string.Empty;
    public int Effectif { get; set; }
    public decimal BrutTotal { get; set; }
    public decimal CotSalTotal { get; set; }
    public decimal CotPatTotal { get; set; }
    public decimal NetTotal { get; set; }
    public decimal PasTotal { get; set; }
    public decimal CoutEmployeur { get; set; }

    public bool IsGrandTotal => Departement.TrimEnd() == "TOTAL";
}
