<#
.SYNOPSIS
    Connects to Microsoft Graph with required UTCM permissions
#>
function Connect-UTCM {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $false)]
        [string]$TenantId,

        [Parameter(Mandatory = $false)]
        [string[]]$Scopes = @('ConfigurationMonitoring.ReadWrite.All')
    )

    try {
        Write-Host "Connecting to Microsoft Graph..." -ForegroundColor Cyan

        if ($TenantId) {
            Connect-MgGraph -Scopes $Scopes -TenantId $TenantId -NoWelcome
        } else {
            Connect-MgGraph -Scopes $Scopes -NoWelcome
        }

        $context = Get-MgContext
        Write-Host "Successfully connected to tenant: $($context.TenantId)" -ForegroundColor Green
        Write-Host "Account: $($context.Account)" -ForegroundColor Green

        return $true
    }
    catch {
        Write-Error "Failed to connect to Microsoft Graph: $_"
        return $false
    }
}
