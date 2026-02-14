#Requires -Modules Pester

<#
.SYNOPSIS
    Unit tests for UTCM-Management.ps1
.DESCRIPTION
    These tests mock all external dependencies (Microsoft Graph) and validate
    function logic, parameter validation, retry behavior, pagination, and error handling.
    No tenant connection required.
#>

BeforeAll {
    # Mock the Microsoft.Graph.Authentication module so #Requires doesn't fail
    if (-not (Get-Module -ListAvailable -Name Microsoft.Graph.Authentication)) {
        # Create a temporary empty module to satisfy the #Requires
        New-Module -Name Microsoft.Graph.Authentication -ScriptBlock {
            function Connect-MgGraph { }
            function Disconnect-MgGraph { }
            function Get-MgContext { return @{ TenantId = 'test-tenant'; Account = 'test@test.com' } }
            function Invoke-MgGraphRequest { }
            Export-ModuleMember -Function *
        } | Import-Module -Force
    }

    # Dot-source the script to load all functions
    . "$PSScriptRoot\..\UTCM-Management.ps1"
}

Describe 'Test-UTCMResourceType' {
    Context 'With verified resource types' {
        It 'Returns $true for a valid Entra ID type' {
            Test-UTCMResourceType -ResourceType 'microsoft.entra.authorizationpolicy' | Should -BeTrue
        }

        It 'Returns $true for a valid Exchange type' {
            Test-UTCMResourceType -ResourceType 'microsoft.exchange.transportrule' | Should -BeTrue
        }

        It 'Returns $true for a valid Teams type' {
            Test-UTCMResourceType -ResourceType 'microsoft.teams.meetingpolicy' | Should -BeTrue
        }

        It 'Returns $true for a valid Intune type' {
            Test-UTCMResourceType -ResourceType 'microsoft.intune.roledefinition' | Should -BeTrue
        }

        It 'Returns $true for a valid Security & Compliance type' {
            Test-UTCMResourceType -ResourceType 'microsoft.securityandcompliance.dlpcompliancepolicy' | Should -BeTrue
        }

        It 'Is case-insensitive' {
            Test-UTCMResourceType -ResourceType 'Microsoft.Entra.AuthorizationPolicy' | Should -BeTrue
        }

        It 'Trims whitespace' {
            Test-UTCMResourceType -ResourceType '  microsoft.entra.user  ' | Should -BeTrue
        }
    }

    Context 'With unverified resource types' {
        It 'Returns $false for an unknown type' {
            Test-UTCMResourceType -ResourceType 'microsoft.fake.nonexistent' 3>&1 | Out-Null
            Test-UTCMResourceType -ResourceType 'microsoft.fake.nonexistent' | Should -BeFalse
        }

        It 'Writes a warning for unverified types' {
            $warnings = Test-UTCMResourceType -ResourceType 'microsoft.fake.nonexistent' 3>&1
            $warnings | Should -Not -BeNullOrEmpty
        }

        It 'Throws in Strict mode for unverified types' {
            { Test-UTCMResourceType -ResourceType 'microsoft.fake.nonexistent' -Strict } | Should -Throw '*not in the verified list*'
        }
    }

    Context 'Verified types count' {
        It 'Has exactly 107 verified resource types' {
            $script:VerifiedResourceTypes.Count | Should -Be 107
        }

        It 'Contains types from all 5 workloads' {
            $script:VerifiedResourceTypes | Where-Object { $_ -like 'microsoft.entra.*' } | Should -Not -BeNullOrEmpty
            $script:VerifiedResourceTypes | Where-Object { $_ -like 'microsoft.exchange.*' } | Should -Not -BeNullOrEmpty
            $script:VerifiedResourceTypes | Where-Object { $_ -like 'microsoft.intune.*' } | Should -Not -BeNullOrEmpty
            $script:VerifiedResourceTypes | Where-Object { $_ -like 'microsoft.securityandcompliance.*' } | Should -Not -BeNullOrEmpty
            $script:VerifiedResourceTypes | Where-Object { $_ -like 'microsoft.teams.*' } | Should -Not -BeNullOrEmpty
        }
    }
}

