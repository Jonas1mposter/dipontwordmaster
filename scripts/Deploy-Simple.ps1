# Dipont Word Master 简化部署脚本
# 使用方法: powershell -ExecutionPolicy Bypass -File Deploy-Simple.ps1

param(
    [string]$ServerIP = "10.20.2.20",
    [string]$PostgresPassword = "",
    [string]$JwtSecret = "",
    [string]$WorkDir = "C:\Supabase"
)

$ErrorActionPreference = "Stop"

# ========== 辅助函数 ==========
function Log { param($Msg) Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Msg" -ForegroundColor Cyan }
function Ok { param($Msg) Write-Host "  [OK] $Msg" -ForegroundColor Green }
function Warn { param($Msg) Write-Host "  [WARN] $Msg" -ForegroundColor Yellow }
function Err { param($Msg) Write-Host "  [ERR] $Msg" -ForegroundColor Red }

function New-Password {
    param([int]$Len = 24)
    $c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return -join ((1..$Len) | ForEach-Object { $c[(Get-Random -Maximum $c.Length)] })
}

# ========== 检查管理员权限 ==========
Log "检查管理员权限..."
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Err "请以管理员身份运行此脚本"
    exit 1
}
Ok "管理员权限已确认"

# ========== 步骤1: 安装 Containers 功能 ==========
Log "步骤 1/8: 检查 Containers 功能..."
$containers = Get-WindowsFeature -Name Containers -ErrorAction SilentlyContinue
if ($containers -and -not $containers.Installed) {
    Log "安装 Containers 功能..."
    Install-WindowsFeature -Name Containers -IncludeManagementTools
    Ok "Containers 功能已安装"
} else {
    Ok "Containers 功能已存在"
}

# ========== 步骤2: 安装 Hyper-V ==========
Log "步骤 2/8: 检查 Hyper-V..."
$hyperv = Get-WindowsFeature -Name Hyper-V -ErrorAction SilentlyContinue
if ($hyperv -and -not $hyperv.Installed) {
    Log "安装 Hyper-V..."
    Install-WindowsFeature -Name Hyper-V -IncludeManagementTools
    Ok "Hyper-V 已安装"
    Warn "可能需要重启系统"
} else {
    Ok "Hyper-V 已存在"
}

# ========== 步骤3: 安装 Docker ==========
Log "步骤 3/8: 检查 Docker..."
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCmd) {
    Log "安装 Docker..."
    
    # 方法1: 使用官方安装脚本
    Log "下载 Docker 安装脚本..."
    $dockerUrl = "https://get.docker.com/builds/Windows/x86_64/docker-latest.zip"
    $dockerZip = "$env:TEMP\docker.zip"
    $dockerPath = "$env:ProgramFiles\Docker"
    
    try {
        # 尝试使用 Chocolatey 安装
        $choco = Get-Command choco -ErrorAction SilentlyContinue
        if ($choco) {
            Log "使用 Chocolatey 安装 Docker Desktop..."
            choco install docker-desktop -y
            Ok "Docker Desktop 已通过 Chocolatey 安装"
        } else {
            # 直接下载 Docker CE
            Log "下载 Docker CE..."
            $dockerCeUrl = "https://download.docker.com/win/static/stable/x86_64/docker-24.0.7.zip"
            Invoke-WebRequest -Uri $dockerCeUrl -OutFile $dockerZip -UseBasicParsing
            
            # 解压
            Log "解压 Docker..."
            if (-not (Test-Path $dockerPath)) {
                New-Item -ItemType Directory -Path $dockerPath -Force | Out-Null
            }
            Expand-Archive -Path $dockerZip -DestinationPath $dockerPath -Force
            
            # 移动文件到正确位置
            if (Test-Path "$dockerPath\docker") {
                Get-ChildItem "$dockerPath\docker\*" | Move-Item -Destination $dockerPath -Force
                Remove-Item "$dockerPath\docker" -Force -Recurse
            }
            
            # 添加到 PATH
            $path = [Environment]::GetEnvironmentVariable("Path", "Machine")
            if ($path -notlike "*$dockerPath*") {
                [Environment]::SetEnvironmentVariable("Path", "$path;$dockerPath", "Machine")
                $env:Path = "$env:Path;$dockerPath"
            }
            
            # 注册 Docker 服务
            Log "注册 Docker 服务..."
            & "$dockerPath\dockerd.exe" --register-service
            
            # 清理
            Remove-Item $dockerZip -Force -ErrorAction SilentlyContinue
            
            Ok "Docker CE 已安装"
        }
    } catch {
        Err "Docker 安装失败: $_"
        Write-Host ""
        Write-Host "请手动安装 Docker Desktop:" -ForegroundColor Yellow
        Write-Host "  1. 下载: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" -ForegroundColor Cyan
        Write-Host "  2. 安装完成后重新运行此脚本" -ForegroundColor Cyan
        Write-Host ""
        exit 1
    }
    
    Warn "请重启系统后再次运行此脚本"
    exit 0
} else {
    Ok "Docker 已安装: $(docker --version)"
}

