# Script simples para testar a API do n8n
$envFile = ".env.local"

if (-not (Test-Path $envFile)) {
    Write-Host "Arquivo .env.local nao encontrado!" -ForegroundColor Red
    exit 1
}

# Carregar variaveis
$content = Get-Content $envFile
foreach ($line in $content) {
    if ($line -match '^([^#][^=]*)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Item -Path "env:$key" -Value $value
    }
}

$API_URL = $env:VITE_N8N_API_URL
$API_KEY = $env:VITE_N8N_API_KEY

Write-Host "URL: $API_URL"
Write-Host "API Key: $(if ($API_KEY) { $API_KEY.Substring(0, [Math]::Min(20, $API_KEY.Length)) + '...' } else { 'nao configurada' })"
Write-Host ""

$testUrl = "$API_URL?endpoint=chats"
$headers = @{'Content-Type' = 'application/json'}

if ($API_KEY) {
    $headers['Authorization'] = "Bearer $API_KEY"
}

try {
    $response = Invoke-WebRequest -Uri $testUrl -Method GET -Headers $headers -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resposta:"
    $response.Content
} catch {
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Yellow
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Resposta do servidor: $responseBody"
    }
}

