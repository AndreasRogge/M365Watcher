<#
.SYNOPSIS
    Connects to Microsoft Graph with required UTCM permissions.
.DESCRIPTION
    Establishes a connection to Microsoft Graph for the specified tenant (or the
    default tenant). Registers the connection in the multi-tenant context so you
    can connect to multiple tenants and switch between them.
.PARAMETER TenantId
    The Azure AD tenant ID to connect to. If omitted, connects to the default tenant.
.PARAMETER Scopes
    The Graph API scopes to request. Defaults to ConfigurationMonitoring.ReadWrite.All.
.PARAMETER DisplayName
    A friendly name for this tenant connection. Defaults to the tenant ID.
.PARAMETER SetActive
    If specified, sets this tenant as the active tenant even if another is already active.
.EXAMPLE
    Connect-UTCM
    Connects to the default tenant with UTCM permissions.
.EXAMPLE
    Connect-UTCM -TenantId "contoso-tenant-id" -DisplayName "Contoso Production"
    Connects to a specific tenant and registers it with a friendly name.
.EXAMPLE
    Connect-UTCM -TenantId "fabrikam-tenant-id" -DisplayName "Fabrikam" -SetActive
    Connects to Fabrikam and sets it as the active tenant for subsequent operations.
#>
function Connect-UTCM {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $false)]
        [ValidatePattern('^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')]
        [string]$TenantId,

        [Parameter(Mandatory = $false)]
        [string[]]$Scopes = @('ConfigurationMonitoring.ReadWrite.All'),

        [Parameter(Mandatory = $false)]
        [string]$DisplayName,

        [Parameter(Mandatory = $false)]
        [switch]$SetActive
    )

    try {
        Write-Host "Connecting to Microsoft Graph..." -ForegroundColor Cyan

        if ($TenantId) {
            Connect-MgGraph -Scopes $Scopes -TenantId $TenantId -NoWelcome
        } else {
            Connect-MgGraph -Scopes $Scopes -NoWelcome
        }

        $context = Get-MgContext
        $connectedTenantId = $context.TenantId

        Write-Host "Successfully connected to tenant: $connectedTenantId" -ForegroundColor Green
        Write-Host "Account: $($context.Account)" -ForegroundColor Green

        # Register this connection in the multi-tenant context
        Register-UTCMTenantConnection `
            -TenantId $connectedTenantId `
            -Account $context.Account `
            -DisplayName $(if ($DisplayName) { $DisplayName } else { $connectedTenantId })

        # Set as active if it's the first connection or -SetActive was specified
        $currentActive = Get-UTCMActiveTenantId
        if (-not $currentActive -or $SetActive) {
            Set-UTCMActiveTenantInternal -TenantId $connectedTenantId
            Write-Host "Active tenant: $connectedTenantId" -ForegroundColor Green
        }

        return $true
    }
    catch {
        Write-Error "Failed to connect to Microsoft Graph: $_"
        return $false
    }
}
