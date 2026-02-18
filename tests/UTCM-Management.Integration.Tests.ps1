#Requires -Modules Pester, Microsoft.Graph.Authentication

<#
.SYNOPSIS
    Integration tests for UTCM-Management.ps1 against a real tenant
.DESCRIPTION
    These tests run against an actual Microsoft 365 tenant with UTCM enabled.
    They validate real API calls for snapshots, monitors, and drift operations.

    Required environment variables:
        AZURE_TENANT_ID     - Tenant ID for authentication
        AZURE_CLIENT_ID     - App Registration client ID
        AZURE_CLIENT_SECRET - App Registration client secret

    Required permissions on the App Registration:
        - ConfigurationMonitoring.ReadWrite.All (Application)
.NOTES
    These tests create and clean up their own resources.
    Tag: Integration
#>

BeforeAll {
    # Dot-source the script
    . "$PSScriptRoot\..\UTCM-Management.ps1"

    # Authenticate using client credentials
    $tenantId = $env:AZURE_TENANT_ID
    $clientId = $env:AZURE_CLIENT_ID
    $clientSecret = $env:AZURE_CLIENT_SECRET

    if (-not $tenantId -or -not $clientId -or -not $clientSecret) {
        throw "Missing required environment variables: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET"
    }

    $secureSecret = ConvertTo-SecureString $clientSecret -AsPlainText -Force
    $credential = [System.Management.Automation.PSCredential]::new($clientId, $secureSecret)

    Connect-MgGraph -TenantId $tenantId -ClientSecretCredential $credential -NoWelcome

    # Track resources created during tests for cleanup
    $script:TestSnapshotIds = [System.Collections.ArrayList]::new()
    $script:TestMonitorIds = [System.Collections.ArrayList]::new()
}

AfterAll {
    # Cleanup: remove all test resources
    foreach ($monitorId in $script:TestMonitorIds) {
        try {
            Remove-UTCMMonitor -MonitorId $monitorId -Confirm:$false -ErrorAction SilentlyContinue
        } catch { }
    }

    foreach ($snapshotId in $script:TestSnapshotIds) {
        try {
            Remove-UTCMSnapshot -SnapshotId $snapshotId -Confirm:$false -ErrorAction SilentlyContinue
        } catch { }
    }

    Disconnect-MgGraph -ErrorAction SilentlyContinue
}

Describe 'UTCM Availability' -Tag 'Integration' {
    It 'Confirms UTCM is available in the test tenant' {
        $result = Test-UTCMAvailability
        $result | Should -BeTrue
    }
}

