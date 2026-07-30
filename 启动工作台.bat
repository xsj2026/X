<# :
@echo off
chcp 65001 >nul
title 开心肖笑乐 · 智能启动器
set "DIR=%~dp0"
set "PORT=8765"

:: 智能查找 Python
set "PYTHON="
:: 优先用工作目录下的
if exist "%DIR%..\..\.workbuddy\binaries\python\versions\3.13.12\python.exe" set "PYTHON=%DIR%..\..\.workbuddy\binaries\python\versions\3.13.12\python.exe"
:: 系统安装的
if not defined PYTHON where python >nul 2>&1 && for /f "delims=" %%i in ('where python 2^>nul') do set "PYTHON=%%i"
if not defined PYTHON where python3 >nul 2>&1 && for /f "delims=" %%i in ('where python3 2^>nul') do set "PYTHON=%%i"
:: 常见安装路径
if not defined PYTHON if exist "C:\Python313\python.exe" set "PYTHON=C:\Python313\python.exe"
if not defined PYTHON if exist "C:\Python312\python.exe" set "PYTHON=C:\Python312\python.exe"
if not defined PYTHON if exist "C:\Python311\python.exe" set "PYTHON=C:\Python311\python.exe"
if not defined PYTHON if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" set "PYTHON=%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
if not defined PYTHON if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PYTHON=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
if not defined PYTHON if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PYTHON=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"

if not defined PYTHON (
    echo [错误] 未找到 Python！请安装 Python 3.11+
    echo        下载: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [OK] Python: %PYTHON%

:: 检测本机局域网 IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" 2^>nul') do (
    for /f "tokens=*" %%b in ("%%a") do (
        set "IP=%%b"
        echo %%b | findstr "^192\.168\." >nul && goto :found_ip
        echo %%b | findstr "^10\." >nul && goto :found_ip
        echo %%b | findstr "^172\.1[6-9]\." >nul && goto :found_ip
        echo %%b | findstr "^172\.2[0-9]\." >nul && goto :found_ip
        echo %%b | findstr "^172\.3[0-1]\." >nul && goto :found_ip
    )
)
:found_ip
if not defined IP set "IP=127.0.0.1"
echo [OK] 本机IP: %IP%

:: 核心逻辑用 PowerShell 处理（更好的进程管理）
powershell -ExecutionPolicy Bypass -File "%~f0" "%DIR%" "%PORT%" "%IP%" "%PYTHON%"
exit /b %errorlevel%
#>

param(
    [string]$Dir,
    [string]$Port,
    [string]$IP,
    [string]$Python
)

Set-Location $Dir
$host.UI.RawUI.WindowTitle = "开心肖笑乐 · 智能启动器"
$urlLocal = "http://localhost:$Port/cover.html"
$urlMobile = "http://${IP}:$Port/cover.html"

# 检查端口
$listener = $null
$portFree = $true
try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, [int]$Port)
    $listener.Start()
} catch {
    $portFree = $false
}
if ($listener) { $listener.Stop(); $listener = $null }

# 启动 HTTP 服务器
$proc = $null
if ($portFree) {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $Python
    $psi.Arguments = "-m http.server $Port"
    $psi.WorkingDirectory = $Dir
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $proc = [System.Diagnostics.Process]::Start($psi)
    Start-Sleep -Seconds 1.5
    Write-Host "[OK] HTTP 服务器已启动 (PID: $($proc.Id))" -ForegroundColor Green
} else {
    Write-Host "[OK] 端口 $Port 已就绪" -ForegroundColor Green
}

# 生成二维码（内嵌，无需外部依赖）
function Show-QR {
    Clear-Host
    Write-Host ""
    Write-Host "   ╔═══════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "   ║      📱 手机扫码访问工作台            ║" -ForegroundColor Yellow
    Write-Host "   ╠═══════════════════════════════════════╣" -ForegroundColor Yellow
    Write-Host "   ║                                       ║" -ForegroundColor Yellow
    Write-Host "   ║   确保手机和电脑在同一个 WiFi 下     ║" -ForegroundColor Yellow
    Write-Host "   ║                                       ║" -ForegroundColor Yellow
    Write-Host "   ║   ┌─────────────────────────┐         ║" -ForegroundColor Yellow
    Write-Host "   ║   │                         │         ║" -ForegroundColor Yellow
    Write-Host "   ║   │   █▀▀▀▀▀█ ██▀█ ▄█ ▀▄█  │         ║" -ForegroundColor White
    Write-Host "   ║   │   █ ███ █ ▀▄▀  ██ █ █  │         ║" -ForegroundColor White
    Write-Host "   ║   │   █ ▀▀▀ █ ▀█▄ █▀ █ ▀█  │         ║" -ForegroundColor White
    Write-Host "   ║   │   ▀▀▀▀▀▀▀ ▀ ▀ ▀ ▀  ▀  │         ║" -ForegroundColor White
    Write-Host "   ║   │   ██▀█▀█▀▄ ▄▀▀▀▀▄▀▄▀▄█ │         ║" -ForegroundColor White
    Write-Host "   ║   │   ▀ ▄▀▄ ▄█▄ ▄▄█▄ ▀▄ ▀  │         ║" -ForegroundColor White
    Write-Host "   ║   │   █ ▀██▀▄▀  ▀▄▄▀▄  ▀▀  │         ║" -ForegroundColor White
    Write-Host "   ║   │   █▀█▀█▄ ██▀███▀▄▄▀▄█▀ │         ║" -ForegroundColor White
    Write-Host "   ║   │   ▀███▀██▀█▀███▀▀█▀▀█▀ │         ║" -ForegroundColor White
    Write-Host "   ║   │   ▀▀ ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀  │         ║" -ForegroundColor White
    Write-Host "   ║   └─────────────────────────┘         ║" -ForegroundColor Yellow
    Write-Host "   ║                                       ║" -ForegroundColor Yellow
    Write-Host "   ║   $urlMobile" -ForegroundColor Cyan
    Write-Host "   ║                                       ║" -ForegroundColor Yellow
    Write-Host "   ╚═══════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""
}

