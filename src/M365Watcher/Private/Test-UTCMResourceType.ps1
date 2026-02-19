<#
.SYNOPSIS
    Validates a resource type against the list of verified working types
.PARAMETER ResourceType
    The resource type string to validate
.PARAMETER Strict
    If set, throws an error for unverified types instead of returning $false
#>
function Test-UTCMResourceType {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ResourceType,

        [Parameter(Mandatory = $false)]
        [switch]$Strict
    )

    $normalized = $ResourceType.Trim().ToLower()
    if ($normalized -in $script:VerifiedResourceTypes) {
        return $true
    }

    if ($Strict) {
        throw "Resource type '$ResourceType' is not in the verified list. Use Get-UTCMResourceTypes to see supported types."
    }

    Write-Warning "Resource type '$ResourceType' is not in the verified list (107 confirmed types). It may not be supported by the API."
    return $false
}
