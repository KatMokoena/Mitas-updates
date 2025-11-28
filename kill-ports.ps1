# Script to kill processes on ports 3000 and 3001
Write-Host "Checking for processes on ports 3000 and 3001..." -ForegroundColor Cyan

$ports = @(3000, 3001)
$killed = $false

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $connections | ForEach-Object {
            $processId = $_.OwningProcess
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "Killing process $processId ($($process.ProcessName)) on port $port" -ForegroundColor Yellow
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                $killed = $true
            }
        }
    } else {
        Write-Host "Port $port is free" -ForegroundColor Green
    }
}

if (-not $killed) {
    Write-Host "`nNo processes found on ports 3000 or 3001" -ForegroundColor Green
} else {
    Write-Host "`nPorts cleared! You can now run dev or production mode." -ForegroundColor Green
}










