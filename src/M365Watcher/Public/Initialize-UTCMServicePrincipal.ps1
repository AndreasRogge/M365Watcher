<#
.SYNOPSIS
    Creates the UTCM service principal in the tenant
#>
function Initialize-UTCMServicePrincipal {
    [CmdletBinding(SupportsShouldProcess)]
    param()

    try {
        Write-Host "Checking if UTCM service principal exists..." -ForegroundColor Cyan

        # Check if service principal already exists
        $uri = "v1.0/servicePrincipals?`$filter=appId eq '$script:UTCMAppId'"
        $existingSP = Invoke-UTCMGraphRequest -Uri $uri -Method GET -NoPagination

        if ($existingSP.value.Count -gt 0) {
            Write-Host "UTCM service principal already exists." -ForegroundColor Yellow
            Write-Host "Object ID: $($existingSP.value[0].id)" -ForegroundColor Green
            return $existingSP.value[0]
        }

        Write-Host "Creating UTCM service principal..." -ForegroundColor Cyan

        $body = @{
            appId = $script:UTCMAppId
        }

        if (-not $PSCmdlet.ShouldProcess("UTCM Service Principal", "Create")) { return $null }
        $newSP = Invoke-UTCMGraphRequest -Uri "v1.0/servicePrincipals" -Method POST -Body $body

        Write-Host "UTCM service principal created successfully!" -ForegroundColor Green
        Write-Host "Display Name: $($newSP.displayName)" -ForegroundColor Green
        Write-Host "Object ID: $($newSP.id)" -ForegroundColor Green
        Write-Host "App ID: $($newSP.appId)" -ForegroundColor Green

        return $newSP
    }
    catch {
        Write-Error "Failed to create UTCM service principal: $_"
        return $null
    }
}
