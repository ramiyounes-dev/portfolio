using FrenchPayroll.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FrenchPayroll.Api.Controllers;

[ApiController]
[Route("api/bulletins")]
public sealed class BulletinsController : ControllerBase
{
    private readonly PayrollDataService _data;

    public BulletinsController(PayrollDataService data) => _data = data;

    [HttpGet("{periode:int}")]
    public IActionResult GetByPeriode(int periode) => Ok(_data.GetBulletins(periode));

    [HttpGet("{periode:int}/{matricule}")]
    public IActionResult GetOne(int periode, string matricule)
    {
        var bulletin = _data.GetBulletin(periode, matricule);
        return bulletin is null
            ? Problem(title: "Bulletin non trouvé", detail: $"Aucun bulletin pour {matricule} en {periode}", statusCode: 404)
            : Ok(bulletin);
    }
}
