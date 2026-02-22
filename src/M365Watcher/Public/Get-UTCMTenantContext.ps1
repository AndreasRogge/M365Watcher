<#
.SYNOPSIS
    Returns information about all connected tenants and the active tenant.
.DESCRIPTION
    Lists all tenant sessions registered via Connect-UTCM, showing which
    tenant is currently active. The active tenant is used by default for
    all UTCM operations.
.EXAMPLE
    Get-UTCMTenantContext
    Returns a list of connected tenants with their connection details.
#>
function Get-UTCMTenantContext {
    [CmdletBinding()]
    param()

    $tenants = Get-UTCMAllTenants
    $activeTenantId = Get-UTCMActiveTenantId

    if ($tenants.Count -eq 0) {
        Write-Host "No tenants connected. Use Connect-UTCM to connect." -ForegroundColor Yellow
        return @()
    }

    $tenants.Values | ForEach-Object {
        [PSCustomObject]@{
            TenantId    = $_.TenantId
            DisplayName = $_.DisplayName
            Account     = $_.Account
            IsActive    = ($_.TenantId -eq $activeTenantId)
            ConnectedAt = $_.ConnectedAt
        }
    }
}
