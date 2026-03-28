[CmdletBinding()]
param(
    [string]$OutputDir = '',
    [string[]]$DnsNames = @(),
    [string[]]$IpAddresses = @(),
    [string]$FriendlyName = 'RA2 LAN TLS',
    [int]$ValidDays = 825,
    [switch]$TrustCurrentUser
)

$ErrorActionPreference = 'Stop'
$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }

if (-not $OutputDir) {
    $OutputDir = Join-Path $scriptRoot 'certs'
}

function Convert-BytesToPem {
    param(
        [byte[]]$Bytes,
        [string]$Label
    )

    $base64 = [System.Convert]::ToBase64String($Bytes, [System.Base64FormattingOptions]::InsertLineBreaks)
    return "-----BEGIN $Label-----`n$base64`n-----END $Label-----`n"
}

function Get-DefaultDnsNames {
    $values = @('localhost', $env:COMPUTERNAME)
    return $values | Where-Object { $_ -and $_.Trim() } | ForEach-Object { $_.Trim() } | Sort-Object -Unique
}

function Get-DefaultIpAddresses {
    if (Get-Command Get-NetIPAddress -ErrorAction SilentlyContinue) {
        return Get-NetIPAddress -AddressFamily IPv4 |
            Where-Object {
                $_.IPAddress -and
                $_.IPAddress -notlike '127.*' -and
                $_.IPAddress -notlike '169.254*'
            } |
            Select-Object -ExpandProperty IPAddress -Unique
    }

    return [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
        Where-Object { $_.OperationalStatus -eq 'Up' } |
        ForEach-Object { $_.GetIPProperties().UnicastAddresses } |
        Where-Object {
            $_.Address.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
            $_.Address.ToString() -notlike '127.*' -and
            $_.Address.ToString() -notlike '169.254*'
        } |
        ForEach-Object { $_.Address.ToString() } |
        Sort-Object -Unique
}

$allDnsNames = @($DnsNames + (Get-DefaultDnsNames)) |
    Where-Object { $_ -and $_.Trim() } |
    ForEach-Object { $_.Trim() } |
    Sort-Object -Unique

$allIpAddresses = @($IpAddresses + (Get-DefaultIpAddresses) + '127.0.0.1') |
    Where-Object { $_ -and $_.Trim() } |
    ForEach-Object { $_.Trim() } |
    Sort-Object -Unique

if (-not $allDnsNames -and -not $allIpAddresses) {
    throw 'Could not determine any DNS names or IP addresses for the LAN TLS certificate.'
}

$primaryName = if ($allDnsNames.Count -gt 0) { $allDnsNames[0] } else { $allIpAddresses[0] }
$sanEntries = @(
    $allDnsNames | ForEach-Object { "DNS=$_" }
    $allIpAddresses | ForEach-Object { "IPAddress=$_" }
)
$sanExtension = '2.5.29.17={text}' + ($sanEntries -join '&')
$ekuExtension = '2.5.29.37={text}1.3.6.1.5.5.7.3.1'

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$newCertArgs = @{
    Subject = "CN=$primaryName"
    FriendlyName = $FriendlyName
    CertStoreLocation = 'Cert:\CurrentUser\My'
    KeyAlgorithm = 'RSA'
    KeyLength = 2048
    HashAlgorithm = 'SHA256'
    KeyExportPolicy = 'Exportable'
    KeyUsage = 'DigitalSignature', 'KeyEncipherment'
    NotAfter = (Get-Date).AddDays($ValidDays)
    TextExtension = @($sanExtension, $ekuExtension)
}

$cert = New-SelfSignedCertificate @newCertArgs

$certPemPath = Join-Path $OutputDir 'lan-server-cert.pem'
$keyPemPath = Join-Path $OutputDir 'lan-server-key.pem'
$cerPath = Join-Path $OutputDir 'lan-server-cert.cer'

Set-Content -Path $certPemPath -Value (Convert-BytesToPem -Bytes $cert.RawData -Label 'CERTIFICATE') -Encoding Ascii -NoNewline

$privateKey = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
if (-not $privateKey) {
    throw 'Unable to extract the RSA private key from the generated certificate.'
}

try {
    if ($privateKey.PSObject.Methods.Name -contains 'ExportPkcs8PrivateKey') {
        $privateKeyBytes = $privateKey.ExportPkcs8PrivateKey()
    }
    elseif ($privateKey -is [System.Security.Cryptography.RSACng]) {
        $privateKeyBytes = $privateKey.Key.Export([System.Security.Cryptography.CngKeyBlobFormat]::Pkcs8PrivateBlob)
    }
    else {
        throw 'Current PowerShell runtime cannot export the RSA private key as PKCS#8 PEM.'
    }
}
finally {
    $privateKey.Dispose()
}

Set-Content -Path $keyPemPath -Value (Convert-BytesToPem -Bytes $privateKeyBytes -Label 'PRIVATE KEY') -Encoding Ascii -NoNewline
Export-Certificate -Cert $cert -FilePath $cerPath -Type CERT | Out-Null

if ($TrustCurrentUser) {
    Import-Certificate -FilePath $cerPath -CertStoreLocation 'Cert:\CurrentUser\Root' | Out-Null
}

Write-Host "Generated LAN TLS certificate: $certPemPath"
Write-Host "Generated LAN TLS private key: $keyPemPath"
Write-Host "Exported LAN TLS trust certificate: $cerPath"
Write-Host "DNS SANs: $($allDnsNames -join ', ')"
Write-Host "IP SANs: $($allIpAddresses -join ', ')"

if ($TrustCurrentUser) {
    Write-Host 'Installed certificate into Cert:\CurrentUser\Root for the current Windows user.'
}
else {
    Write-Host 'Run trust-lan-tls-cert.ps1 on each client machine to trust this certificate.'
}