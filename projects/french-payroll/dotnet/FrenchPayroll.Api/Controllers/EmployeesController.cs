using FrenchPayroll.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FrenchPayroll.Api.Controllers;

[ApiController]
[Route("api/employees")]
public sealed class EmployeesController : ControllerBase
{
    private readonly PayrollDataService _data;

    public EmployeesController(PayrollDataService data) => _data = data;

    [HttpGet]
    public IActionResult GetAll() => Ok(_data.GetEmployees());

    [HttpGet("{matricule}")]
    public IActionResult GetByMatricule(string matricule)
    {
        var employee = _data.GetEmployee(matricule);
        return employee is null
            ? Problem(title: "Employé non trouvé", detail: $"Matricule {matricule} introuvable", statusCode: 404)
            : Ok(employee);
    }
}