# ========== 步骤4: 安装 Docker Compose ==========
Log "步骤 4/8: 检查 Docker Compose..."
$composePath = "$env:ProgramFiles\Docker\docker-compose.exe"
$useStandaloneCompose = $false

if (Test-Path $composePath) {
    Ok "Docker Compose 已存在"
    $useStandaloneCompose = $true
} else {
    # 检查 docker compose (内置插件版本)
    $hasBuiltinCompose = $false
    try {
        $composeTest = docker compose version 2>&1 | Out-String
        if ($composeTest -match "version") {
            Ok "使用 Docker 内置 compose 命令"
            $hasBuiltinCompose = $true
        }
    } catch {}
    
    if (-not $hasBuiltinCompose) {
        Log "尝试下载 Docker Compose..."
        $url = "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-windows-x86_64.exe"
        
        $dockerDir = "$env:ProgramFiles\Docker"
        if (-not (Test-Path $dockerDir)) {
            New-Item -ItemType Directory -Path $dockerDir -Force | Out-Null
        }
        
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri $url -OutFile $composePath -UseBasicParsing -TimeoutSec 60
            $useStandaloneCompose = $true
            
            # 添加到 PATH
            $path = [Environment]::GetEnvironmentVariable("Path", "Machine")
            if ($path -notlike "*$dockerDir*") {
                [Environment]::SetEnvironmentVariable("Path", "$path;$dockerDir", "Machine")
                $env:Path = "$env:Path;$dockerDir"
            }
            Ok "Docker Compose 已安装"
        } catch {
            Warn "Docker Compose 下载失败，将使用 docker compose 命令"
            $useStandaloneCompose = $false
        }
    }
}

# ========== 步骤5: 启动 Docker 服务 ==========
Log "步骤 5/8: 启动 Docker 服务..."
$svc = Get-Service -Name Docker -ErrorAction SilentlyContinue
if ($svc) {
    if ($svc.Status -ne "Running") {
        Start-Service Docker
        Start-Sleep -Seconds 5
    }
    Set-Service -Name Docker -StartupType Automatic
    Ok "Docker 服务运行中"
} else {
    Warn "Docker 服务未找到，请重启系统"
    exit 0
}

# ========== 步骤6: 安装 Supabase ==========
Log "步骤 6/8: 安装 Supabase..."

# 创建工作目录
if (-not (Test-Path $WorkDir)) {
    New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null
}

# 生成密码
if ([string]::IsNullOrEmpty($PostgresPassword)) {
    $PostgresPassword = New-Password -Len 24
    Log "已生成 PostgreSQL 密码"
}
if ([string]::IsNullOrEmpty($JwtSecret)) {
    $JwtSecret = New-Password -Len 40
    Log "已生成 JWT 密钥"
}

# 下载 Supabase Docker 配置（不依赖 Git）
$supabaseDir = Join-Path $WorkDir "supabase"
$dockerPath = Join-Path $supabaseDir "docker"

if (-not (Test-Path $dockerPath)) {
    Log "下载 Supabase Docker 配置..."
    
    # 创建目录
    New-Item -ItemType Directory -Path $dockerPath -Force | Out-Null
    New-Item -ItemType Directory -Path "$dockerPath\volumes\db" -Force | Out-Null
    
    # 下载必需文件
    $baseUrl = "https://raw.githubusercontent.com/supabase/supabase/master/docker"
    $files = @(
        "docker-compose.yml",
        ".env.example"
    )
    
    foreach ($file in $files) {
        $destFile = Join-Path $dockerPath $file
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri "$baseUrl/$file" -OutFile $destFile -UseBasicParsing -TimeoutSec 120
            Ok "已下载: $file"
        } catch {
            Err "下载 $file 失败: $_"
            exit 1
        }
    }
    
    # 下载数据库初始化脚本
    $initSqlUrl = "https://raw.githubusercontent.com/supabase/supabase/master/docker/volumes/db/init/data.sql"
    $initSqlDir = Join-Path $dockerPath "volumes\db\init"
    New-Item -ItemType Directory -Path $initSqlDir -Force | Out-Null
    try {
        Invoke-WebRequest -Uri $initSqlUrl -OutFile "$initSqlDir\data.sql" -UseBasicParsing -TimeoutSec 120
        Ok "已下载: data.sql"
    } catch {
        Warn "数据库初始化脚本下载失败，将使用默认配置"
    }
    
    Ok "Supabase Docker 配置已下载"
} else {
    Ok "Supabase 目录已存在"
}

# 配置环境变量
$dockerPath = Join-Path $supabaseDir "docker"
Push-Location $dockerPath

