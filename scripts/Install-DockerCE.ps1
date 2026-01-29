# Docker CE 纯命令行安装脚本 (Windows Server)
# 不依赖 Docker Desktop，适用于服务器环境
# 使用方法: powershell -ExecutionPolicy Bypass -File Install-DockerCE.ps1

#Requires -RunAsAdministrator

param(
    [string]$DockerVersion = "24.0.7",
    [string]$ComposeVersion = "2.24.0",
    [string]$InstallPath = "$env:ProgramFiles\Docker"
)

$ErrorActionPreference = "Stop"
$SkipDockerInstall = $false

# ========== 辅助函数 ==========
function Log { param($M) Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $M" -ForegroundColor Cyan }
function Ok { param($M) Write-Host "  [OK] $M" -ForegroundColor Green }
function Warn { param($M) Write-Host "  [WARN] $M" -ForegroundColor Yellow }
function Err { param($M) Write-Host "  [ERR] $M" -ForegroundColor Red }

function Install-DockerCompose {
    param([string]$InstallPath, [string]$ComposeVersion)
    
    Log "安装 Docker Compose $ComposeVersion..."
    $composePath = "$InstallPath\docker-compose.exe"
    $composeUrl = "https://github.com/docker/compose/releases/download/v$ComposeVersion/docker-compose-windows-x86_64.exe"
    
    if (-not (Test-Path $composePath)) {
        Log "下载 Docker Compose..."
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri $composeUrl -OutFile $composePath -UseBasicParsing
            Ok "Docker Compose 已安装"
        } catch {
            Warn "Docker Compose 下载失败，请手动安装"
            Write-Host "  下载地址: $composeUrl" -ForegroundColor Cyan
        }
    } else {
        Ok "Docker Compose 已存在"
    }
    return $composePath
}

function Test-DockerInstallation {
    param([string]$InstallPath)
    
    Log "验证安装..."
    $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
    
    # 验证 Docker
    $dockerExe = "$InstallPath\docker.exe"
    if (Test-Path $dockerExe) {
        try {
            $dockerVersion = & $dockerExe version 2>&1
            Write-Host ""
            Write-Host "Docker 版本信息:" -ForegroundColor Green
            Write-Host $dockerVersion
        } catch {
            Warn "无法获取 Docker 版本"
        }
    }
    
    # 验证 Compose
    $composePath = "$InstallPath\docker-compose.exe"
    if (Test-Path $composePath) {
        try {
            $composeVer = & $composePath version 2>&1
            Write-Host ""
            Write-Host "Docker Compose 版本:" -ForegroundColor Green
            Write-Host $composeVer
        } catch {
            Warn "无法获取 Compose 版本"
        }
    }
}

# ========== 开始 ==========
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Docker CE 安装脚本 (Windows Server)"
Write-Host "  Docker: $DockerVersion | Compose: $ComposeVersion"
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ========== 步骤1: 检查系统 ==========
Log "步骤 1/7: 检查系统要求..."

$os = Get-CimInstance Win32_OperatingSystem
$version = [Version]$os.Version
Log "操作系统: $($os.Caption)"

if ($version.Major -lt 10) {
    Err "需要 Windows Server 2016 或更高版本"
    exit 1
}
Ok "系统版本符合要求"

# ========== 步骤2: 安装 Containers 功能 ==========
Log "步骤 2/7: 安装 Containers 功能..."

$needsRestart = $false
$containersFeature = Get-WindowsFeature -Name Containers -ErrorAction SilentlyContinue

if ($containersFeature) {
    if (-not $containersFeature.Installed) {
        Log "正在安装 Containers 功能..."
        $result = Install-WindowsFeature -Name Containers
        if ($result.RestartNeeded -eq "Yes") {
            $needsRestart = $true
        }
        Ok "Containers 功能已安装"
    } else {
        Ok "Containers 功能已存在"
    }
} else {
    # 可能是 Windows 10/11
    $feature = Get-WindowsOptionalFeature -Online -FeatureName Containers -ErrorAction SilentlyContinue
    if ($feature -and $feature.State -ne "Enabled") {
        $result = Enable-WindowsOptionalFeature -Online -FeatureName Containers -All -NoRestart
        if ($result.RestartNeeded) {
            $needsRestart = $true
        }
        Ok "Containers 功能已启用"
    } else {
        Ok "Containers 功能已存在"
    }
}

if ($needsRestart) {
    Warn "需要重启系统完成 Containers 功能安装"
    Write-Host ""
    Write-Host "请运行以下命令重启，然后再次运行此脚本:" -ForegroundColor Yellow
    Write-Host "  Restart-Computer -Force" -ForegroundColor Cyan
    Write-Host ""
    $restart = Read-Host "是否立即重启? (y/N)"
    if ($restart -eq "y") {
        Restart-Computer -Force
    }
    exit 0
}