Describe 'Invoke-UTCMGraphRequest' {
    BeforeEach {
        # Reset mock between tests
        Mock Invoke-MgGraphRequest { }
        # Reset call counters
        $script:mockCallCount = 0
    }

    Context 'Successful GET request' {
        It 'Returns the response for a simple GET' {
            Mock Invoke-MgGraphRequest {
                return [PSCustomObject]@{ id = 'test-123'; displayName = 'Test' }
            }

            $result = Invoke-UTCMGraphRequest -Uri 'beta/test' -NoPagination
            $result.id | Should -Be 'test-123'
        }

        It 'Passes correct parameters to Invoke-MgGraphRequest' {
            Mock Invoke-MgGraphRequest {
                return [PSCustomObject]@{ value = @() }
            }

            Invoke-UTCMGraphRequest -Uri 'beta/test/endpoint' -Method GET -NoPagination

            Should -Invoke Invoke-MgGraphRequest -Times 1 -ParameterFilter {
                $Uri -eq 'beta/test/endpoint' -and $Method -eq 'GET'
            }
        }
    }

    Context 'POST request with body' {
        It 'Sends body as JSON' {
            Mock Invoke-MgGraphRequest {
                return [PSCustomObject]@{ id = 'new-item' }
            }

            $body = @{ displayName = 'Test Item'; description = 'A test' }
            $result = Invoke-UTCMGraphRequest -Uri 'beta/test' -Method POST -Body $body

            Should -Invoke Invoke-MgGraphRequest -Times 1 -ParameterFilter {
                $Method -eq 'POST' -and $ContentType -eq 'application/json'
            }
        }
    }

    Context 'Automatic pagination' {
        It 'Follows @odata.nextLink and aggregates results' {
            # Use script-scoped counter so the mock can track calls
            $script:mockCallCount = 0
            Mock Invoke-MgGraphRequest {
                $script:mockCallCount++
                if ($script:mockCallCount -eq 1) {
                    return [PSCustomObject]@{
                        value = @(
                            [PSCustomObject]@{ id = '1' },
                            [PSCustomObject]@{ id = '2' }
                        )
                        '@odata.nextLink' = 'beta/test?$skiptoken=page2'
                    }
                } else {
                    return [PSCustomObject]@{
                        value = @(
                            [PSCustomObject]@{ id = '3' }
                        )
                    }
                }
            }

            $result = Invoke-UTCMGraphRequest -Uri 'beta/test'
            $result.value.Count | Should -Be 3
        }

        It 'Skips pagination when -NoPagination is set' {
            Mock Invoke-MgGraphRequest {
                return [PSCustomObject]@{
                    value = @([PSCustomObject]@{ id = '1' })
                    '@odata.nextLink' = 'beta/test?$skiptoken=page2'
                }
            }

            $result = Invoke-UTCMGraphRequest -Uri 'beta/test' -NoPagination

            # Should only be called once (no follow-up for nextLink)
            Should -Invoke Invoke-MgGraphRequest -Times 1
        }
    }

    Context 'Retry logic' {
        It 'Retries on HTTP 429 and succeeds' {
            $script:mockCallCount = 0
            Mock Invoke-MgGraphRequest {
                $script:mockCallCount++
                if ($script:mockCallCount -eq 1) {
                    throw "Response status code does not indicate success: 429"
                }
                return [PSCustomObject]@{ id = 'success' }
            }
            Mock Start-Sleep { }

            $result = Invoke-UTCMGraphRequest -Uri 'beta/test' -NoPagination -MaxRetries 3
            $result.id | Should -Be 'success'
        }

        It 'Retries on HTTP 503 and succeeds' {
            $script:mockCallCount = 0
            Mock Invoke-MgGraphRequest {
                $script:mockCallCount++
                if ($script:mockCallCount -eq 1) {
                    throw "Response status code does not indicate success: 503"
                }
                return [PSCustomObject]@{ id = 'recovered' }
            }
            Mock Start-Sleep { }

            $result = Invoke-UTCMGraphRequest -Uri 'beta/test' -NoPagination -MaxRetries 3
            $result.id | Should -Be 'recovered'
        }

        It 'Throws after exhausting retries' {
            Mock Invoke-MgGraphRequest {
                throw "Response status code does not indicate success: 429"
            }
            Mock Start-Sleep { }

            { Invoke-UTCMGraphRequest -Uri 'beta/test' -NoPagination -MaxRetries 2 } | Should -Throw
        }

        It 'Does not retry on HTTP 400' {
            Mock Invoke-MgGraphRequest {
                throw "Response status code does not indicate success: 400 BadRequest"
            }

            { Invoke-UTCMGraphRequest -Uri 'beta/test' -NoPagination } | Should -Throw
            Should -Invoke Invoke-MgGraphRequest -Times 1
        }

        It 'Does not retry on HTTP 404' {
            Mock Invoke-MgGraphRequest {
                throw "Response status code does not indicate success: 404 NotFound"
            }

            { Invoke-UTCMGraphRequest -Uri 'beta/test' -NoPagination } | Should -Throw
            Should -Invoke Invoke-MgGraphRequest -Times 1
        }
    }

    Context 'Error parsing' {
        It 'Extracts error code and message from Graph API JSON error' {
            Mock Invoke-MgGraphRequest {
                $errorDetails = @{
                    Message = '{"error":{"code":"Authorization_RequestDenied","message":"Insufficient privileges","innerError":{"request-id":"abc-123"}}}'
                }
                $ex = [System.Exception]::new("400 BadRequest")
                $record = [System.Management.Automation.ErrorRecord]::new($ex, 'GraphError', 'InvalidOperation', $null)
                $record | Add-Member -NotePropertyName ErrorDetails -NotePropertyValue ([PSCustomObject]$errorDetails) -Force
                throw $record
            }

            try {
                Invoke-UTCMGraphRequest -Uri 'beta/test' -NoPagination
            } catch {
                $_.Exception.Message | Should -BeLike '*Authorization_RequestDenied*'
            }
        }
    }
}

