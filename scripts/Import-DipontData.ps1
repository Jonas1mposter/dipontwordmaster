#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Dipont Word Master 数据导入脚本

.DESCRIPTION
    从 CSV 文件批量导入数据到 Supabase 数据库，支持：
    - 自动处理外键依赖顺序
    - 数据验证和错误处理
    - 断点续传
    - 详细日志记录

.PARAMETER DBHost
    数据库主机地址

.PARAMETER DBPort
    数据库端口

.PARAMETER DBUser
    数据库用户名

.PARAMETER DBPassword
    数据库密码

.PARAMETER DBName
    数据库名称

.PARAMETER CSVDir
    CSV 文件目录

.PARAMETER Tables
    要导入的表（逗号分隔），留空则导入所有表

.PARAMETER SkipExisting
    跳过已有数据的表

.PARAMETER DryRun
    仅验证数据，不实际导入

.EXAMPLE
    .\Import-DipontData.ps1 -DBHost "10.20.2.20" -CSVDir "C:\Data\export"

.EXAMPLE
    .\Import-DipontData.ps1 -DBHost "10.20.2.20" -CSVDir "C:\Data\export" -Tables "words,profiles" -DryRun

.NOTES
    Author: Dipont Word Master Team
    Version: 1.0.0
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$DBHost = "10.20.2.20",
    
    [Parameter()]
    [int]$DBPort = 5432,
    
    [Parameter()]
    [string]$DBUser = "postgres",
    
    [Parameter()]
    [string]$DBPassword = "",
    
    [Parameter()]
    [string]$DBName = "postgres",
    
    [Parameter(Mandatory = $true)]
    [string]$CSVDir,
    
    [Parameter()]
    [string]$Tables = "",
    
    [Parameter()]
    [switch]$SkipExisting,
    
    [Parameter()]
    [switch]$DryRun,
    
    [Parameter()]
    [switch]$UseDocker,
    
    [Parameter()]
    [string]$DockerContainer = "supabase-db"
)

# ============================================
# 配置
# ============================================
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# 日志目录
$LogDir = Join-Path $CSVDir "logs"
$LogFile = Join-Path $LogDir "import_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

# 表导入顺序（按外键依赖排序）
$TableOrder = @(
    # ==========================================
    # 第一层：无外键依赖的基础表
    # ==========================================
    @{ Name = "badges"; Description = "徽章定义" },
    @{ Name = "name_cards"; Description = "名片定义" },
    @{ Name = "levels"; Description = "关卡配置" },
    @{ Name = "words"; Description = "英语单词" },
    @{ Name = "math_words"; Description = "数学词汇" },
    @{ Name = "science_words"; Description = "科学词汇" },
    @{ Name = "daily_quests"; Description = "每日任务" },
    @{ Name = "seasons"; Description = "赛季配置" },
    
    # ==========================================
    # 第二层：依赖 seasons
    # ==========================================
    @{ Name = "season_pass_items"; Description = "赛季通行证奖励" },
    @{ Name = "season_milestones"; Description = "赛季里程碑" },
    @{ Name = "season_events"; Description = "赛季活动" },
    @{ Name = "team_milestones"; Description = "战队里程碑" },
    
    # ==========================================
    # 第三层：用户相关（依赖 auth.users）
    # ==========================================
    @{ Name = "profiles"; Description = "用户档案"; Special = $true },
    @{ Name = "user_roles"; Description = "用户角色" },
    
    # ==========================================
    # 第四层：依赖 profiles
    # ==========================================
    @{ Name = "teams"; Description = "战队" },
    @{ Name = "team_members"; Description = "战队成员" },
    @{ Name = "friendships"; Description = "好友关系" },
    @{ Name = "friend_requests"; Description = "好友请求" },
    @{ Name = "messages"; Description = "私信消息" },
    @{ Name = "blocked_users"; Description = "屏蔽用户" },
    @{ Name = "user_badges"; Description = "用户徽章" },
    @{ Name = "user_name_cards"; Description = "用户名片" },
    
    # ==========================================
    # 第五层：学习进度
    # ==========================================
    @{ Name = "learning_progress"; Description = "英语学习进度" },
    @{ Name = "math_learning_progress"; Description = "数学学习进度" },
    @{ Name = "science_learning_progress"; Description = "科学学习进度" },
    @{ Name = "level_progress"; Description = "关卡进度" },
    @{ Name = "combo_records"; Description = "连击记录" },
    
    # ==========================================
    # 第六层：对战数据
    # ==========================================
    @{ Name = "ranked_matches"; Description = "排位赛记录" },
    
    # ==========================================
    # 第七层：赛季相关
    # ==========================================
    @{ Name = "user_season_pass"; Description = "用户赛季通行证" },
    @{ Name = "user_pass_rewards"; Description = "通行证奖励领取" },
    @{ Name = "user_season_milestones"; Description = "用户里程碑进度" },
    @{ Name = "user_quest_progress"; Description = "任务进度" },
    
    # ==========================================
    # 第八层：战队相关
    # ==========================================
    @{ Name = "team_applications"; Description = "入队申请" },
    @{ Name = "team_announcements"; Description = "战队公告" },
    @{ Name = "team_messages"; Description = "战队消息" },
    @{ Name = "friend_battle_invites"; Description = "好友对战邀请" },
    
    # ==========================================
    # 第九层：挑战数据
    # ==========================================
    @{ Name = "grade_challenges"; Description = "年级挑战" },
    @{ Name = "class_challenges"; Description = "班级挑战" },
    @{ Name = "challenge_rewards"; Description = "挑战奖励" },
    @{ Name = "team_season_stats"; Description = "战队赛季统计" },
    @{ Name = "team_battles"; Description = "战队对战" },
    @{ Name = "team_battle_participants"; Description = "对战参与者" },
    @{ Name = "team_milestone_claims"; Description = "里程碑领取" },
    @{ Name = "team_weekly_rewards"; Description = "周奖励" },
    
    # ==========================================
    # 第十层：其他
    # ==========================================
    @{ Name = "reports"; Description = "举报记录" }
)

