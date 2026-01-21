#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Dipont Word Master 一键部署脚本 (Windows Server)

.DESCRIPTION
    自动完成以下部署步骤：
    1. 安装 Docker Engine 和 Docker Compose
    2. 配置 WSL2 支持
    3. 下载并启动 Supabase
    4. 执行数据库迁移
    5. 配置前端应用

.PARAMETER ServerIP
    服务器 IP 地址，默认为 10.20.2.20

.PARAMETER PostgresPassword
    PostgreSQL 数据库密码

.PARAMETER JwtSecret
    JWT 密钥（至少32字符）

.PARAMETER SkipDocker
    跳过 Docker 安装（如果已安装）

.PARAMETER SkipSupabase
    跳过 Supabase 安装（如果已安装）

.PARAMETER MigrationsPath
    数据库迁移文件目录路径

.EXAMPLE
    .\Deploy-DipontWordMaster.ps1 -ServerIP "10.20.2.20" -PostgresPassword "YourPassword123!"

.NOTES
    Author: Dipont Word Master Team
    Version: 1.0.0
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$ServerIP = "10.20.2.20",
    
    [Parameter()]
    [string]$PostgresPassword = "",
    
    [Parameter()]
    [string]$JwtSecret = "",
    
    [Parameter()]
    [switch]$SkipDocker,
    
    [Parameter()]
    [switch]$SkipSupabase,
    
    [Parameter()]
    [string]$MigrationsPath = "",
    
    [Parameter()]
    [string]$WorkDir = "C:\Supabase"
)

# ============================================
# 配置
# ============================================
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$DOCKER_COMPOSE_VERSION = "v2.24.0"
$SUPABASE_REPO = "https://github.com/supabase/supabase.git"

# 颜色输出函数
function Write-Step { param($Message) Write-Host "`n▶ $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "  ✓ $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "  ⚠ $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "  ✗ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "  ℹ $Message" -ForegroundColor Gray }

# ============================================
# 检查先决条件
# ============================================
function Test-Prerequisites {
    Write-Step "检查系统要求..."
    
    # 检查是否为管理员
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw "请以管理员身份运行此脚本"
    }
    Write-Success "管理员权限"
    
    # 检查 Windows 版本
    $os = Get-CimInstance Win32_OperatingSystem
    Write-Info "操作系统: $($os.Caption) $($os.Version)"
    
    # 检查内存
    $totalMemoryGB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
    if ($totalMemoryGB -lt 8) {
        Write-Warning "内存 $totalMemoryGB GB，建议至少 8GB"
    } else {
        Write-Success "内存: $totalMemoryGB GB"
    }
    
    # 检查磁盘空间
    $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
    $freeSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 2)
    if ($freeSpaceGB -lt 50) {
        Write-Warning "C盘剩余空间 $freeSpaceGB GB，建议至少 50GB"
    } else {
        Write-Success "C盘剩余空间: $freeSpaceGB GB"
    }
}

# ============================================
# 生成密钥
# ============================================
function New-SecurePassword {
    param([int]$Length = 32)
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    return -join ((1..$Length) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
}

function New-JwtKey {
    param(
        [string]$Secret,
        [string]$Role
    )
    
    # 简化版 JWT 生成（生产环境建议使用在线工具）
    $header = @{ alg = "HS256"; typ = "JWT" } | ConvertTo-Json -Compress
    $payload = @{
        role = $Role
        iss = "supabase"
        iat = [int][double]::Parse((Get-Date -UFormat %s))
        exp = [int][double]::Parse((Get-Date).AddYears(10).ToString("yyyyMMdd"))
    } | ConvertTo-Json -Compress
    
    $headerBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($header)).TrimEnd('=').Replace('+', '-').Replace('/', '_')
    $payloadBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($payload)).TrimEnd('=').Replace('+', '-').Replace('/', '_')
    
    # 注意：这只是占位符，实际生产环境需要使用正确的 HMAC-SHA256 签名
    Write-Warning "请使用 https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys 生成正确的 API 密钥"
    
    return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.PLACEHOLDER.$Role"
}

