using System.Collections.Concurrent;
using System.Diagnostics;
using FrenchPayroll.Core.Models;

namespace FrenchPayroll.Api.Services;

/// <summary>
/// Orchestrates COBOL program execution via Process.Start.
/// Manages async job status for payroll runs.
/// </summary>
public sealed class CobolProcessService
{
    private readonly DataPathService _paths;
    private readonly ILogger<CobolProcessService> _logger;
    private readonly ConcurrentDictionary<string, PayrollJobStatus> _jobs = new();

    public CobolProcessService(DataPathService paths, ILogger<CobolProcessService> logger)
    {
        _paths = paths;
        _logger = logger;
    }

    public PayrollJobStatus? GetJobStatus(string jobId)
        => _jobs.TryGetValue(jobId, out var job) ? job : null;

    public string StartPayrollRun(int periode)
    {
        var jobId = Guid.NewGuid().ToString("N")[..12];
        var job = new PayrollJobStatus
        {
            JobId = jobId,
            Status = "queued",
            Periode = periode,
            StartedAt = DateTime.UtcNow
        };
        _jobs[jobId] = job;

        _ = Task.Run(() => RunPayrollAsync(job));
        return jobId;
    }

    public string StartSort()
    {
        var jobId = Guid.NewGuid().ToString("N")[..12];
        var job = new PayrollJobStatus
        {
            JobId = jobId,
            Status = "queued",
            StartedAt = DateTime.UtcNow
        };
        _jobs[jobId] = job;

        _ = Task.Run(() => RunSortAsync(job));
        return jobId;
    }

    private async Task RunPayrollAsync(PayrollJobStatus job)
    {
        job.Status = "running";
        try
        {
            var env = new Dictionary<string, string>
            {
                ["EMPLOYEE_FILE"] = _paths.EmployeesIdxFile,
                ["VARIABLES_FILE"] = _paths.VariablesFile,
                ["BULLETINS_FILE"] = _paths.BulletinsFile,
                ["COTISATIONS_FILE"] = _paths.CotisationsFile,
                ["JOURNAL_FILE"] = _paths.JournalFile,
                ["RAPPORT_FILE"] = _paths.RapportFile,
                ["BULLETIN_TXT_FILE"] = _paths.BulletinTxtFile,
            };

            // Run CALC-PAIE
            await RunCobolProgram("CALC-PAIE", env, job);
            if (job.Status == "error") return;

            // Run CALC-JOURNAL
            await RunCobolProgram("CALC-JOURNAL", env, job);
            if (job.Status == "error") return;

            // Run GENERATE-BULLETIN-TXT
            await RunCobolProgram("GENERATE-BULLETIN-TXT", env, job);
            if (job.Status == "error") return;

            // Run REPORT-MASSE-SALARIALE
            await RunCobolProgram("REPORT-MASSE-SALARIALE", env, job);
            if (job.Status == "error") return;

            job.Status = "done";
            job.CompletedAt = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            job.Status = "error";
            job.OutputLines.Add($"EXCEPTION: {ex.Message}");
            job.CompletedAt = DateTime.UtcNow;
            _logger.LogError(ex, "Payroll run {JobId} failed", job.JobId);
        }
    }

    private async Task RunSortAsync(PayrollJobStatus job)
    {
        job.Status = "running";
        try
        {
            var env = new Dictionary<string, string>
            {
                ["EMPLOYEE_FILE"] = _paths.EmployeesIdxFile,
                ["SORTED_FILE"] = _paths.SortedFile,
            };
            await RunCobolProgram("SORT-EMPLOYEES", env, job);
            job.Status = job.Status == "error" ? "error" : "done";
            job.CompletedAt = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            job.Status = "error";
            job.OutputLines.Add($"EXCEPTION: {ex.Message}");
            job.CompletedAt = DateTime.UtcNow;
        }
    }

    private async Task RunCobolProgram(string programName, Dictionary<string, string> env, PayrollJobStatus job)
    {
        var exePath = Path.Combine(_paths.CobolBinDir, programName);
        if (!File.Exists(exePath))
        {
            job.OutputLines.Add($"{programName}|ERROR|0|BINARY-NOT-FOUND");
            job.Status = "error";
            job.Errors++;
            return;
        }

        var psi = new ProcessStartInfo
        {
            FileName = exePath,
            WorkingDirectory = _paths.CobolBinDir,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        foreach (var (key, value) in env)
            psi.Environment[key] = value;

        using var process = Process.Start(psi);
        if (process == null)
        {
            job.OutputLines.Add($"{programName}|ERROR|0|PROCESS-START-FAILED");
            job.Status = "error";
            return;
        }

        while (!process.StandardOutput.EndOfStream)
        {
            var line = await process.StandardOutput.ReadLineAsync();
            if (line != null)
            {
                job.OutputLines.Add(line);
                _logger.LogInformation("[{Program}] {Line}", programName, line);
                ParseStatusLine(line, job);
            }
        }

        await process.WaitForExitAsync();

        if (process.ExitCode != 0)
        {
            var stderr = await process.StandardError.ReadToEndAsync();
            if (!string.IsNullOrWhiteSpace(stderr))
                job.OutputLines.Add($"{programName}|STDERR|{stderr.Trim()}");
            job.Status = "error";
        }
    }

    private static void ParseStatusLine(string line, PayrollJobStatus job)
    {
        // Format: PROGRAM-NAME|STATUS|RECORDS-PROCESSED|ERRORS
        var parts = line.Split('|');
        if (parts.Length >= 4)
        {
            if (int.TryParse(parts[2], out var records))
                job.RecordsProcessed = records;
            if (int.TryParse(parts[3], out var errors))
                job.Errors = errors;
        }
    }
}
