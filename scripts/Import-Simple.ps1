# Dipont Word Master 简化导入脚本
# 用法: .\Import-Simple.ps1 -CSVDir "C:\path\to\csv"

param(
    [Parameter(Mandatory = $true)]
    [string]$CSVDir,
    [string]$Container = "supabase-db"
)

$ErrorActionPreference = "Stop"

# 表导入顺序
$Tables = @(
    "badges", "name_cards", "levels", "words", "math_words", "science_words",
    "daily_quests", "seasons", "season_pass_items", "season_milestones", 
    "season_events", "team_milestones", "profiles", "user_roles", "teams",
    "team_members", "friendships", "friend_requests", "messages", "blocked_users",
    "user_badges", "user_name_cards", "learning_progress", "math_learning_progress",
    "science_learning_progress", "level_progress", "combo_records", "ranked_matches",
    "user_season_pass", "user_pass_rewards", "user_season_milestones",
    "user_quest_progress", "team_applications", "team_announcements", "team_messages",
    "friend_battle_invites", "grade_challenges", "class_challenges", "challenge_rewards",
    "team_season_stats", "team_battles", "team_battle_participants",
    "team_milestone_claims", "team_weekly_rewards", "reports"
)

Write-Host "`n=== Dipont Word Master Import ===" -ForegroundColor Cyan

# 检查目录
if (-not (Test-Path -LiteralPath $CSVDir)) {
    Write-Host "Error: CSV directory not found: $CSVDir" -ForegroundColor Red
    exit 1
}

# 检查 Docker
$running = docker ps --filter "name=$Container" --format "{{.Names}}" 2>$null
if (-not $running) {
    Write-Host "Error: Docker container '$Container' not running" -ForegroundColor Red
    exit 1
}

Write-Host "Container: $Container" -ForegroundColor Gray
Write-Host "CSV Dir: $CSVDir`n" -ForegroundColor Gray

$success = 0
$skipped = 0

foreach ($table in $Tables) {
    $csv = Join-Path $CSVDir "$table.csv"
    
    if (-not (Test-Path -LiteralPath $csv)) {
        Write-Host "  SKIP $table (no file)" -ForegroundColor Yellow
        $skipped++
        continue
    }
    
    Write-Host "  Importing $table..." -NoNewline
    
    try {
        # Copy to container
        docker cp $csv "${Container}:/tmp/$table.csv" 2>$null
        
        # Import
        $sql = "\COPY $table FROM '/tmp/$table.csv' WITH CSV HEADER"
        $result = docker exec $Container psql -U postgres -d postgres -c $sql 2>&1
        
        # Cleanup
        docker exec $Container rm -f "/tmp/$table.csv" 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host " OK" -ForegroundColor Green
            $success++
        } else {
            Write-Host " FAILED: $result" -ForegroundColor Red
        }
    } catch {
        Write-Host " ERROR: $_" -ForegroundColor Red
    }
}

Write-Host "`n=== Done: $success imported, $skipped skipped ===" -ForegroundColor Cyan
