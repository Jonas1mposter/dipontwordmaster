# Dipont Word Master 数据导出脚本
# 从 Supabase 导出所有表数据到 CSV 文件
# 使用方法: powershell -ExecutionPolicy Bypass -File Export-DipontData.ps1

param(
    [string]$SupabaseUrl = "",
    [string]$ServiceRoleKey = "",
    [string]$OutputDir = ".\export_data",
    [string[]]$Tables = @()
)

$ErrorActionPreference = "Stop"

# ========== 辅助函数 ==========
function Log { param($M) Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $M" -ForegroundColor Cyan }
function Ok { param($M) Write-Host "  [OK] $M" -ForegroundColor Green }
function Warn { param($M) Write-Host "  [WARN] $M" -ForegroundColor Yellow }
function Err { param($M) Write-Host "  [ERR] $M" -ForegroundColor Red }

# ========== 配置 ==========
# 表导出顺序（按依赖关系排列）
$TableOrder = @(
    "badges",
    "name_cards",
    "levels",
    "words",
    "math_words",
    "science_words",
    "seasons",
    "daily_quests",
    "season_pass_items",
    "season_milestones",
    "season_events",
    "teams",
    "team_milestones",
    "profiles",
    "user_roles",
    "team_members",
    "team_applications",
    "team_announcements",
    "team_messages",
    "team_battles",
    "team_battle_participants",
    "team_season_stats",
    "team_milestone_claims",
    "team_weekly_rewards",
    "friendships",
    "friend_requests",
    "friend_battle_invites",
    "blocked_users",
    "messages",
    "ranked_matches",
    "match_queue",
    "learning_progress",
    "math_learning_progress",
    "science_learning_progress",
    "level_progress",
    "combo_records",
    "user_badges",
    "user_name_cards",
    "user_quest_progress",
    "user_season_pass",
    "user_pass_rewards",
    "user_season_milestones",
    "grade_challenges",
    "class_challenges",
    "challenge_rewards",
    "reports"
)

# ========== 开始 ==========
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Dipont Word Master 数据导出工具"
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ========== 验证参数 ==========
if ([string]::IsNullOrEmpty($SupabaseUrl)) {
    $SupabaseUrl = Read-Host "请输入 Supabase URL (例如: https://xxx.supabase.co)"
}

if ([string]::IsNullOrEmpty($ServiceRoleKey)) {
    $ServiceRoleKey = Read-Host "请输入 Service Role Key"
}

# 确保 URL 格式正确
$SupabaseUrl = $SupabaseUrl.TrimEnd('/')
$ApiUrl = "$SupabaseUrl/rest/v1"

# 创建输出目录
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}
$OutputDir = (Resolve-Path $OutputDir).Path

Log "输出目录: $OutputDir"

# ========== 导出函数 ==========
function Export-Table {
    param(
        [string]$TableName,
        [string]$OutputPath
    )
    
    $headers = @{
        "apikey" = $ServiceRoleKey
        "Authorization" = "Bearer $ServiceRoleKey"
        "Content-Type" = "application/json"
        "Prefer" = "return=representation"
    }
    
    $allData = @()
    $offset = 0
    $limit = 1000
    $hasMore = $true
    
    while ($hasMore) {
        $url = "$ApiUrl/$TableName`?select=*&offset=$offset&limit=$limit"
        
        try {
            $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
            
            if ($response -is [array]) {
                $allData += $response
                if ($response.Count -lt $limit) {
                    $hasMore = $false
                } else {
                    $offset += $limit
                }
            } else {
                $allData += $response
                $hasMore = $false
            }
        } catch {
            if ($_.Exception.Response.StatusCode -eq 404) {
                return @{ Count = 0; Error = "表不存在" }
            }
            throw $_
        }
    }
    
    if ($allData.Count -gt 0) {
        # 转换为 CSV
        $allData | Export-Csv -Path $OutputPath -NoTypeInformation -Encoding UTF8
    }
    
    return @{ Count = $allData.Count; Error = $null }
}

# ========== 测试连接 ==========
Log "测试 API 连接..."

