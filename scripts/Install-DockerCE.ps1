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

# ========== 辅助函数 ==========
function Log { param($M) Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $M" -ForegroundColor Cyan }
function Ok { param($M) Write-Host "  [OK] $M" -ForegroundColor Green }
function Warn { param($M) Write-Host "  [WARN] $M" -ForegroundColor Yellow }
function Err { param($M) Write-Host "  [ERR] $M" -ForegroundColor Red }

# ========== 开始 ==========
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Docker CE 安装脚本 (Windows Server)"
Write-Host "  Docker: $DockerVersion | Compose: $ComposeVersion"
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ========== 步骤1: 检查系统 ==========
Log "步骤 1/7: 检查系统要求..."

# 检查 Windows 版本
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

$containersFeature = Get-WindowsFeature -Name Containers -ErrorAction SilentlyContinue
if ($containersFeature) {
    if (-not $containersFeature.Installed) {
        Log "正在安装 Containers 功能..."
        $result = Install-WindowsFeature -Name Containers
        if ($result.RestartNeeded -eq "Yes") {
            Warn "需要重启系统完成 Containers 功能安装"
            $restart = Read-Host "是否立即重启? (y/N)"
            if ($restart -eq "y") {
                Restart-Computer -Force
            }
            exit 0
        }
        Ok "Containers 功能已安装"
    } else {
        Ok "Containers 功能已存在"
    }
} else {
    # 可能是 Windows 10/11，使用可选功能
    $feature = Get-WindowsOptionalFeature -Online -FeatureName Containers -ErrorAction SilentlyContinue
    if ($feature -and $feature.State -ne "Enabled") {
        Enable-WindowsOptionalFeature -Online -FeatureName Containers -All -NoRestart
        Ok "Containers 功能已启用"
    } else {
        Ok "Containers 功能已存在"
    }
}

# ========== 步骤3: 下载 Docker CE ==========
Log "步骤 3/7: 下载 Docker CE $DockerVersion..."

$dockerZip = "$env:TEMP\docker-$DockerVersion.zip"
$dockerUrl = "https://download.docker.com/win/static/stable/x86_64/docker-$DockerVersion.zip"

# 检查是否已安装
$existingDocker = Get-Command docker -ErrorAction SilentlyContinue
if ($existingDocker) {
    $currentVersion = docker version --format "{{.Server.Version}}" 2>$null
    if ($currentVersion) {
        Log "已安装 Docker $currentVersion"
        $reinstall = Read-Host "是否重新安装? (y/N)"
        if ($reinstall -ne "y") {
            Ok "跳过 Docker 安装"
            goto :compose
        }
    }
}

# 下载
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

# ========== 步骤4: 解压并安装 Docker ==========
Log "步骤 4/7: 安装 Docker..."

# 停止现有服务
$dockerService = Get-Service -Name Docker -ErrorAction SilentlyContinue
if ($dockerService -and $dockerService.Status -eq "Running") {
    Log "停止现有 Docker 服务..."
    Stop-Service Docker -Force
    Start-Sleep -Seconds 3
}

# 创建安装目录
if (-not (Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
}

# 解压
Log "解压文件..."
Expand-Archive -Path $dockerZip -DestinationPath $env:TEMP\docker-extract -Force

# 复制文件
$extractedPath = "$env:TEMP\docker-extract\docker"
if (Test-Path $extractedPath) {
    Get-ChildItem $extractedPath | Copy-Item -Destination $InstallPath -Force
} else {
    Get-ChildItem "$env:TEMP\docker-extract" | Copy-Item -Destination $InstallPath -Force -Recurse
}

# 清理临时文件
Remove-Item "$env:TEMP\docker-extract" -Recurse -Force -ErrorAction SilentlyContinue

Ok "Docker 文件已安装到: $InstallPath"

# ========== 步骤5: 配置环境变量 ==========
Log "步骤 5/7: 配置环境变量..."

$machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($machinePath -notlike "*$InstallPath*") {
    [Environment]::SetEnvironmentVariable("Path", "$machinePath;$InstallPath", "Machine")
    $env:Path = "$env:Path;$InstallPath"
    Ok "已添加到系统 PATH"
} else {
    Ok "PATH 已配置"
}

# ========== 步骤6: 注册并启动 Docker 服务 ==========
Log "步骤 6/7: 注册 Docker 服务..."

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
if (Test-Path $dockerdPath) {
    # 先移除旧服务
    $existingService = Get-Service -Name Docker -ErrorAction SilentlyContinue
    if ($existingService) {
        Log "移除旧的 Docker 服务..."
        sc.exe delete Docker | Out-Null
        Start-Sleep -Seconds 2
    }
    
    # 注册新服务
    Log "注册 Docker 服务..."
    & $dockerdPath --register-service
    
    if ($LASTEXITCODE -eq 0) {
        Ok "Docker 服务已注册"
    } else {
        # 尝试使用 sc.exe 注册
        sc.exe create Docker binPath= "$dockerdPath --run-service" start= auto | Out-Null
        Ok "Docker 服务已通过 sc.exe 注册"
    }
    
    # 设置服务属性
    Set-Service -Name Docker -StartupType Automatic -ErrorAction SilentlyContinue
    
    # 启动服务
    Log "启动 Docker 服务..."
    try {
        Start-Service Docker -ErrorAction Stop
        Start-Sleep -Seconds 5
        
        $svc = Get-Service -Name Docker
        if ($svc.Status -eq "Running") {
            Ok "Docker 服务运行中"
        } else {
            Warn "Docker 服务状态: $($svc.Status)"
        }
    } catch {
        Err "Docker 服务启动失败: $_"
        Write-Host ""
        Write-Host "========== 诊断信息 ==========" -ForegroundColor Yellow
        
        # 检查 Windows 功能
        $containers = Get-WindowsFeature -Name Containers -ErrorAction SilentlyContinue
        if ($containers) {
            Write-Host "  Containers 功能: $(if($containers.Installed){'已安装'}else{'未安装'})" -ForegroundColor Cyan
        }
        
        $hyperv = Get-WindowsFeature -Name Hyper-V -ErrorAction SilentlyContinue
        if ($hyperv) {
            Write-Host "  Hyper-V 功能: $(if($hyperv.Installed){'已安装'}else{'未安装'})" -ForegroundColor Cyan
        }
        
        # 尝试手动启动查看错误
        Write-Host ""
        Write-Host "  尝试手动启动 Docker 守护进程..." -ForegroundColor Yellow
        $testResult = & "$dockerdPath" --version 2>&1
        Write-Host "  Docker 版本: $testResult" -ForegroundColor Cyan
        
        # 检查事件日志
        Write-Host ""
        Write-Host "  最近的 Docker 事件日志:" -ForegroundColor Yellow
        try {
            $events = Get-WinEvent -FilterHashtable @{LogName='Application'; ProviderName='Docker'; Level=1,2,3} -MaxEvents 5 -ErrorAction SilentlyContinue
            if ($events) {
                foreach ($e in $events) {
                    Write-Host "    [$($e.TimeCreated)] $($e.Message)" -ForegroundColor Gray
                }
            } else {
                Write-Host "    无 Docker 相关日志" -ForegroundColor Gray
            }
        } catch {
            Write-Host "    无法读取事件日志" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "========== 解决方案 ==========" -ForegroundColor Green
        Write-Host "  1. 重启服务器后再试:" -ForegroundColor White
        Write-Host "     Restart-Computer -Force" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  2. 手动启动 Docker 查看详细错误:" -ForegroundColor White
        Write-Host "     & '$dockerdPath' --debug" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  3. 确保 Containers 功能已安装:" -ForegroundColor White
        Write-Host "     Install-WindowsFeature -Name Containers -Restart" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  4. 如果是 Windows Server 2019+，尝试启用 Hyper-V:" -ForegroundColor White
        Write-Host "     Install-WindowsFeature -Name Hyper-V -IncludeManagementTools -Restart" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  5. 检查防火墙/杀毒软件是否阻止了 Docker" -ForegroundColor White
        Write-Host ""
        
        $retry = Read-Host "是否在安装 Containers 功能后重启? (y/N)"
        if ($retry -eq "y") {
            Install-WindowsFeature -Name Containers -Restart
        }
        
        exit 1
    }
} else {
    Err "找不到 dockerd.exe: $dockerdPath"
    exit 1
}

# ========== 步骤7: 安装 Docker Compose ==========
:compose
Log "步骤 7/7: 安装 Docker Compose $ComposeVersion..."

$composePath = "$InstallPath\docker-compose.exe"
$composeUrl = "https://github.com/docker/compose/releases/download/v$ComposeVersion/docker-compose-windows-x86_64.exe"

if (-not (Test-Path $composePath)) {
    Log "下载 Docker Compose..."
    try {
        Invoke-WebRequest -Uri $composeUrl -OutFile $composePath -UseBasicParsing
        Ok "Docker Compose 已安装"
    } catch {
        Warn "Docker Compose 下载失败，请手动安装"
        Write-Host "  下载地址: $composeUrl" -ForegroundColor Cyan
    }
} else {
    Ok "Docker Compose 已存在"
}

# ========== 验证安装 ==========
Write-Host ""
Log "验证安装..."

# 刷新环境变量
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")

# 验证 Docker
try {
    $dockerVersion = & "$InstallPath\docker.exe" version 2>&1
    Write-Host ""
    Write-Host "Docker 版本信息:" -ForegroundColor Green
    Write-Host $dockerVersion
} catch {
    Warn "无法获取 Docker 版本，可能需要重启终端"
}

# 验证 Compose
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

# ========== 完成 ==========
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
$runTest = Read-Host "是否运行测试容器 hello-world? (y/N)"
if ($runTest -eq "y") {
    Log "运行测试..."
    docker run --rm hello-world:nanoserver
}

Write-Host ""
Write-Host "安装完成! 现在可以运行 Deploy-Simple.ps1 继续部署 Supabase" -ForegroundColor Cyan
Write-Host ""
