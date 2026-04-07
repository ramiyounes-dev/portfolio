using System.Text.Json;
using System.Text.Json.Serialization;
using FrenchPayroll.Core.Parsers;

// Usage: FrenchPayroll.Export <data-dir> <output-dir>
var dataDir = args.Length > 0 ? args[0] : Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "data"));
var outputDir = args.Length > 1 ? args[1] : Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "showcase", "data"));

Directory.CreateDirectory(outputDir);

Console.WriteLine($"Reading COBOL data from: {dataDir}");
Console.WriteLine($"Writing JSON to:         {outputDir}");

var employees = FlatFileParser.ParseFile(
    Path.Combine(dataDir, "EMPLOYEES-SEQ.dat"),
    RecordLayouts.EmployeeRecordLength,
    RecordLayouts.EmployeeFields,
    RecordLayouts.MapEmployee);
Console.WriteLine($"  Employees:    {employees.Count} records");

var bulletins = FlatFileParser.ParseFile(
    Path.Combine(dataDir, "BULLETINS.dat"),
    RecordLayouts.PaieRecordLength,
    RecordLayouts.PaieFields,
    RecordLayouts.MapBulletin);
Console.WriteLine($"  Bulletins:    {bulletins.Count} records");

var cotisations = FlatFileParser.ParseFile(
    Path.Combine(dataDir, "COTISATIONS-PATRONALES.dat"),
    RecordLayouts.CotisationRecordLength,
    RecordLayouts.CotisationFields,
    RecordLayouts.MapCotisation);
Console.WriteLine($"  Cotisations:  {cotisations.Count} records");

var journal = FlatFileParser.ParseFile(
    Path.Combine(dataDir, "JOURNAL-PCG.dat"),
    RecordLayouts.JournalRecordLength,
    RecordLayouts.JournalFields,
    RecordLayouts.MapJournal);
Console.WriteLine($"  Journal:      {journal.Count} entries");

var rapport = FlatFileParser.ParseFile(
    Path.Combine(dataDir, "RAPPORT-MASSE.dat"),
    RecordLayouts.RapportRecordLength,
    RecordLayouts.RapportFields,
    RecordLayouts.MapRapport);
Console.WriteLine($"  Rapport:      {rapport.Count} records");

var periode = bulletins.Count > 0 ? bulletins[0].Periode : 0;

var payload = new
{
    periode,
    generatedBy = "COBOL batch (GNU COBOL) \u2192 .NET 8 COMP-3 parser",
    employees,
    bulletins,
    cotisations,
    journal,
    rapport
};

var options = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    WriteIndented = true,
    DefaultIgnoreCondition = JsonIgnoreCondition.Never,
};

var outputPath = Path.Combine(outputDir, $"payroll-{periode}.json");
var json = JsonSerializer.Serialize(payload, options);
File.WriteAllText(outputPath, json);

var sizeKb = new FileInfo(outputPath).Length / 1024.0;
Console.WriteLine($"\n  Wrote {outputPath} ({sizeKb:F1} KB)");
Console.WriteLine("  Export complete.");
