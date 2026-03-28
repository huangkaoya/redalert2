[CmdletBinding()]
param(
    [string]$CertPath = ''
)

$ErrorActionPreference = 'Stop'
$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }

if (-not $CertPath) {
    $CertPath = Join-Path $scriptRoot 'certs\lan-server-cert.cer'
}

if (-not (Test-Path -LiteralPath $CertPath)) {
    throw "Certificate file not found: $CertPath"
}

Import-Certificate -FilePath $CertPath -CertStoreLocation 'Cert:\CurrentUser\Root' | Out-Null
Write-Host "Trusted LAN TLS certificate for current user: $CertPath"