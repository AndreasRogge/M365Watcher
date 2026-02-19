<#
.SYNOPSIS
    Grants permissions to the UTCM service principal
#>
function Grant-UTCMPermissions {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Permissions
    )

    try {
        Write-Host "Granting permissions to UTCM service principal..." -ForegroundColor Cyan

        # Get Graph service principal
        $graphUri = "v1.0/servicePrincipals?`$filter=appId eq '$script:GraphAppId'"
        $graphResult = Invoke-UTCMGraphRequest -Uri $graphUri -Method GET -NoPagination
        $graph = $graphResult.value

        if (-not $graph) {
            throw "Microsoft Graph service principal not found"
        }

        # Get UTCM service principal
        $utcmUri = "v1.0/servicePrincipals?`$filter=appId eq '$script:UTCMAppId'"
        $utcmResult = Invoke-UTCMGraphRequest -Uri $utcmUri -Method GET -NoPagination
        $utcm = $utcmResult.value

        if (-not $utcm) {
            throw "UTCM service principal not found. Run Initialize-UTCMServicePrincipal first."
        }

        foreach ($permission in $Permissions) {
            Write-Host "  Granting permission: $permission" -ForegroundColor Cyan

            # Find the app role
            $appRole = $graph.appRoles | Where-Object { $_.value -eq $permission }

            if (-not $appRole) {
                Write-Warning "Permission '$permission' not found in Graph API"
                continue
            }

            # Check if permission already granted
            $existingUri = "v1.0/servicePrincipals/$($utcm.id)/appRoleAssignments"
            $existing = Invoke-UTCMGraphRequest -Uri $existingUri -Method GET

            # Filter in PowerShell since appRoleId doesn't support OData filters
            $alreadyGranted = $existing.value | Where-Object { $_.appRoleId -eq $appRole.id }

            if ($alreadyGranted) {
                Write-Host "    Permission already granted" -ForegroundColor Yellow
                continue
            }

            # Grant the permission
            $body = @{
                appRoleId = $appRole.id
                resourceId = $graph.id
                principalId = $utcm.id
            }

            $assignUri = "v1.0/servicePrincipals/$($utcm.id)/appRoleAssignments"
            if ($PSCmdlet.ShouldProcess("Permission '$permission'", "Grant to UTCM SP")) {
                Invoke-UTCMGraphRequest -Uri $assignUri -Method POST -Body $body | Out-Null
            } else { continue }

            Write-Host "    Permission granted successfully" -ForegroundColor Green
        }

        Write-Host "`nAll permissions granted successfully!" -ForegroundColor Green
    }
    catch {
        Write-Error "Failed to grant permissions: $_"
    }
}