# ========== 步骤3: 检查现有 Docker ==========
Log "步骤 3/7: 检查现有 Docker 安装..."

$dockerService = Get-Service -Name Docker -ErrorAction SilentlyContinue
if ($dockerService -and $dockerService.Status -eq "Running") {
    try {
        $currentVersion = & "$InstallPath\docker.exe" version --format "{{.Server.Version}}" 2>$null
        if ($currentVersion) {
            Log "Docker 已安装且正在运行: v$currentVersion"
            $reinstall = Read-Host "是否重新安装? (y/N)"
            if ($reinstall -ne "y") {
                Ok "跳过 Docker 安装，继续安装 Compose"
                $SkipDockerInstall = $true
            }
        }
    } catch {
        Log "Docker 服务存在但无法获取版本，将重新安装"
    }
}

if (-not $SkipDockerInstall) {
    # ========== 步骤4: 下载 Docker CE ==========
    Log "步骤 4/7: 下载 Docker CE $DockerVersion..."
    
    $dockerZip = "$env:TEMP\docker-$DockerVersion.zip"
    $dockerUrl = "https://download.docker.com/win/static/stable/x86_64/docker-$DockerVersion.zip"
    
    if (-not (Test-Path $dockerZip)) {
        Log "下载中: $dockerUrl"
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri $dockerUrl -OutFile $dockerZip -UseBasicParsing
            Ok "下载完成: $(((Get-Item $dockerZip).Length / 1MB).ToString('F2')) MB"
        } catch {
            Err "下载失败: $_"
            Write-Host ""
            Write-Host "请手动下载后放置到: $dockerZip" -ForegroundColor Yellow
            Write-Host "下载地址: $dockerUrl" -ForegroundColor Cyan
            exit 1
        }
    } else {
        Ok "使用已下载的文件: $dockerZip"
    }
    
    # ========== 步骤5: 解压并安装 Docker ==========
    Log "步骤 5/7: 安装 Docker..."
    
    # 停止现有服务
    if ($dockerService -and $dockerService.Status -eq "Running") {
        Log "停止现有 Docker 服务..."
        Stop-Service Docker -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    }
    
    # 创建安装目录
    if (-not (Test-Path $InstallPath)) {
        New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    }
    
    # 解压
    Log "解压文件..."
    $extractPath = "$env:TEMP\docker-extract-$(Get-Random)"
    Expand-Archive -Path $dockerZip -DestinationPath $extractPath -Force
    
    # 复制文件
    $dockerFilesPath = "$extractPath\docker"
    if (Test-Path $dockerFilesPath) {
        Get-ChildItem $dockerFilesPath | Copy-Item -Destination $InstallPath -Force
    } else {
        Get-ChildItem $extractPath | Copy-Item -Destination $InstallPath -Force -Recurse
    }
    
    # 清理临时文件
    Remove-Item $extractPath -Recurse -Force -ErrorAction SilentlyContinue
    
    Ok "Docker 文件已安装到: $InstallPath"
    
    # ========== 步骤6: 配置环境变量和服务 ==========
    Log "步骤 6/7: 配置 Docker 服务..."
    
    # 添加到 PATH
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    if ($machinePath -notlike "*$InstallPath*") {
        [Environment]::SetEnvironmentVariable("Path", "$machinePath;$InstallPath", "Machine")
        $env:Path = "$env:Path;$InstallPath"
        Ok "已添加到系统 PATH"
    }
    
    # 创建数据目录
    $dockerData = "$env:ProgramData\Docker"
    if (-not (Test-Path $dockerData)) {
        New-Item -ItemType Directory -Path $dockerData -Force | Out-Null
    }
    
    # 创建配置文件
    $configDir = "$dockerData\config"
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }
    
    $daemonConfig = @{
        "storage-driver" = "windowsfilter"
        "log-driver" = "json-file"
        "log-opts" = @{
            "max-size" = "10m"
            "max-file" = "3"
        }
    } | ConvertTo-Json -Depth 3
    
    $daemonConfig | Out-File -FilePath "$configDir\daemon.json" -Encoding ASCII -Force
    Ok "Docker 配置文件已创建"
    
    # 注册服务
    $dockerdPath = "$InstallPath\dockerd.exe"
    if (-not (Test-Path $dockerdPath)) {
        Err "找不到 dockerd.exe: $dockerdPath"
        exit 1
    }
    
    # 先移除旧服务
    $existingService = Get-Service -Name Docker -ErrorAction SilentlyContinue
    if ($existingService) {
        Log "移除旧的 Docker 服务..."
        sc.exe delete Docker 2>$null | Out-Null
        Start-Sleep -Seconds 3
    }
    
    # 注册新服务
    Log "注册 Docker 服务..."
    $regResult = & $dockerdPath --register-service 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Log "使用 sc.exe 注册服务..."
        sc.exe create Docker binPath= "`"$dockerdPath`" --run-service" start= auto 2>$null | Out-Null
    }
    
    # 验证服务是否注册成功
    Start-Sleep -Seconds 2
    $newService = Get-Service -Name Docker -ErrorAction SilentlyContinue
    if ($newService) {
        Ok "Docker 服务已注册"
        Set-Service -Name Docker -StartupType Automatic -ErrorAction SilentlyContinue
    } else {
        Err "Docker 服务注册失败"
        Write-Host "请尝试手动注册:" -ForegroundColor Yellow
        Write-Host "  & '$dockerdPath' --register-service" -ForegroundColor Cyan
        exit 1
    }
    
    # 启动服务
    Log "启动 Docker 服务..."
    try {
        Start-Service Docker -ErrorAction Stop
        Start-Sleep -Seconds 8
        
        $svc = Get-Service -Name Docker
        if ($svc.Status -eq "Running") {
            Ok "Docker 服务运行中"
        } else {
            throw "服务状态: $($svc.Status)"
        }
    } catch {
        Err "Docker 服务启动失败: $_"
        Write-Host ""
        Write-Host "========== 诊断信息 ==========" -ForegroundColor Yellow
        
        # 检查 Windows 功能
        $containers = Get-WindowsFeature -Name Containers -ErrorAction SilentlyContinue
        if ($containers) {
            Write-Host "  Containers 功能: $(if($containers.Installed){'已安装'}else{'未安装 - 这是问题所在!'})" -ForegroundColor $(if($containers.Installed){'Green'}else{'Red'})
        }
        
        # 检查事件日志
        Write-Host ""
        Write-Host "  最近的错误日志:" -ForegroundColor Yellow
        try {
            $events = Get-WinEvent -FilterHashtable @{LogName='Application'; Level=2} -MaxEvents 5 -ErrorAction SilentlyContinue | 
                      Where-Object { $_.Message -like "*docker*" -or $_.ProviderName -like "*docker*" }
            if ($events) {
                foreach ($e in $events) {
                    Write-Host "    $($e.Message.Substring(0, [Math]::Min(200, $e.Message.Length)))..." -ForegroundColor Gray
                }
            }
        } catch { }
        
        Write-Host ""
        Write-Host "========== 解决方案 ==========" -ForegroundColor Green
        Write-Host ""
        Write-Host "  最可能的原因: 安装 Containers 功能后需要重启" -ForegroundColor White
        Write-Host ""
        Write-Host "  1. 重启服务器:" -ForegroundColor Yellow
        Write-Host "     Restart-Computer -Force" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  2. 重启后再次运行此脚本" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  3. 如仍失败，手动启动查看详细错误:" -ForegroundColor Yellow
        Write-Host "     & '$dockerdPath' --debug" -ForegroundColor Cyan
        Write-Host ""
        
        $restart = Read-Host "是否立即重启? (y/N)"
        if ($restart -eq "y") {
            Restart-Computer -Force
        }
        exit 1
    }
} else {
    Ok "跳过 Docker 安装步骤"
}

# ========== 步骤7: 安装 Docker Compose ==========
$composePath = Install-DockerCompose -InstallPath $InstallPath -ComposeVersion $ComposeVersion

# ========== 验证安装 ==========
Write-Host ""
Test-DockerInstallation -InstallPath $InstallPath

# ========== 完成 ==========
$dockerData = "$env:ProgramData\Docker"
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Docker CE 安装完成!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  安装路径: $InstallPath"
Write-Host "  数据目录: $dockerData"
Write-Host ""
Write-Host "  常用命令:" -ForegroundColor Yellow
Write-Host "    docker version        - 查看版本"
Write-Host "    docker info           - 查看信息"
Write-Host "    docker ps             - 查看容器"
Write-Host "    docker-compose up -d  - 启动服务"
Write-Host ""
Write-Host "  服务管理:" -ForegroundColor Yellow
Write-Host "    Start-Service Docker  - 启动服务"
Write-Host "    Stop-Service Docker   - 停止服务"
Write-Host "    Restart-Service Docker - 重启服务"
Write-Host ""

# 测试运行
$runTest = Read-Host "是否运行测试容器? (y/N)"
if ($runTest -eq "y") {
    Log "运行测试..."
    & "$InstallPath\docker.exe" run --rm mcr.microsoft.com/windows/nanoserver:ltsc2022 cmd /c "echo Docker is working!"
}

Write-Host ""
Write-Host "安装完成! 现在可以运行 Deploy-Simple.ps1 继续部署" -ForegroundColor Cyan
Write-Host ""