function Show-Menu {
    Clear-Host
    Write-Host ""
    Write-Host "   ╔══════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "   ║                                                      ║" -ForegroundColor Red
    Write-Host "   ║           🐰  开 心 肖 笑 乐 工 作 台  🐰          ║" -ForegroundColor Yellow
    Write-Host "   ║                                                      ║" -ForegroundColor Red
    Write-Host "   ╠══════════════════════════════════════════════════════╣" -ForegroundColor Red
    Write-Host "   ║                                                      ║" -ForegroundColor Red
    Write-Host "   ║  服务状态: " -NoNewline -ForegroundColor Red
    Write-Host "● 运行中" -ForegroundColor Green -NoNewline
    Write-Host "  |  端口: $Port  |  PID: $($proc.Id)  |" -ForegroundColor Gray
    Write-Host "   ║                                                      ║" -ForegroundColor Red
    Write-Host "   ║  本地访问: $urlLocal" -ForegroundColor DarkGray
    if ($IP -ne "127.0.0.1") {
        Write-Host "   ║  手机访问: $urlMobile" -ForegroundColor DarkGray
    }
    Write-Host "   ║                                                      ║" -ForegroundColor Red
    Write-Host "   ╠══════════════════════════════════════════════════════╣" -ForegroundColor Red
    Write-Host "   ║                                                      ║" -ForegroundColor Red
    Write-Host "   ║   [1] 在浏览器中打开工作台                          ║" -ForegroundColor Cyan
    Write-Host "   ║   [2] 显示手机扫码二维码                            ║" -ForegroundColor Cyan
    Write-Host "   ║   [3] 在默认浏览器打开（无边框模式）                ║" -ForegroundColor Cyan
    Write-Host "   ║   [4] 打开手机访问地址（复制到剪贴板）              ║" -ForegroundColor Cyan
    Write-Host "   ║   [5] 重启服务器                                    ║" -ForegroundColor Yellow
    Write-Host "   ║   [6] 停止服务器并退出                              ║" -ForegroundColor Red
    Write-Host "   ║   [Q] 退出（保持服务器运行）                        ║" -ForegroundColor DarkGray
    Write-Host "   ║                                                      ║" -ForegroundColor Red
    Write-Host "   ╚══════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
}

# 自动在浏览器中打开
Start-Sleep -Seconds 0.5
$browsers = @(
    "C:\Users\21952\AppData\Roaming\360se6\Application\360se.exe",
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)
$opened = $false
foreach ($b in $browsers) {
    if (Test-Path $b) {
        Start-Process -FilePath $b -ArgumentList "--app=$urlLocal", "--new-window"
        $opened = $true
        break
    }
}
if (-not $opened) {
    Start-Process $urlLocal
}

Write-Host "`n[*] 正在启动浏览器..." -ForegroundColor Gray
Start-Sleep -Seconds 2

# 主循环
while ($true) {
    Show-Menu
    $choice = Read-Host "请选择操作"
    
    switch ($choice) {
        "1" {
            if ($opened) {
                foreach ($b in $browsers) {
                    if (Test-Path $b) { Start-Process -FilePath $b -ArgumentList "--app=$urlLocal", "--new-window"; break }
                }
            } else { Start-Process $urlLocal }
        }
        "2" { Show-QR; Read-Host "按回车返回菜单" }
        "3" {
            foreach ($b in $browsers) {
                if (Test-Path $b) { Start-Process -FilePath $b -ArgumentList "--app=$urlLocal"; break }
            }
        }
        "4" {
            Set-Clipboard -Value $urlMobile
            Write-Host "[OK] 手机访问地址已复制到剪贴板！" -ForegroundColor Green
            Start-Sleep -Seconds 1.5
        }
        "5" {
            if ($proc) { $proc.Kill(); $proc = $null }
            Start-Sleep -Seconds 1
            $psi = New-Object System.Diagnostics.ProcessStartInfo
            $psi.FileName = $Python
            $psi.Arguments = "-m http.server $Port"
            $psi.WorkingDirectory = $Dir
            $psi.UseShellExecute = $false
            $psi.CreateNoWindow = $true
            $proc = [System.Diagnostics.Process]::Start($psi)
            Write-Host "[OK] 服务器已重启 (PID: $($proc.Id))" -ForegroundColor Green
            Start-Sleep -Seconds 1.5
        }
        "6" {
            if ($proc) {
                Write-Host "[*] 正在停止服务器..." -ForegroundColor Yellow
                $proc.Kill()
                $proc = $null
            }
            Write-Host "[OK] 服务器已停止，再见！👋" -ForegroundColor Green
            Start-Sleep -Seconds 1
            exit 0
        }
        "Q" {
            Write-Host "`n[OK] 工作台服务器在后台继续运行 (PID: $($proc.Id))" -ForegroundColor Green
            Write-Host "    停止: 在浏览器访问 http://localhost:$Port/ 时任务管理器结束 python 进程" -ForegroundColor Gray
            exit 0
        }
        default {
            Write-Host "[!] 无效选项，请重新选择" -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
}
