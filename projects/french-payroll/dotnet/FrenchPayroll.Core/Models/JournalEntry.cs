namespace FrenchPayroll.Core.Models;

/// <summary>
/// Mirrors JOURNAL-RECORD.cpy — PCG journal entry.
/// </summary>
public sealed class JournalEntry
{
    public string Date { get; set; } = string.Empty;           // PIC 9(8)
    public string NumeroPiece { get; set; } = string.Empty;    // PIC X(12)
    public string Matricule { get; set; } = string.Empty;      // PIC X(8)
    public string CompteDebit { get; set; } = string.Empty;    // PIC X(6)
    public string CompteCredit { get; set; } = string.Empty;   // PIC X(6)
    public decimal Montant { get; set; }                       // PIC S9(11)V99 COMP-3
    public string Libelle { get; set; } = string.Empty;        // PIC X(50)
    public string TypeEcriture { get; set; } = string.Empty;   // PIC X(3)

    public bool IsTotal => Matricule.TrimEnd() == "TOTAL";
}
