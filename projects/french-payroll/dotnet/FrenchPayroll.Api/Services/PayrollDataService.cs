using FrenchPayroll.Core.Models;
using FrenchPayroll.Core.Parsers;

namespace FrenchPayroll.Api.Services;

/// <summary>
/// Reads and parses COBOL flat file output into domain models.
/// Single source of truth is the flat file — C# never recomputes payroll.
/// </summary>
public sealed class PayrollDataService
{
    private readonly DataPathService _paths;

    public PayrollDataService(DataPathService paths)
    {
        _paths = paths;
    }

    public List<Employee> GetEmployees()
    {
        if (!File.Exists(_paths.EmployeesFile)) return [];
        return FlatFileParser.ParseFile(
            _paths.EmployeesFile,
            RecordLayouts.EmployeeRecordLength,
            RecordLayouts.EmployeeFields,
            RecordLayouts.MapEmployee);
    }

    public Employee? GetEmployee(string matricule)
        => GetEmployees().FirstOrDefault(e =>
            e.Matricule.Equals(matricule, StringComparison.OrdinalIgnoreCase));

    public List<BulletinDePaie> GetBulletins(int? periode = null)
    {
        if (!File.Exists(_paths.BulletinsFile)) return [];
        var all = FlatFileParser.ParseFile(
            _paths.BulletinsFile,
            RecordLayouts.PaieRecordLength,
            RecordLayouts.PaieFields,
            RecordLayouts.MapBulletin);
        return periode.HasValue ? all.Where(b => b.Periode == periode.Value).ToList() : all;
    }

    public BulletinDePaie? GetBulletin(int periode, string matricule)
        => GetBulletins(periode).FirstOrDefault(b =>
            b.Matricule.Equals(matricule, StringComparison.OrdinalIgnoreCase));

    public List<CotisationPatronale> GetCotisations(int? periode = null)
    {
        if (!File.Exists(_paths.CotisationsFile)) return [];
        var all = FlatFileParser.ParseFile(
            _paths.CotisationsFile,
            RecordLayouts.CotisationRecordLength,
            RecordLayouts.CotisationFields,
            RecordLayouts.MapCotisation);
        return periode.HasValue ? all.Where(c => c.Periode == periode.Value).ToList() : all;
    }

    public List<JournalEntry> GetJournalEntries(int? periode = null)
    {
        if (!File.Exists(_paths.JournalFile)) return [];
        return FlatFileParser.ParseFile(
            _paths.JournalFile,
            RecordLayouts.JournalRecordLength,
            RecordLayouts.JournalFields,
            RecordLayouts.MapJournal);
    }

    public List<RapportMasse> GetRapportMasse()
    {
        if (!File.Exists(_paths.RapportFile)) return [];
        return FlatFileParser.ParseFile(
            _paths.RapportFile,
            RecordLayouts.RapportRecordLength,
            RecordLayouts.RapportFields,
            RecordLayouts.MapRapport);
    }
}