# ============================================
# 辅助函数
# ============================================

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # 控制台输出
    switch ($Level) {
        "INFO" { Write-Host "  ℹ $Message" -ForegroundColor Gray }
        "SUCCESS" { Write-Host "  ✓ $Message" -ForegroundColor Green }
        "WARNING" { Write-Host "  ⚠ $Message" -ForegroundColor Yellow }
        "ERROR" { Write-Host "  ✗ $Message" -ForegroundColor Red }
        "STEP" { Write-Host "`n▶ $Message" -ForegroundColor Cyan }
    }
    
    # 写入日志文件
    Add-Content -Path $LogFile -Value $logMessage -ErrorAction SilentlyContinue
}

function Test-PostgresConnection {
    Write-Log "测试数据库连接..." -Level "STEP"
    
    if ($UseDocker) {
        $result = docker exec $DockerContainer psql -U $DBUser -d $DBName -c "SELECT 1" 2>&1
    } else {
        $env:PGPASSWORD = $DBPassword
        $result = psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -c "SELECT 1" 2>&1
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "数据库连接成功" -Level "SUCCESS"
        return $true
    } else {
        Write-Log "数据库连接失败: $result" -Level "ERROR"
        return $false
    }
}

function Get-TableRowCount {
    param([string]$TableName)
    
    if ($UseDocker) {
        $result = docker exec $DockerContainer psql -U $DBUser -d $DBName -t -c "SELECT COUNT(*) FROM $TableName" 2>$null
    } else {
        $result = psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -t -c "SELECT COUNT(*) FROM $TableName" 2>$null
    }
    
    if ($LASTEXITCODE -eq 0) {
        return [int]($result.Trim())
    }
    return -1
}

function Get-CSVRowCount {
    param([string]$FilePath)
    
    if (-not (Test-Path $FilePath)) {
        return 0
    }
    
    # 使用流式读取以支持大文件
    $count = 0
    $reader = [System.IO.StreamReader]::new($FilePath)
    try {
        # 跳过标题行
        $reader.ReadLine() | Out-Null
        while ($reader.ReadLine() -ne $null) {
            $count++
        }
    } finally {
        $reader.Close()
    }
    
    return $count
}