# ============================================
# 安装 Docker
# ============================================
function Install-DockerEngine {
    Write-Step "安装 Docker Engine..."
    
    # 检查是否已安装
    $dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
    if ($dockerInstalled -and -not $SkipDocker) {
        Write-Info "Docker 已安装: $(docker --version)"
        $reinstall = Read-Host "是否重新安装? (y/N)"
        if ($reinstall -ne 'y') {
            Write-Success "跳过 Docker 安装"
            return $false
        }
    }
    
    if ($SkipDocker) {
        Write-Success "跳过 Docker 安装（使用 -SkipDocker 参数）"
        return $false
    }
    
    # 安装 Containers 功能
    Write-Info "安装 Containers 功能..."
    $containersFeature = Get-WindowsFeature -Name Containers
    if (-not $containersFeature.Installed) {
        Install-WindowsFeature -Name Containers -IncludeManagementTools
        Write-Success "Containers 功能已安装"
    } else {
        Write-Info "Containers 功能已存在"
    }
    
    # 安装 Hyper-V
    Write-Info "安装 Hyper-V..."
    $hyperVFeature = Get-WindowsFeature -Name Hyper-V
    if (-not $hyperVFeature.Installed) {
        Install-WindowsFeature -Name Hyper-V -IncludeManagementTools
        Write-Success "Hyper-V 已安装"
    } else {
        Write-Info "Hyper-V 已存在"
    }
    
    # 安装 Docker 提供程序
    Write-Info "安装 Docker 提供程序..."
    if (-not (Get-PackageProvider -Name NuGet -ErrorAction SilentlyContinue)) {
        Install-PackageProvider -Name NuGet -Force -Scope CurrentUser
    }
    
    if (-not (Get-Module -ListAvailable -Name DockerMsftProvider)) {
        Install-Module -Name DockerMsftProvider -Repository PSGallery -Force
    }
    
    # 安装 Docker
    Write-Info "安装 Docker..."
    $dockerPackage = Get-Package -Name docker -ProviderName DockerMsftProvider -ErrorAction SilentlyContinue
    if (-not $dockerPackage) {
        Install-Package -Name docker -ProviderName DockerMsftProvider -Force
    }
    
    Write-Success "Docker Engine 安装完成"
    return $true
}

# ============================================
# 安装 Docker Compose
# ============================================
function Install-DockerCompose {
    Write-Step "安装 Docker Compose..."
    
    $composePath = "$env:ProgramFiles\Docker\docker-compose.exe"
    
    if (Test-Path $composePath) {
        Write-Info "Docker Compose 已存在"
        $version = & $composePath --version 2>$null
        Write-Info "版本: $version"
        return
    }
    
    # 创建目录
    $dockerDir = "$env:ProgramFiles\Docker"
    if (-not (Test-Path $dockerDir)) {
        New-Item -ItemType Directory -Path $dockerDir -Force | Out-Null
    }
    
    # 下载 Docker Compose
    $composeUrl = "https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-windows-x86_64.exe"
    Write-Info "下载 Docker Compose $DOCKER_COMPOSE_VERSION..."
    
    try {
        Invoke-WebRequest -Uri $composeUrl -OutFile $composePath -UseBasicParsing
        Write-Success "Docker Compose 下载完成"
    } catch {
        Write-Error "下载失败: $_"
        throw
    }
    
    # 添加到 PATH
    $machinePath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine)
    if ($machinePath -notlike "*$dockerDir*") {
        [Environment]::SetEnvironmentVariable("Path", "$machinePath;$dockerDir", [EnvironmentVariableTarget]::Machine)
        $env:Path = "$env:Path;$dockerDir"
        Write-Success "已添加到系统 PATH"
    }
}

# ============================================
# 配置 WSL2
# ============================================
function Install-WSL2 {
    Write-Step "配置 WSL2..."
    
    # 检查 WSL 是否可用
    $wslInstalled = Get-Command wsl -ErrorAction SilentlyContinue
    
    if (-not $wslInstalled) {
        Write-Info "安装 WSL..."
        
        # 启用 WSL 功能
        Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -NoRestart -ErrorAction SilentlyContinue
        Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart -ErrorAction SilentlyContinue
        
        Write-Warning "WSL 安装需要重启系统"
        return $true
    }
    
    # 设置 WSL2 为默认
    wsl --set-default-version 2 2>$null
    
    # 检查是否有 Linux 发行版
    $distros = wsl --list --quiet 2>$null
    if (-not $distros) {
        Write-Info "安装 Ubuntu..."
        wsl --install -d Ubuntu --no-launch
        Write-Success "Ubuntu 已安装"
    } else {
        Write-Info "已有 Linux 发行版: $distros"
    }
    
    Write-Success "WSL2 配置完成"
    return $false
}