$envFile = @"
POSTGRES_PASSWORD=$PostgresPassword
JWT_SECRET=$JwtSecret
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_PORT=5432
SITE_URL=http://${ServerIP}:3000
API_EXTERNAL_URL=http://${ServerIP}:8000
SUPABASE_PUBLIC_URL=http://${ServerIP}:8000
STUDIO_PORT=3000
STUDIO_DEFAULT_ORGANIZATION=Dipont
STUDIO_DEFAULT_PROJECT=WordMaster
GOTRUE_SITE_URL=http://${ServerIP}:3000
GOTRUE_EXTERNAL_EMAIL_ENABLED=true
GOTRUE_MAILER_AUTOCONFIRM=true
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=true
"@

$envFile | Out-File -FilePath ".env" -Encoding ASCII -Force
Ok "环境配置已创建"

# 定义 compose 命令函数
function Invoke-Compose {
    param([string]$Args)
    if ($useStandaloneCompose) {
        $cmd = "docker-compose $Args"
    } else {
        $cmd = "docker compose $Args"
    }
    Invoke-Expression $cmd
}

# 启动服务
Log "拉取 Docker 镜像（可能需要几分钟）..."
try {
    Invoke-Compose "pull"
} catch {
    Warn "镜像拉取出现问题: $_"
}

Log "启动 Supabase 服务..."
try {
    Invoke-Compose "up -d"
} catch {
    Err "服务启动失败: $_"
}

Pop-Location

# 等待容器启动
Log "等待容器启动（30秒）..."
Start-Sleep -Seconds 30

# 检查容器状态
$runningContainers = docker ps --format "{{.Names}}" 2>$null | Out-String
if ($runningContainers -match "supabase") {
    Ok "Supabase 容器运行中"
} else {
    Warn "容器可能未完全启动，请运行: docker ps 检查状态"
    Write-Host ""
    Write-Host "如需手动启动，请执行:" -ForegroundColor Yellow
    Write-Host "  cd $dockerPath" -ForegroundColor Cyan
    Write-Host "  docker compose up -d" -ForegroundColor Cyan
    Write-Host ""
}

# ========== 步骤7: 配置防火墙 ==========
Log "步骤 7/8: 配置防火墙..."

$ports = @(
    @{N="API"; P=8000},
    @{N="Studio"; P=3000},
    @{N="PostgreSQL"; P=5432},
    @{N="HTTP"; P=80},
    @{N="HTTPS"; P=443}
)

foreach ($r in $ports) {
    $name = "Dipont-$($r.N)"
    $existing = Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
    if (-not $existing) {
        New-NetFirewallRule -DisplayName $name -Direction Inbound -Protocol TCP -LocalPort $r.P -Action Allow -Profile Any | Out-Null
        Ok "$($r.N) (端口 $($r.P))"
    } else {
        Ok "$($r.N) 规则已存在"
    }
}

# ========== 步骤8: 启用 Realtime ==========
Log "步骤 8/8: 启用 Realtime..."

# 等待数据库容器就绪
$dbReady = $false
for ($i = 1; $i -le 6; $i++) {
    $dbContainer = docker ps --filter "name=supabase-db" --format "{{.Names}}" 2>$null | Out-String
    if ($dbContainer -match "supabase") {
        $dbReady = $true
        break
    }
    Log "等待数据库容器... ($i/6)"
    Start-Sleep -Seconds 10
}

if ($dbReady) {
    $tables = @("ranked_matches", "match_queue", "team_messages", "messages")
    foreach ($t in $tables) {
        $result = docker exec supabase-db psql -U postgres -d postgres -c "ALTER PUBLICATION supabase_realtime ADD TABLE public.$t;" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Ok $t
        } else {
            Warn "$t (稍后手动配置)"
        }
    }
} else {
    Warn "数据库容器未就绪，请稍后手动启用 Realtime"
    Write-Host "  手动命令示例:" -ForegroundColor Yellow
    Write-Host "  docker exec supabase-db psql -U postgres -d postgres -c `"ALTER PUBLICATION supabase_realtime ADD TABLE public.ranked_matches;`"" -ForegroundColor Cyan
}

# ========== 完成 ==========
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  部署完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Supabase Studio: http://${ServerIP}:3000"
Write-Host "  Supabase API:    http://${ServerIP}:8000"
Write-Host ""
Write-Host "  PostgreSQL:"
Write-Host "    主机: $ServerIP"
Write-Host "    端口: 5432"
Write-Host "    用户: postgres"
Write-Host "    密码: $PostgresPassword"
Write-Host ""
Write-Host "  JWT Secret: $JwtSecret"
Write-Host ""

# 保存凭据
$credFile = Join-Path $WorkDir "credentials.txt"
@"
Dipont Word Master 凭据
生成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

服务器: $ServerIP
PostgreSQL 密码: $PostgresPassword
JWT Secret: $JwtSecret

Studio: http://${ServerIP}:3000
API: http://${ServerIP}:8000
"@ | Out-File -FilePath $credFile -Encoding ASCII

Write-Host "  凭据已保存: $credFile" -ForegroundColor Yellow
Write-Host ""