try {
    $testHeaders = @{
        "apikey" = $ServiceRoleKey
        "Authorization" = "Bearer $ServiceRoleKey"
    }
    $testUrl = "$ApiUrl/profiles?select=id&limit=1"
    $testResult = Invoke-RestMethod -Uri $testUrl -Headers $testHeaders -Method Get -ErrorAction Stop
    Ok "API 连接成功"
} catch {
    Err "API 连接失败: $_"
    Write-Host ""
    Write-Host "请检查:" -ForegroundColor Yellow
    Write-Host "  1. Supabase URL 是否正确"
    Write-Host "  2. Service Role Key 是否正确（不是 anon key）"
    Write-Host ""
    exit 1
}

# ========== 确定要导出的表 ==========
if ($Tables.Count -eq 0) {
    $Tables = $TableOrder
}

# ========== 导出数据 ==========
Log "开始导出数据..."
Write-Host ""

$stats = @{
    Success = 0
    Failed = 0
    Empty = 0
    TotalRows = 0
}

$startTime = Get-Date

foreach ($table in $Tables) {
    $csvPath = Join-Path $OutputDir "$table.csv"
    Write-Host "  导出 $table... " -NoNewline
    
    try {
        $result = Export-Table -TableName $table -OutputPath $csvPath
        
        if ($result.Error) {
            Write-Host "跳过 ($($result.Error))" -ForegroundColor Yellow
            $stats.Failed++
        } elseif ($result.Count -eq 0) {
            Write-Host "空表" -ForegroundColor Gray
            $stats.Empty++
            # 删除空 CSV
            if (Test-Path $csvPath) { Remove-Item $csvPath -Force }
        } else {
            Write-Host "$($result.Count) 行" -ForegroundColor Green
            $stats.Success++
            $stats.TotalRows += $result.Count
        }
    } catch {
        Write-Host "失败: $_" -ForegroundColor Red
        $stats.Failed++
    }
}

$endTime = Get-Date
$duration = $endTime - $startTime

# ========== 生成导入说明 ==========
$readmePath = Join-Path $OutputDir "README.txt"
@"
Dipont Word Master 数据导出
==========================

导出时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
来源: $SupabaseUrl

文件列表:
$(Get-ChildItem $OutputDir -Filter "*.csv" | ForEach-Object { "  - $($_.Name) ($('{0:N0}' -f $_.Length) bytes)" } | Out-String)

导入说明:
---------
1. 将这些 CSV 文件复制到目标服务器
2. 运行 Import-DipontData.ps1 脚本导入数据

导入命令示例:
powershell -ExecutionPolicy Bypass -File Import-DipontData.ps1 `
    -DBHost "10.20.2.20" `
    -DBPassword "your_password" `
    -CSVDir "$OutputDir"

注意事项:
- 表之间有外键依赖关系，请按正确顺序导入
- profiles 表的 user_id 字段关联 auth.users 表
- 用户密码无法直接迁移，需要用户重新设置
"@ | Out-File -FilePath $readmePath -Encoding UTF8

# ========== 完成 ==========
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  导出完成!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  统计信息:"
Write-Host "    成功: $($stats.Success) 个表"
Write-Host "    空表: $($stats.Empty) 个"
Write-Host "    失败: $($stats.Failed) 个"
Write-Host "    总行数: $('{0:N0}' -f $stats.TotalRows)"
Write-Host "    耗时: $($duration.TotalSeconds.ToString('F1')) 秒"
Write-Host ""
Write-Host "  输出目录: $OutputDir" -ForegroundColor Yellow
Write-Host ""

# 列出导出的文件
$csvFiles = Get-ChildItem $OutputDir -Filter "*.csv"
if ($csvFiles.Count -gt 0) {
    Write-Host "  导出的文件:" -ForegroundColor Cyan
    foreach ($file in $csvFiles) {
        $rowCount = (Get-Content $file.FullName | Measure-Object -Line).Lines - 1
        Write-Host "    $($file.Name): $rowCount 行"
    }
}

Write-Host ""
Write-Host "下一步: 将 $OutputDir 目录复制到目标服务器并运行导入脚本" -ForegroundColor Cyan
Write-Host ""
