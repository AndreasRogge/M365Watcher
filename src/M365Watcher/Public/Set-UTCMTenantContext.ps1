<#
.SYNOPSIS
    Switches the active tenant context for UTCM operations.
.DESCRIPTION
    Changes the active tenant to the specified tenant ID. The tenant must have
    been previously connected via Connect-UTCM. All subsequent UTCM operations
    will target this tenant.
.PARAMETER TenantId
    The Azure AD tenant ID to switch to. Must be a previously connected tenant.
.EXAMPLE
    Set-UTCMTenantContext -TenantId "contoso.onmicrosoft.com-tenant-id"
    Switches the active tenant context.
#>
function Set-UTCMTenantContext {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$TenantId
    )

    Set-UTCMActiveTenantInternal -TenantId $TenantId

    $tenant = (Get-UTCMAllTenants)[$TenantId]
    Write-Host "Active tenant set to: $($tenant.DisplayName) ($TenantId)" -ForegroundColor Green
}