Describe 'Snapshot Lifecycle' -Tag 'Integration' {
    It 'Creates a snapshot with a verified resource type' {
        $displayName = "PesterTest $(Get-Date -Format 'yyyyMMdd HHmmss')"
        $snapshot = New-UTCMSnapshot `
            -DisplayName $displayName `
            -Description 'Pester integration test' `
            -Resources @('microsoft.entra.authorizationpolicy')

        $snapshot | Should -Not -BeNullOrEmpty
        $snapshot.id | Should -Not -BeNullOrEmpty
        $script:TestSnapshotIds.Add($snapshot.id) | Out-Null

        # Store for later tests
        $script:TestSnapshotId = $snapshot.id
        $script:TestSnapshotDisplayName = $displayName
    }

    It 'Lists snapshots and finds the test snapshot' {
        $snapshots = Get-UTCMSnapshot
        $snapshots | Should -Not -BeNullOrEmpty
        $found = $snapshots | Where-Object { $_.id -eq $script:TestSnapshotId }
        $found | Should -Not -BeNullOrEmpty
    }

    It 'Retrieves the test snapshot by ID' {
        $snapshot = Get-UTCMSnapshot -SnapshotId $script:TestSnapshotId
        $snapshot | Should -Not -BeNullOrEmpty
        $snapshot.id | Should -Be $script:TestSnapshotId
    }

    It 'Waits for snapshot to complete (max 60s)' {
        $maxWait = 60
        $elapsed = 0
        $status = ''

        while ($elapsed -lt $maxWait) {
            $snapshot = Get-UTCMSnapshot -SnapshotId $script:TestSnapshotId
            $status = $snapshot.status

            if ($status -eq 'succeeded' -or $status -eq 'failed') {
                break
            }

            Start-Sleep -Seconds 5
            $elapsed += 5
        }

        $status | Should -Be 'succeeded'
    }
}

Describe 'Monitor Lifecycle' -Tag 'Integration' {
    It 'Creates a monitor from the test snapshot' {
        # Ensure snapshot completed
        $snapshot = Get-UTCMSnapshot -SnapshotId $script:TestSnapshotId
        if ($snapshot.status -ne 'succeeded') {
            Set-ItResult -Skipped -Because 'Snapshot did not complete successfully'
            return
        }

        $monitorName = "PesterMon $(Get-Date -Format 'HHmmss')"
        # Pad to 8 chars minimum
        if ($monitorName.Length -lt 8) { $monitorName = $monitorName.PadRight(8, '0') }

        $monitor = New-UTCMMonitor `
            -DisplayName $monitorName `
            -Description 'Pester integration test monitor' `
            -BaselineSnapshotId $script:TestSnapshotId

        $monitor | Should -Not -BeNullOrEmpty
        $monitor.id | Should -Not -BeNullOrEmpty
        $script:TestMonitorIds.Add($monitor.id) | Out-Null
        $script:TestMonitorId = $monitor.id
    }

    It 'Lists monitors and finds the test monitor' {
        if (-not $script:TestMonitorId) {
            Set-ItResult -Skipped -Because 'Monitor was not created'
            return
        }

        $monitors = Get-UTCMMonitor
        $monitors | Should -Not -BeNullOrEmpty
        $found = $monitors | Where-Object { $_.id -eq $script:TestMonitorId }
        $found | Should -Not -BeNullOrEmpty
    }

    It 'Retrieves the test monitor by ID' {
        if (-not $script:TestMonitorId) {
            Set-ItResult -Skipped -Because 'Monitor was not created'
            return
        }

        $monitor = Get-UTCMMonitor -MonitorId $script:TestMonitorId
        $monitor | Should -Not -BeNullOrEmpty
        $monitor.id | Should -Be $script:TestMonitorId
    }
}

Describe 'Drift and Results' -Tag 'Integration' {
    It 'Queries drifts without error' {
        { Get-UTCMDrift -Status All } | Should -Not -Throw
    }

    It 'Queries monitoring results without error' {
        { Get-UTCMMonitoringResult } | Should -Not -Throw
    }

    It 'Queries drifts filtered by monitor ID' {
        if (-not $script:TestMonitorId) {
            Set-ItResult -Skipped -Because 'Monitor was not created'
            return
        }

        { Get-UTCMDrift -MonitorId $script:TestMonitorId -Status All } | Should -Not -Throw
    }
}

Describe 'Resource Type Validation against API' -Tag 'Integration' {
    It 'Creates a snapshot with multiple verified types' {
        $resources = @(
            'microsoft.entra.authorizationpolicy',
            'microsoft.entra.securitydefaults',
            'microsoft.entra.tenantdetails'
        )

        $displayName = "PesterMulti $(Get-Date -Format 'HHmmss')"
        $snapshot = New-UTCMSnapshot `
            -DisplayName $displayName `
            -Description 'Multi-resource test' `
            -Resources $resources

        $snapshot | Should -Not -BeNullOrEmpty
        $script:TestSnapshotIds.Add($snapshot.id) | Out-Null
    }
}

Describe 'Cleanup' -Tag 'Integration' {
    It 'Deletes the test monitor' {
        if (-not $script:TestMonitorId) {
            Set-ItResult -Skipped -Because 'No monitor to clean up'
            return
        }

        { Remove-UTCMMonitor -MonitorId $script:TestMonitorId -Confirm:$false } | Should -Not -Throw
        # Remove from cleanup list since we already cleaned it
        $script:TestMonitorIds.Remove($script:TestMonitorId)
    }

    It 'Deletes the test snapshots' {
        foreach ($snapId in @($script:TestSnapshotIds)) {
            { Remove-UTCMSnapshot -SnapshotId $snapId -Confirm:$false } | Should -Not -Throw
        }
        $script:TestSnapshotIds.Clear()
    }
}