# ============================================
# 配置 Docker 服务
# ============================================
function Configure-DockerService {
    Write-Step "配置 Docker 服务..."
    
    # 启动 Docker 服务
    $dockerService = Get-Service -Name Docker -ErrorAction SilentlyContinue
    if ($dockerService) {
        if ($dockerService.Status -ne 'Running') {
            Start-Service Docker
            Start-Sleep -Seconds 5
        }
        Set-Service -Name Docker -StartupType Automatic
        Write-Success "Docker 服务已启动并设置为自动启动"
    } else {
        Write-Warning "Docker 服务未找到，可能需要重启系统"
    }
    
    # 创建 Docker 配置
    $configDir = "$env:ProgramData\docker\config"
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }
    
    $daemonConfig = @{
        "log-driver" = "json-file"
        "log-opts" = @{
            "max-size" = "10m"
            "max-file" = "3"
        }
    } | ConvertTo-Json
    
    $daemonConfig | Out-File -FilePath "$configDir\daemon.json" -Encoding UTF8 -Force
    Write-Success "Docker 配置已更新"
}

# ============================================
# 安装 Supabase
# ============================================
function Install-Supabase {
    Write-Step "安装 Supabase..."
    
    if ($SkipSupabase) {
        Write-Success "跳过 Supabase 安装"
        return
    }
    
    # 创建工作目录
    if (-not (Test-Path $WorkDir)) {
        New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null
    }
    Set-Location $WorkDir
    
    # 克隆 Supabase
    $supabaseDir = Join-Path $WorkDir "supabase"
    if (-not (Test-Path $supabaseDir)) {
        Write-Info "克隆 Supabase 仓库..."
        git clone --depth 1 $SUPABASE_REPO
        Write-Success "Supabase 仓库已克隆"
    } else {
        Write-Info "Supabase 目录已存在，跳过克隆"
    }
    
    # 进入 docker 目录
    $dockerDir = Join-Path $supabaseDir "docker"
    Set-Location $dockerDir
    
    # 生成密码和密钥
    if ([string]::IsNullOrEmpty($script:PostgresPassword)) {
        $script:PostgresPassword = New-SecurePassword -Length 24
        Write-Info "已生成 PostgreSQL 密码"
    }
    
    if ([string]::IsNullOrEmpty($script:JwtSecret)) {
        $script:JwtSecret = New-SecurePassword -Length 40
        Write-Info "已生成 JWT 密钥"
    }
    
    # 配置 .env 文件
    Write-Info "配置环境变量..."
    
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env" -Force
    }
    
    $envContent = @"
############
# Secrets
############
POSTGRES_PASSWORD=$($script:PostgresPassword)
JWT_SECRET=$($script:JwtSecret)

# 请使用 https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys 生成
# 将下面的占位符替换为生成的密钥
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.PLACEHOLDER_ANON_KEY
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.PLACEHOLDER_SERVICE_KEY

############
# Database
############
POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_PORT=5432

############
# API
############
SITE_URL=http://${ServerIP}:3000
API_EXTERNAL_URL=http://${ServerIP}:8000
SUPABASE_PUBLIC_URL=http://${ServerIP}:8000

############
# Studio
############
STUDIO_PORT=3000
STUDIO_DEFAULT_ORGANIZATION=Dipont
STUDIO_DEFAULT_PROJECT=WordMaster

############
# Auth
############
GOTRUE_SITE_URL=http://${ServerIP}:3000
GOTRUE_EXTERNAL_EMAIL_ENABLED=true
GOTRUE_MAILER_AUTOCONFIRM=true

