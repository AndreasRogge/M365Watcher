<#
.SYNOPSIS
    Central API wrapper with retry logic, pagination, and structured error handling
.DESCRIPTION
    Wraps Invoke-MgGraphRequest with exponential backoff retry for 429/503/504,
    automatic @odata.nextLink pagination for GET requests, and structured error parsing.
.PARAMETER Uri
    The Graph API URI (relative or absolute)
.PARAMETER Method
    HTTP method (GET, POST, PATCH, DELETE). Default: GET
.PARAMETER Body
    Request body hashtable for POST/PATCH
.PARAMETER MaxRetries
    Maximum retry attempts for retryable errors. Default: 3
.PARAMETER NoPagination
    Skip automatic pagination (use for single-item GETs)
#>
function Invoke-UTCMGraphRequest {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Uri,

        [Parameter(Mandatory = $false)]
        [ValidateSet('GET','POST','PATCH','DELETE')]
        [string]$Method = 'GET',

        [Parameter(Mandatory = $false)]
        [hashtable]$Body,

        [Parameter(Mandatory = $false)]
        [int]$MaxRetries = 3,

        [Parameter(Mandatory = $false)]
        [switch]$NoPagination
    )

    $attempt = 0
    $lastError = $null

    while ($attempt -le $MaxRetries) {
        try {
            $params = @{
                Uri        = $Uri
                Method     = $Method
                OutputType = 'PSObject'
            }
            if ($Body) {
                $params['Body'] = ($Body | ConvertTo-Json -Depth 20)
                $params['ContentType'] = 'application/json'
            }

            $response = Invoke-MgGraphRequest @params

            # Handle pagination for GET list requests
            if ($Method -eq 'GET' -and -not $NoPagination -and $response.value -is [System.Collections.IEnumerable]) {
                $allItems = [System.Collections.ArrayList]::new()
                $allItems.AddRange(@($response.value))

                while ($response.'@odata.nextLink') {
                    $response = Invoke-MgGraphRequest -Uri $response.'@odata.nextLink' -Method GET -OutputType PSObject
                    if ($response.value) {
                        $allItems.AddRange(@($response.value))
                    }
                }

                # Return object with .value for consistent interface
                return [PSCustomObject]@{ value = $allItems }
            }

            return $response
        }
        catch {
            $lastError = $_
            $statusCode = 0
            $errorCode = ''
            $errorMessage = ''
            $requestId = ''

            # Parse structured error from Graph API response
            $errText = $_.Exception.Message
            if ($_.ErrorDetails.Message) {
                $errText = $_.ErrorDetails.Message
            }

            # Try to extract JSON error details
            try {
                $errJson = $null
                if ($errText -match '\{.*"error".*\}') {
                    $errJson = $Matches[0] | ConvertFrom-Json
                }
                if ($errJson.error) {
                    $errorCode = $errJson.error.code
                    $errorMessage = $errJson.error.message
                    if ($errJson.error.innerError.'request-id') {
                        $requestId = $errJson.error.innerError.'request-id'
                    }
                }
            } catch { }

            # Extract HTTP status code
            if ($errText -match '(\d{3})') {
                $statusCode = [int]$Matches[1]
            }

            # Retry on throttling (429) or service errors (503, 504)
            if ($statusCode -in @(429, 503, 504) -and $attempt -lt $MaxRetries) {
                $attempt++
                $waitSeconds = [math]::Pow(2, $attempt)

                # Honor Retry-After header if present
                if ($errText -match 'Retry-After[:\s]+(\d+)') {
                    $waitSeconds = [int]$Matches[1]
                }

                Write-Warning "Request throttled/failed (HTTP $statusCode). Retrying in ${waitSeconds}s (attempt $attempt/$MaxRetries)..."
                Start-Sleep -Seconds $waitSeconds
                continue
            }

            # Build informative error message
            $friendlyMessage = if ($errorMessage) {
                "Graph API Error [$errorCode]: $errorMessage"
            } else {
                "Graph API Error: $errText"
            }
            if ($requestId) {
                $friendlyMessage += " (Request ID: $requestId)"
            }

            throw $friendlyMessage
        }
    }

    # All retries exhausted
    throw "Request failed after $MaxRetries retries. Last error: $($lastError.Exception.Message)"
}
