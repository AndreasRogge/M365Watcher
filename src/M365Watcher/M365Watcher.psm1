#Requires -Modules Microsoft.Graph.Authentication

# Dot-source Private functions first (constants must be available before public functions)
foreach ($file in (Get-ChildItem -Path "$PSScriptRoot/Private" -Filter '*.ps1' -Recurse)) {
    . $file.FullName
}

# Dot-source Public functions
foreach ($file in (Get-ChildItem -Path "$PSScriptRoot/Public" -Filter '*.ps1' -Recurse)) {
    . $file.FullName
}

# Export only Public function names
$publicFunctions = (Get-ChildItem -Path "$PSScriptRoot/Public" -Filter '*.ps1' -Recurse).BaseName
Export-ModuleMember -Function $publicFunctions
