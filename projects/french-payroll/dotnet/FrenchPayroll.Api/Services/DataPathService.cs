namespace FrenchPayroll.Api.Services;

/// <summary>
/// Resolves paths to COBOL data files and binaries.
/// </summary>
public sealed class DataPathService
{
    public string DataDir { get; }
    public string CobolBinDir { get; }

    public DataPathService(IConfiguration config)
    {
        var projectRoot = config["FrenchPayroll:ProjectRoot"]
            ?? Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".."));

        DataDir = Path.Combine(projectRoot, "data");
        CobolBinDir = Path.Combine(projectRoot, "cobol", "bin");
    }

    public string EmployeesFile => Path.Combine(DataDir, "EMPLOYEES-SEQ.dat");
    public string BulletinsFile => Path.Combine(DataDir, "BULLETINS.dat");
    public string CotisationsFile => Path.Combine(DataDir, "COTISATIONS-PATRONALES.dat");
    public string JournalFile => Path.Combine(DataDir, "JOURNAL-PCG.dat");
    public string RapportFile => Path.Combine(DataDir, "RAPPORT-MASSE.dat");
    public string VariablesFile => Path.Combine(DataDir, "VARIABLES-PAIE.dat");
    public string EmployeesIdxFile => Path.Combine(DataDir, "EMPLOYEES.dat");
    public string SortedFile => Path.Combine(DataDir, "EMPLOYEES-SORTED.dat");
    public string BulletinTxtFile => Path.Combine(DataDir, "BULLETINS-TXT.dat");
}