Describe 'New-UTCMMonitor' {
    BeforeAll {
        Mock Invoke-MgGraphRequest { }
    }

    Context 'Display name validation' {
        It 'Rejects display names shorter than 8 characters' {
            $result = New-UTCMMonitor -DisplayName 'Short' -BaselineSnapshotId 'test-id' 2>&1
            $result | Should -Not -BeNullOrEmpty
        }

        It 'Rejects display names longer than 32 characters' {
            $longName = 'A' * 33
            $result = New-UTCMMonitor -DisplayName $longName -BaselineSnapshotId 'test-id' 2>&1
            $result | Should -Not -BeNullOrEmpty
        }

        It 'Accepts display names between 8 and 32 characters' {
            # Mock the full chain: Get-UTCMSnapshot returns a snapshot, then baseline retrieval
            Mock Invoke-MgGraphRequest {
                param($Uri, $Method)
                if ($Uri -like '*configurationSnapshotJobs/*') {
                    return [PSCustomObject]@{
                        id = 'snap-1'
                        status = 'succeeded'
                        displayName = 'Test Snapshot'
                        resourceLocation = 'beta/admin/configurationManagement/snapshots/snap-1'
                    }
                }
                if ($Uri -like '*snapshots/snap-1') {
                    return [PSCustomObject]@{
                        displayName = 'Test Snapshot'
                        description = 'Test'
                        resources = @(@{ resourceType = 'microsoft.entra.user' })
                    }
                }
                if ($Uri -like '*configurationMonitors') {
                    return [PSCustomObject]@{ id = 'monitor-1'; displayName = 'Valid Monitor Name' }
                }
                return [PSCustomObject]@{ value = @() }
            }

            $result = New-UTCMMonitor -DisplayName 'Valid Monitor Name' -BaselineSnapshotId 'snap-1'
            $result | Should -Not -BeNullOrEmpty
        }
    }
}

Describe 'New-UTCMSnapshot' {
    Context 'Resource type validation' {
        BeforeAll {
            Mock Invoke-MgGraphRequest {
                return [PSCustomObject]@{ id = 'snap-new'; status = 'inProgress' }
            }
        }

        It 'Warns about unverified resource types' {
            $warnings = New-UTCMSnapshot -DisplayName 'Test Snapshot' -Resources @('microsoft.fake.type') 3>&1
            $warnings | Where-Object { $_ -is [System.Management.Automation.WarningRecord] } | Should -Not -BeNullOrEmpty
        }

        It 'Accepts verified resource types without warning' {
            $warnings = New-UTCMSnapshot -DisplayName 'Test Snapshot' -Resources @('microsoft.entra.user') 3>&1
            $warningRecords = $warnings | Where-Object { $_ -is [System.Management.Automation.WarningRecord] }
            $warningRecords | Should -BeNullOrEmpty
        }
    }

    Context 'ShouldProcess support' {
        It 'Supports -WhatIf without making API calls' {
            Mock Invoke-MgGraphRequest { }

            New-UTCMSnapshot -DisplayName 'WhatIf Test' -Resources @('microsoft.entra.user') -WhatIf

            Should -Invoke Invoke-MgGraphRequest -Times 0 -ParameterFilter {
                $Method -eq 'POST'
            }
        }
    }
}

Describe 'Remove-UTCMSnapshot' {
    Context 'ShouldProcess support' {
        It 'Supports -WhatIf without making API calls' {
            Mock Invoke-MgGraphRequest { }

            Remove-UTCMSnapshot -SnapshotId 'test-id' -WhatIf

            Should -Invoke Invoke-MgGraphRequest -Times 0
        }
    }
}

