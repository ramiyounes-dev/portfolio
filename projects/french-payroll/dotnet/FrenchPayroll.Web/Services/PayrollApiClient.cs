using System.Net.Http.Json;
using FrenchPayroll.Core.Models;

namespace FrenchPayroll.Web.Services;

/// <summary>
/// Typed HTTP client consuming the FrenchPayroll REST API.
/// </summary>
public sealed class PayrollApiClient
{
    private readonly HttpClient _http;

    public PayrollApiClient(HttpClient http) => _http = http;

    public Task<List<Employee>?> GetEmployeesAsync()
        => _http.GetFromJsonAsync<List<Employee>>("api/employees");

    public Task<Employee?> GetEmployeeAsync(string matricule)
        => _http.GetFromJsonAsync<Employee>($"api/employees/{matricule}");

    public Task<List<BulletinDePaie>?> GetBulletinsAsync(int periode)
        => _http.GetFromJsonAsync<List<BulletinDePaie>>($"api/bulletins/{periode}");

    public Task<BulletinDePaie?> GetBulletinAsync(int periode, string matricule)
        => _http.GetFromJsonAsync<BulletinDePaie>($"api/bulletins/{periode}/{matricule}");

    public Task<List<CotisationPatronale>?> GetCotisationsAsync(int periode)
        => _http.GetFromJsonAsync<List<CotisationPatronale>>($"api/cotisations/{periode}");

    public Task<JournalResponse?> GetJournalAsync(int periode)
        => _http.GetFromJsonAsync<JournalResponse>($"api/journal/{periode}");

    public Task<List<RapportMasse>?> GetRapportMasseAsync()
        => _http.GetFromJsonAsync<List<RapportMasse>>("api/rapport/masse-salariale");

    public async Task<PayrollRunResponse?> RunPayrollAsync(int periode)
    {
        var response = await _http.PostAsync($"api/paie/run/{periode}", null);
        return await response.Content.ReadFromJsonAsync<PayrollRunResponse>();
    }

    public Task<PayrollJobStatus?> GetJobStatusAsync(string jobId)
        => _http.GetFromJsonAsync<PayrollJobStatus>($"api/paie/status/{jobId}");
}

public sealed class JournalResponse
{
    public List<JournalEntry> Entries { get; set; } = [];
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public bool IsBalanced { get; set; }
}

public sealed class PayrollRunResponse
{
    public string JobId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}
