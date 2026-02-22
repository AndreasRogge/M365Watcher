<#
.SYNOPSIS
    Module-scope tenant context management for multi-tenant operations.
.DESCRIPTION
    Maintains a registry of connected tenant sessions and tracks the currently
    active tenant. All UTCM operations use the active tenant context by default.
#>

# Module-scope storage for connected tenants and active tenant
$script:UTCMTenants = @{}
$script:ActiveTenantId = $null

function Register-UTCMTenantConnection {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$TenantId,

        [Parameter(Mandatory = $false)]
        [string]$Account,

        [Parameter(Mandatory = $false)]
        [string]$DisplayName
    )

    $script:UTCMTenants[$TenantId] = @{
        TenantId    = $TenantId
        Account     = $Account
        DisplayName = if ($DisplayName) { $DisplayName } else { $TenantId }
        ConnectedAt = Get-Date
    }
}

function Set-UTCMActiveTenantInternal {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$TenantId
    )

    if (-not $script:UTCMTenants.ContainsKey($TenantId)) {
        throw "Tenant '$TenantId' is not registered. Use Connect-UTCM -TenantId '$TenantId' to connect first."
    }
    $script:ActiveTenantId = $TenantId
}

function Get-UTCMActiveTenantId {
    [CmdletBinding()]
    param()

    return $script:ActiveTenantId
}

function Get-UTCMAllTenants {
    [CmdletBinding()]
    param()

    return $script:UTCMTenants
}
