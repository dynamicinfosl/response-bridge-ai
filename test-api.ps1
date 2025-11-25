# Script PowerShell para testar a conexão com o n8n
# Carrega as variáveis do .env.local e testa a API

Write-Host "🔍 Carregando variáveis do .env.local..." -ForegroundColor Cyan

# Ler o arquivo .env.local
$envFile = ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ Arquivo .env.local não encontrado!" -ForegroundColor Red
    exit 1
}

# Carregar variáveis do .env.local
$lines = Get-Content $envFile
foreach ($line in $lines) {
    if ($line -match '^\s*([^#][^=]*)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
        $displayValue = if ($value.Length -gt 30) { $value.Substring(0, 30) + "..." } else { $value }
        Write-Host "  ✓ $key = $displayValue" -ForegroundColor Gray
    }
}

Write-Host "`n---`n" -ForegroundColor Gray

$API_URL = $env:VITE_N8N_API_URL
$API_KEY = $env:VITE_N8N_API_KEY

if (-not $API_URL) {
    Write-Host "❌ VITE_N8N_API_URL não encontrada no .env.local!" -ForegroundColor Red
    exit 1
}

Write-Host "📡 Testando conexão com n8n..." -ForegroundColor Cyan
Write-Host "URL: $API_URL" -ForegroundColor Yellow
Write-Host "API Key: $(if ($API_KEY) { "$($API_KEY.Substring(0, [Math]::Min(20, $API_KEY.Length)))..." } else { "(não configurada)" })" -ForegroundColor Yellow
Write-Host "`n---`n" -ForegroundColor Gray

$testUrl = "$API_URL`?endpoint=chats"
Write-Host "🔗 Fazendo requisição para: $testUrl" -ForegroundColor Cyan

$headers = @{
    'Content-Type' = 'application/json'
}

if ($API_KEY) {
    $headers['Authorization'] = "Bearer $API_KEY"
    Write-Host "🔑 Usando API Key no header Authorization" -ForegroundColor Green
} else {
    Write-Host "⚠️  Sem API Key - requisição sem autenticação" -ForegroundColor Yellow
}

Write-Host "`n---`n" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri $testUrl -Method GET -Headers $headers -UseBasicParsing
    
    Write-Host "✅ Status: $($response.StatusCode) $($response.StatusDescription)" -ForegroundColor Green
    Write-Host "`n📋 Headers da resposta:" -ForegroundColor Cyan
    foreach ($header in $response.Headers.GetEnumerator()) {
        Write-Host "  $($header.Key): $($header.Value)" -ForegroundColor Gray
    }
    
    Write-Host "`n📄 Resposta:" -ForegroundColor Cyan
    $json = $response.Content | ConvertFrom-Json
    
    if ($json -is [Array]) {
        Write-Host "✅ Sucesso! Retornou $($json.Count) chat(s)" -ForegroundColor Green
        Write-Host "`n📊 Primeiro chat (se houver):" -ForegroundColor Cyan
        if ($json.Count -gt 0) {
            $json[0] | ConvertTo-Json -Depth 5
        }
    } else {
        Write-Host "⚠️  Retornou um objeto ao invés de array" -ForegroundColor Yellow
        Write-Host "Chaves do objeto: $($json.PSObject.Properties.Name -join ', ')" -ForegroundColor Yellow
        $json | ConvertTo-Json -Depth 5
    }
    
} catch {
    Write-Host "❌ Erro na requisição:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode.value__
        Write-Host "`nStatus Code: $statusCode" -ForegroundColor Yellow
        
        if ($statusCode -eq 401) {
            Write-Host "🔑 Erro 401: API Key pode estar incorreta ou ausente" -ForegroundColor Yellow
        } elseif ($statusCode -eq 404) {
            Write-Host "🔗 Erro 404: Webhook não encontrado - verifique se o workflow está ativo" -ForegroundColor Yellow
        }
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "`nResposta do servidor:" -ForegroundColor Yellow
            Write-Host $responseBody -ForegroundColor Gray
        } catch {
            # Ignora erro ao ler resposta
        }
    }
}

