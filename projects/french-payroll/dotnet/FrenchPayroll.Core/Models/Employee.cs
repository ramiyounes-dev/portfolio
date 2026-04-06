namespace FrenchPayroll.Core.Models;

/// <summary>
/// Mirrors EMPLOYEE-RECORD.cpy — master employee record.
/// </summary>
public sealed class Employee
{
    public string Matricule { get; set; } = string.Empty;      // PIC X(8)
    public string Ntt { get; set; } = string.Empty;            // PIC X(15)
    public string Nom { get; set; } = string.Empty;            // PIC X(30)
    public string Prenom { get; set; } = string.Empty;         // PIC X(25)
    public string Departement { get; set; } = string.Empty;    // PIC X(12)
    public string Classification { get; set; } = string.Empty; // PIC X(10)
    public decimal TauxHoraire { get; set; }                   // PIC S9(5)V99 COMP-3
    public decimal ForfaitMensuel { get; set; }                // PIC S9(7)V99 COMP-3
    public decimal TauxPas { get; set; }                       // PIC S9(3)V99 COMP-3
    public string DateEntree { get; set; } = string.Empty;     // PIC 9(8) YYYYMMDD
    public int AncienneteAnnees { get; set; }                  // PIC 9(2)
    public string Statut { get; set; } = string.Empty;         // PIC X(7)
    public decimal HeuresMensuelles { get; set; }              // PIC 9(5)V99 COMP-3

    public bool IsCadre => Classification.TrimEnd() is "CADRE" or "CADRE-DIR";
    public bool IsCadreDirigeant => Classification.TrimEnd() == "CADRE-DIR";
    public bool IsActif => Statut.TrimEnd() == "ACTIF";
}