############
# Other
############
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=true
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding UTF8 -Force
    Write-Success "环境变量已配置"
    
    # 拉取并启动容器
    Write-Info "启动 Supabase 服务（这可能需要几分钟）..."
    docker-compose pull
    docker-compose up -d
    
    # 等待服务启动
    Write-Info "等待服务启动..."
    Start-Sleep -Seconds 30
    
    # 检查服务状态
    $services = docker-compose ps --format json 2>$null | ConvertFrom-Json
    $runningCount = ($services | Where-Object { $_.State -eq "running" }).Count
    $totalCount = $services.Count
    
    Write-Success "Supabase 服务已启动 ($runningCount/$totalCount 运行中)"
}

# ============================================
# 执行数据库迁移
# ============================================
function Invoke-DatabaseMigration {
    Write-Step "执行数据库迁移..."
    
    if ([string]::IsNullOrEmpty($MigrationsPath)) {
        Write-Warning "未指定迁移目录，跳过数据库迁移"
        Write-Info "可以稍后使用以下命令执行迁移："
        Write-Info "  psql -h $ServerIP -p 5432 -U postgres -d postgres -f <migration_file.sql>"
        return
    }
    
    if (-not (Test-Path $MigrationsPath)) {
        Write-Error "迁移目录不存在: $MigrationsPath"
        return
    }
    
    # 检查 psql 是否可用
    $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
    if (-not $psqlPath) {
        # 尝试使用 Docker 内的 psql
        Write-Info "使用 Docker 内置 psql..."
        
        $migrationFiles = Get-ChildItem -Path $MigrationsPath -Filter "*.sql" | Sort-Object Name
        
        foreach ($file in $migrationFiles) {
            Write-Info "执行 $($file.Name)..."
            $sqlContent = Get-Content $file.FullName -Raw
            $result = docker exec -i supabase-db psql -U postgres -d postgres -c $sqlContent 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success $file.Name
            } else {
                Write-Error "$($file.Name): $result"
            }
        }
    } else {
        # 使用本地 psql
        $env:PGPASSWORD = $script:PostgresPassword
        
        $migrationFiles = Get-ChildItem -Path $MigrationsPath -Filter "*.sql" | Sort-Object Name
        
        foreach ($file in $migrationFiles) {
            Write-Info "执行 $($file.Name)..."
            $result = psql -h $ServerIP -p 5432 -U postgres -d postgres -f $file.FullName 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success $file.Name
            } else {
                Write-Error "$($file.Name): $result"
            }
        }
    }
    
    Write-Success "数据库迁移完成"
}

# ============================================
# 启用 Realtime
# ============================================
function Enable-Realtime {
    Write-Step "启用 Realtime..."
    
    $realtimeTables = @(
        "ranked_matches",
        "match_queue",
        "team_messages",
        "team_applications",
        "messages"
    )
    
    foreach ($table in $realtimeTables) {
        $sql = "ALTER PUBLICATION supabase_realtime ADD TABLE public.$table;"
        docker exec supabase-db psql -U postgres -d postgres -c $sql 2>$null
        Write-Success $table
    }
}