function Import-CSVToTable {
    param(
        [string]$TableName,
        [string]$CSVPath,
        [string]$Description
    )
    
    Write-Log "导入 $TableName ($Description)..." -Level "STEP"
    
    # 检查 CSV 文件是否存在
    if (-not (Test-Path $CSVPath)) {
        Write-Log "CSV 文件不存在: $CSVPath" -Level "WARNING"
        return @{ Status = "SKIPPED"; Reason = "文件不存在" }
    }
    
    # 获取 CSV 行数
    $csvRowCount = Get-CSVRowCount -FilePath $CSVPath
    if ($csvRowCount -eq 0) {
        Write-Log "CSV 文件为空" -Level "WARNING"
        return @{ Status = "SKIPPED"; Reason = "文件为空" }
    }
    Write-Log "CSV 文件包含 $csvRowCount 行数据" -Level "INFO"
    
    # 检查表中已有数据
    $existingCount = Get-TableRowCount -TableName $TableName
    if ($existingCount -gt 0) {
        if ($SkipExisting) {
            Write-Log "表中已有 $existingCount 行数据，跳过导入" -Level "WARNING"
            return @{ Status = "SKIPPED"; Reason = "表已有数据" }
        } else {
            Write-Log "表中已有 $existingCount 行数据" -Level "INFO"
        }
    }
    
    # 如果是 DryRun 模式
    if ($DryRun) {
        Write-Log "[DRY RUN] 将导入 $csvRowCount 行到 $TableName" -Level "INFO"
        return @{ Status = "DRY_RUN"; Rows = $csvRowCount }
    }
    
    # 执行导入
    $startTime = Get-Date
    
    # 将 CSV 路径转换为 Unix 风格（用于 Docker）
    $unixPath = $CSVPath -replace '\\', '/'
    
    if ($UseDocker) {
        # 复制 CSV 文件到容器
        $containerPath = "/tmp/$TableName.csv"
        docker cp $CSVPath "${DockerContainer}:$containerPath"
        
        # 执行导入
        $sql = "\COPY $TableName FROM '$containerPath' WITH CSV HEADER"
        $result = docker exec $DockerContainer psql -U $DBUser -d $DBName -c $sql 2>&1
        
        # 清理临时文件
        docker exec $DockerContainer rm -f $containerPath 2>$null
    } else {
        $sql = "\COPY $TableName FROM '$CSVPath' WITH CSV HEADER"
        $result = psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -c $sql 2>&1
    }
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    if ($LASTEXITCODE -eq 0) {
        # 验证导入结果
        $newCount = Get-TableRowCount -TableName $TableName
        $importedRows = $newCount - $existingCount
        
        Write-Log "成功导入 $importedRows 行 (耗时 $([math]::Round($duration, 2)) 秒)" -Level "SUCCESS"
        return @{ Status = "SUCCESS"; Rows = $importedRows; Duration = $duration }
    } else {
        Write-Log "导入失败: $result" -Level "ERROR"
        return @{ Status = "FAILED"; Error = $result }
    }
}

