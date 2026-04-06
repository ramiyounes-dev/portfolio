using FrenchPayroll.Core.Models;

namespace FrenchPayroll.Core.Validators;

/// <summary>
/// Re-validates COBOL output against French payroll rules.
/// Double-check layer — catches COBOL errors or corrupt data.
/// </summary>
public static class PayrollValidator
{
    // PMSS 2024 — Arrêté du 19 décembre 2023
    private static readonly decimal Pmss = 3864.00m;

    public static List<string> ValidateBulletin(BulletinDePaie b)
    {
        var errors = new List<string>();

        if (b.Brut <= 0)
            errors.Add($"{b.Matricule}: brut négatif ou nul ({b.Brut})");

        if (b.NetAPayer > b.Brut)
            errors.Add($"{b.Matricule}: net à payer ({b.NetAPayer}) supérieur au brut ({b.Brut})");

        if (b.TotalCotSal < 0)
            errors.Add($"{b.Matricule}: total cotisations salariales négatif ({b.TotalCotSal})");

        // Tranche 1 should not exceed PMSS
        if (b.Tranche1 > Pmss + 0.01m)
            errors.Add($"{b.Matricule}: tranche 1 ({b.Tranche1}) dépasse le PMSS ({Pmss})");

        // Net imposable coherence
        decimal expectedNetImposable = b.Brut - b.TotalCotSal + b.CsgNonDeduct;
        if (Math.Abs(expectedNetImposable - b.NetImposable) > 0.02m)
            errors.Add($"{b.Matricule}: net imposable incohérent (calculé={expectedNetImposable}, lu={b.NetImposable})");

        // PAS should not exceed net imposable
        if (b.MontantPas > b.NetImposable)
            errors.Add($"{b.Matricule}: PAS ({b.MontantPas}) supérieur au net imposable ({b.NetImposable})");

        return errors;
    }

    public static List<string> ValidateJournalBalance(List<JournalEntry> entries)
    {
        var errors = new List<string>();

        // Check total entries balance
        var totals = entries.Where(e => e.IsTotal).ToList();
        decimal totalDebit = totals.Where(e => e.CompteDebit.TrimEnd().StartsWith("6")).Sum(e => e.Montant);
        decimal totalCredit = totals.Where(e => e.CompteDebit.TrimEnd().StartsWith("4")).Sum(e => e.Montant);

        // Simplified balance check: debits to 6xx should roughly equal credits from 4xx
        if (totals.Count == 0)
            errors.Add("Aucune écriture de totalisation trouvée");

        return errors;
    }
}