# ============================================
# 配置防火墙
# ============================================
function Configure-Firewall {
    Write-Step "配置 Windows 防火墙..."
    
    $ports = @(
        @{ Name = "Supabase API"; Port = 8000; Protocol = "TCP" },
        @{ Name = "Supabase Studio"; Port = 3000; Protocol = "TCP" },
        @{ Name = "PostgreSQL"; Port = 5432; Protocol = "TCP" },
        @{ Name = "Storage API"; Port = 9000; Protocol = "TCP" },
        @{ Name = "HTTP"; Port = 80; Protocol = "TCP" },
        @{ Name = "HTTPS"; Port = 443; Protocol = "TCP" }
    )
    
    foreach ($rule in $ports) {
        $existingRule = Get-NetFirewallRule -DisplayName "Dipont - $($rule.Name)" -ErrorAction SilentlyContinue
        if (-not $existingRule) {
            New-NetFirewallRule -DisplayName "Dipont - $($rule.Name)" `
                -Direction Inbound `
                -Protocol $rule.Protocol `
                -LocalPort $rule.Port `
                -Action Allow `
                -Profile Any | Out-Null
            Write-Success "$($rule.Name) (端口 $($rule.Port))"
        } else {
            Write-Info "$($rule.Name) 规则已存在"
        }
    }
}

# ============================================
# 输出部署信息
# ============================================
function Show-DeploymentInfo {
    Write-Step "部署完成！"
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  Dipont Word Master 部署信息" -ForegroundColor White
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Supabase Studio:  http://${ServerIP}:3000" -ForegroundColor White
    Write-Host "  Supabase API:     http://${ServerIP}:8000" -ForegroundColor White
    Write-Host ""
    Write-Host "  PostgreSQL:" -ForegroundColor Yellow
    Write-Host "    主机: $ServerIP" -ForegroundColor Gray
    Write-Host "    端口: 5432" -ForegroundColor Gray
    Write-Host "    用户: postgres" -ForegroundColor Gray
    Write-Host "    密码: $($script:PostgresPassword)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  JWT Secret: $($script:JwtSecret)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  ⚠ 重要提示:" -ForegroundColor Yellow
    Write-Host "    1. 请使用以下链接生成正确的 API 密钥:" -ForegroundColor Yellow
    Write-Host "       https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "    2. 将生成的 ANON_KEY 和 SERVICE_ROLE_KEY 更新到:" -ForegroundColor Yellow
    Write-Host "       $WorkDir\supabase\docker\.env" -ForegroundColor Gray
    Write-Host ""
    Write-Host "    3. 更新后重启服务:" -ForegroundColor Yellow
    Write-Host "       cd $WorkDir\supabase\docker" -ForegroundColor Gray
    Write-Host "       docker-compose restart" -ForegroundColor Gray
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    
    # 保存凭据到文件
    $credentialsFile = Join-Path $WorkDir "credentials.txt"
    @"
Dipont Word Master 部署凭据
生成时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

服务器 IP: $ServerIP
PostgreSQL 密码: $($script:PostgresPassword)
JWT Secret: $($script:JwtSecret)

请妥善保管此文件！
"@ | Out-File -FilePath $credentialsFile -Encoding UTF8
    
    Write-Host ""
    Write-Host "  凭据已保存到: $credentialsFile" -ForegroundColor Green
    Write-Host ""
}

# ============================================
# 主函数
# ============================================
function Main {
    $startTime = Get-Date
    
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║     Dipont Word Master 一键部署脚本 (Windows Server)      ║" -ForegroundColor White
    Write-Host "║                      Version 1.0.0                        ║" -ForegroundColor Gray
    Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    $needsRestart = $false
    
    try {
        # 1. 检查先决条件
        Test-Prerequisites
        
        # 2. 安装 Docker
        $dockerNeedsRestart = Install-DockerEngine
        $needsRestart = $needsRestart -or $dockerNeedsRestart
        
        # 3. 安装 Docker Compose
        Install-DockerCompose
        
        # 4. 配置 WSL2
        $wslNeedsRestart = Install-WSL2
        $needsRestart = $needsRestart -or $wslNeedsRestart
        
        # 如果需要重启
        if ($needsRestart) {
            Write-Host ""
            Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Yellow
            Write-Host "  需要重启系统以完成安装" -ForegroundColor Yellow
            Write-Host "  重启后请再次运行此脚本以继续部署" -ForegroundColor Yellow
            Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Yellow
            Write-Host ""
            
            $restart = Read-Host "是否立即重启? (y/N)"
            if ($restart -eq 'y') {
                Restart-Computer
            }
            return
        }
        
        # 5. 配置 Docker 服务
        Configure-DockerService
        
        # 6. 安装 Supabase
        Install-Supabase
        
        # 7. 执行数据库迁移
        Invoke-DatabaseMigration
        
        # 8. 启用 Realtime
        Enable-Realtime
        
        # 9. 配置防火墙
        Configure-Firewall
        
        # 10. 显示部署信息
        Show-DeploymentInfo
        
    } catch {
        Write-Host ""
        Write-Error "部署过程中发生错误: $_"
        Write-Host ""
        Write-Host "错误详情:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        Write-Host $_.ScriptStackTrace -ForegroundColor Gray
        exit 1
    }
    
    $endTime = Get-Date
    $duration = $endTime - $startTime
    Write-Host "总耗时: $($duration.Minutes) 分 $($duration.Seconds) 秒" -ForegroundColor Cyan
}

# 运行主函数
Main
