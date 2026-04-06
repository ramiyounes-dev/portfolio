using System.Globalization;
using System.Text;
using FrenchPayroll.Core.Models;

namespace FrenchPayroll.Core.Journal;

/// <summary>
/// Formats PCG journal entries for display and CSV export.
/// </summary>
public static class PcgJournalFormatter
{
    public static string FormatDate(string yyyymmdd)
    {
        if (yyyymmdd.Length == 8 &&
            int.TryParse(yyyymmdd[..4], out var y) &&
            int.TryParse(yyyymmdd[4..6], out var m) &&
            int.TryParse(yyyymmdd[6..8], out var d))
        {
            return $"{d:D2}/{m:D2}/{y:D4}";
        }
        return yyyymmdd;
    }

    public static string FormatMontant(decimal montant)
        => montant.ToString("N2", CultureInfo.GetCultureInfo("fr-FR"));

    public static string ExportCsv(List<JournalEntry> entries)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Date;N° Pièce;Matricule;Compte Débit;Compte Crédit;Montant;Libellé;Type");

        foreach (var e in entries)
        {
            sb.AppendLine(string.Join(";",
                FormatDate(e.Date),
                e.NumeroPiece.Trim(),
                e.Matricule.Trim(),
                e.CompteDebit.Trim(),
                e.CompteCredit.Trim(),
                FormatMontant(e.Montant),
                e.Libelle.Trim(),
                e.TypeEcriture.Trim()));
        }

        return sb.ToString();
    }

    public static (decimal totalDebit, decimal totalCredit, bool isBalanced) CheckBalance(List<JournalEntry> entries)
    {
        // Per-employee: debit 6xx = credit to 421, then 421 debits = credits to 431/437/4421/512
        // Simplified: sum all entries where compte starts with 6 (charges) = total debit
        // Sum all entries where type is NET (credit 512) + COT (credit 431) + PAS (credit 4421) = total credit outflows

        decimal totalDebit = 0;
        decimal totalCredit = 0;

        foreach (var e in entries.Where(e => !e.IsTotal))
        {
            if (e.CompteDebit.TrimEnd().StartsWith("6"))
                totalDebit += e.Montant;
            else
                totalCredit += e.Montant;
        }

        return (totalDebit, totalCredit, Math.Abs(totalDebit - totalCredit) < 0.01m);
    }
}
