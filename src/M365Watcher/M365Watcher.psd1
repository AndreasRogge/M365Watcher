@{
    RootModule        = 'M365Watcher.psm1'
    ModuleVersion     = '1.0.0'
    GUID              = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    Author            = 'Andreas Rogge'
    CompanyName       = 'M365Watcher'
    Copyright         = '(c) 2025 Andreas Rogge. All rights reserved.'
    Description       = 'Microsoft 365 Unified Tenant Configuration Management (UTCM) - Monitor configuration drift across Entra ID, Exchange, Teams, Intune, and Security & Compliance.'

    PowerShellVersion = '5.1'
    RequiredModules   = @('Microsoft.Graph.Authentication')

    FunctionsToExport = @(
        'Connect-UTCM',
        'Test-UTCMAvailability',
        'Initialize-UTCMServicePrincipal',
        'Grant-UTCMPermissions',
        'New-UTCMSnapshot',
        'Get-UTCMSnapshot',
        'Remove-UTCMSnapshot',
        'New-UTCMMonitor',
        'Get-UTCMMonitor',
        'Remove-UTCMMonitor',
        'Update-UTCMMonitorBaseline',
        'Get-UTCMDrift',
        'Get-UTCMDriftDetail',
        'Get-UTCMMonitoringResult',
        'Get-UTCMSummary',
        'Get-UTCMResourceTypes',
        'Start-UTCMExample',
        'Start-UTCMInteractive'
    )

    CmdletsToExport   = @()
    VariablesToExport  = @()
    AliasesToExport    = @()

    PrivateData = @{
        PSData = @{
            Tags       = @('Microsoft365', 'UTCM', 'ConfigurationDrift', 'MicrosoftGraph', 'Monitoring')
            ProjectUri = 'https://github.com/AndreasRogge/M365Watcher'
        }
    }
}