function Import-ProfilesWithAuth {
    param([string]$CSVPath)
    
    Write-Log "导入用户档案（特殊处理）..." -Level "STEP"
    
    if (-not (Test-Path $CSVPath)) {
        Write-Log "profiles.csv 不存在" -Level "WARNING"
        return @{ Status = "SKIPPED"; Reason = "文件不存在" }
    }
    
    # 读取 CSV
    $profiles = Import-Csv -Path $CSVPath
    $totalCount = $profiles.Count
    $successCount = 0
    $skipCount = 0
    $errorCount = 0
    
    Write-Log "共 $totalCount 条用户记录" -Level "INFO"
    
    if ($DryRun) {
        Write-Log "[DRY RUN] 将导入 $totalCount 个用户档案" -Level "INFO"
        return @{ Status = "DRY_RUN"; Rows = $totalCount }
    }
    
    foreach ($profile in $profiles) {
        # 检查用户是否已存在
        $checkSql = "SELECT COUNT(*) FROM profiles WHERE user_id = '$($profile.user_id)'"
        
        if ($UseDocker) {
            $exists = docker exec $DockerContainer psql -U $DBUser -d $DBName -t -c $checkSql 2>$null
        } else {
            $exists = psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -t -c $checkSql 2>$null
        }
        
        if ([int]($exists.Trim()) -gt 0) {
            $skipCount++
            continue
        }
        
        # 构建插入语句
        $columns = $profile.PSObject.Properties.Name -join ", "
        $values = $profile.PSObject.Properties.Value | ForEach-Object {
            if ($_ -eq "" -or $_ -eq $null) { "NULL" }
            else { "'$($_ -replace "'", "''")'" }
        }
        $valuesStr = $values -join ", "
        
        $insertSql = "INSERT INTO profiles ($columns) VALUES ($valuesStr) ON CONFLICT (user_id) DO NOTHING"
        
        if ($UseDocker) {
            $result = docker exec $DockerContainer psql -U $DBUser -d $DBName -c $insertSql 2>&1
        } else {
            $result = psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -c $insertSql 2>&1
        }
        
        if ($LASTEXITCODE -eq 0) {
            $successCount++
        } else {
            $errorCount++
            Write-Log "导入用户失败 ($($profile.username)): $result" -Level "WARNING"
        }
    }
    
    Write-Log "用户导入完成: 成功 $successCount, 跳过 $skipCount, 失败 $errorCount" -Level "SUCCESS"
    return @{ Status = "SUCCESS"; Rows = $successCount; Skipped = $skipCount; Errors = $errorCount }
}

function Clear-TableData {
    param([string]$TableName)
    
    $sql = "TRUNCATE TABLE $TableName CASCADE"
    
    if ($UseDocker) {
        docker exec $DockerContainer psql -U $DBUser -d $DBName -c $sql 2>$null
    } else {
        psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -c $sql 2>$null
    }
}

# ============================================
# 主函数
# ============================================
function Main {
    $startTime = Get-Date
    
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║         Dipont Word Master 数据导入脚本                   ║" -ForegroundColor White
    Write-Host "║                    Version 1.0.0                          ║" -ForegroundColor Gray
    Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    # 创建日志目录
    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
    
    Write-Log "数据导入开始" -Level "STEP"
    Write-Log "数据库: $DBHost`:$DBPort/$DBName" -Level "INFO"
    Write-Log "CSV 目录: $CSVDir" -Level "INFO"
    Write-Log "日志文件: $LogFile" -Level "INFO"
    
    if ($DryRun) {
        Write-Log "*** DRY RUN 模式 - 不会实际导入数据 ***" -Level "WARNING"
    }
    
    # 检查 CSV 目录
    if (-not (Test-Path $CSVDir)) {
        Write-Log "CSV 目录不存在: $CSVDir" -Level "ERROR"
        exit 1
    }
    
    # 设置密码环境变量
    if (-not $UseDocker -and $DBPassword) {
        $env:PGPASSWORD = $DBPassword
    }
    
    # 测试数据库连接
    if (-not (Test-PostgresConnection)) {
        exit 1
    }
    
    # 确定要导入的表
    $tablesToImport = @()
    if ($Tables) {
        $requestedTables = $Tables -split ","
        foreach ($t in $requestedTables) {
            $tableInfo = $TableOrder | Where-Object { $_.Name -eq $t.Trim() }
            if ($tableInfo) {
                $tablesToImport += $tableInfo
            } else {
                Write-Log "未知的表: $t" -Level "WARNING"
            }
        }
    } else {
        $tablesToImport = $TableOrder
    }
    
    Write-Log "将导入 $($tablesToImport.Count) 个表" -Level "INFO"
    
    # 统计信息
    $stats = @{
        Total = $tablesToImport.Count
        Success = 0
        Skipped = 0
        Failed = 0
        Rows = 0
    }
    
    # 导入每个表
    foreach ($table in $tablesToImport) {
        $csvPath = Join-Path $CSVDir "$($table.Name).csv"
        
        # 特殊处理 profiles 表
        if ($table.Name -eq "profiles" -and $table.Special) {
            $result = Import-ProfilesWithAuth -CSVPath $csvPath
        } else {
            $result = Import-CSVToTable -TableName $table.Name -CSVPath $csvPath -Description $table.Description
        }
        
        switch ($result.Status) {
            "SUCCESS" { 
                $stats.Success++
                $stats.Rows += $result.Rows
            }
            "SKIPPED" { $stats.Skipped++ }
            "DRY_RUN" { 
                $stats.Success++
                $stats.Rows += $result.Rows
            }
            "FAILED" { $stats.Failed++ }
        }
    }
    
    # 输出统计
    $endTime = Get-Date
    $totalDuration = ($endTime - $startTime).TotalSeconds
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  导入完成统计" -ForegroundColor White
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  表总数:     $($stats.Total)" -ForegroundColor White
    Write-Host "  成功:       $($stats.Success)" -ForegroundColor Green
    Write-Host "  跳过:       $($stats.Skipped)" -ForegroundColor Yellow
    Write-Host "  失败:       $($stats.Failed)" -ForegroundColor $(if ($stats.Failed -gt 0) { "Red" } else { "Gray" })
    Write-Host "  导入行数:   $($stats.Rows)" -ForegroundColor White
    Write-Host "  总耗时:     $([math]::Round($totalDuration, 2)) 秒" -ForegroundColor White
    Write-Host ""
    Write-Host "  日志文件:   $LogFile" -ForegroundColor Gray
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    
    if ($stats.Failed -gt 0) {
        Write-Host ""
        Write-Host "  ⚠ 部分表导入失败，请检查日志文件" -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
}

# 运行
Main