Describe 'Remove-UTCMMonitor' {
    Context 'ShouldProcess support' {
        It 'Supports -WhatIf without making API calls' {
            Mock Invoke-MgGraphRequest { }

            Remove-UTCMMonitor -MonitorId 'test-id' -WhatIf

            Should -Invoke Invoke-MgGraphRequest -Times 0
        }
    }
}

Describe 'Initialize-UTCMServicePrincipal' {
    Context 'When SP already exists' {
        It 'Returns existing SP without creating a new one' {
            Mock Invoke-MgGraphRequest {
                return [PSCustomObject]@{
                    value = @([PSCustomObject]@{ id = 'existing-sp'; appId = '03b07b79-c5bc-4b5e-9bfa-13acf4a99998' })
                }
            }

            $result = Initialize-UTCMServicePrincipal
            $result.id | Should -Be 'existing-sp'

            # Should not have been called with POST
            Should -Invoke Invoke-MgGraphRequest -Times 0 -ParameterFilter {
                $Method -eq 'POST'
            }
        }
    }

    Context 'ShouldProcess support' {
        It 'Supports -WhatIf without creating SP' {
            Mock Invoke-MgGraphRequest {
                return [PSCustomObject]@{ value = @() }
            }

            Initialize-UTCMServicePrincipal -WhatIf

            Should -Invoke Invoke-MgGraphRequest -Times 0 -ParameterFilter {
                $Method -eq 'POST'
            }
        }
    }
}

Describe 'Get-UTCMSnapshot' {
    Context 'List all snapshots' {
        It 'Returns all snapshots' {
            Mock Invoke-MgGraphRequest {
                return [PSCustomObject]@{
                    value = @(
                        [PSCustomObject]@{ id = 'snap-1'; displayName = 'Snap 1' },
                        [PSCustomObject]@{ id = 'snap-2'; displayName = 'Snap 2' }
                    )
                }
            }

            $result = Get-UTCMSnapshot
            $result.Count | Should -Be 2
        }
    }

    Context 'Get specific snapshot' {
        It 'Returns a single snapshot by ID' {
            Mock Invoke-MgGraphRequest {
                return [PSCustomObject]@{ id = 'snap-1'; displayName = 'Snap 1'; status = 'succeeded' }
            }

            $result = Get-UTCMSnapshot -SnapshotId 'snap-1'
            $result.id | Should -Be 'snap-1'
        }
    }
}

Describe 'Get-UTCMMonitor' {
    Context 'List all monitors' {
        It 'Returns all monitors' {
            Mock Invoke-MgGraphRequest {
                return [PSCustomObject]@{
                    value = @(
                        [PSCustomObject]@{ id = 'mon-1'; displayName = 'Monitor 1' },
                        [PSCustomObject]@{ id = 'mon-2'; displayName = 'Monitor 2' }
                    )
                }
            }

            $result = Get-UTCMMonitor
            $result.Count | Should -Be 2
        }
    }

    Context 'Get by display name' {
        It 'Filters monitors by display name' {
            Mock Invoke-MgGraphRequest {
                return [PSCustomObject]@{
                    value = @([PSCustomObject]@{ id = 'mon-1'; displayName = 'My Monitor' })
                }
            }

            $result = Get-UTCMMonitor -DisplayName 'My Monitor'
            $result.Count | Should -Be 1

            Should -Invoke Invoke-MgGraphRequest -ParameterFilter {
                $Uri -like "*displayName eq 'My Monitor'*"
            }
        }
    }
}

Describe 'Get-UTCMDrift' {
    Context 'Filter by status' {
        It 'Builds correct filter for Active drifts' {
            Mock Invoke-MgGraphRequest {
                return [PSCustomObject]@{ value = @() }
            }

            Get-UTCMDrift -Status Active

            Should -Invoke Invoke-MgGraphRequest -ParameterFilter {
                $Uri -like "*status eq 'active'*"
            }
        }

        It 'Builds correct filter for monitor ID and status' {
            Mock Invoke-MgGraphRequest {
                return [PSCustomObject]@{ value = @() }
            }

            Get-UTCMDrift -MonitorId 'mon-1' -Status Resolved

            Should -Invoke Invoke-MgGraphRequest -ParameterFilter {
                $Uri -like "*monitorId eq 'mon-1'*" -and $Uri -like "*status eq 'resolved'*"
            }
        }
    }
}

Describe 'Script constants' {
    It 'Has correct UTCM App ID' {
        $script:UTCMAppId | Should -Be '03b07b79-c5bc-4b5e-9bfa-13acf4a99998'
    }

    It 'Has correct Graph App ID' {
        $script:GraphAppId | Should -Be '00000003-0000-0000-c000-000000000000'
    }
}
