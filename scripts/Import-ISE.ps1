# Dipont Word Master - ISE Compatible Import Script
# Usage: .\Import-ISE.ps1 -CSVDir "C:\path\to\csv"

param(
    [Parameter(Mandatory = $true)]
    [string]$CSVDir,
    [string]$Container = "supabase-db"
)

$ErrorActionPreference = "Stop"

# Table import order (by foreign key dependencies)
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

# ============================================
# Main
# ============================================

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Dipont Word Master Data Import (ISE)     " -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check CSV directory
if (-not (Test-Path -LiteralPath $CSVDir)) {
    Write-Host "[ERROR] CSV directory not found: $CSVDir" -ForegroundColor Red
    return
}
Write-Host "[INFO] CSV Directory: $CSVDir" -ForegroundColor Gray

# Check Docker container
Write-Host "[INFO] Checking Docker container..." -ForegroundColor Gray
$running = $null
try {
    $running = docker ps --filter "name=$Container" --format "{{.Names}}" 2>$null
} catch {
    Write-Host "[ERROR] Docker command failed: $_" -ForegroundColor Red
    return
}

if (-not $running) {
    Write-Host "[ERROR] Docker container '$Container' is not running" -ForegroundColor Red
    Write-Host "[INFO] Please start Supabase: docker-compose up -d" -ForegroundColor Yellow
    return
}
Write-Host "[OK] Docker container '$Container' is running" -ForegroundColor Green

# Test database connection
Write-Host "[INFO] Testing database connection..." -ForegroundColor Gray
$testResult = docker exec $Container psql -U postgres -d postgres -c "SELECT 1" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Database connection failed" -ForegroundColor Red
    return
}
Write-Host "[OK] Database connection successful" -ForegroundColor Green
Write-Host ""

# Statistics
$stats = @{
    Success = 0
    Skipped = 0
    Failed = 0
    Rows = 0
}

# Import each table
foreach ($table in $Tables) {
    $csvPath = Join-Path $CSVDir "$table.csv"
    
    # Check if file exists
    if (-not (Test-Path -LiteralPath $csvPath)) {
        Write-Host "  [SKIP] $table - file not found" -ForegroundColor Yellow
        $stats.Skipped++
        continue
    }
    
    # Get row count
    $rowCount = 0
    try {
        $reader = [System.IO.StreamReader]::new($csvPath)
        $reader.ReadLine() | Out-Null  # Skip header
        while ($reader.ReadLine() -ne $null) { $rowCount++ }
        $reader.Close()
    } catch {
        Write-Host "  [ERROR] $table - cannot read file" -ForegroundColor Red
        $stats.Failed++
        continue
    }
    
    if ($rowCount -eq 0) {
        Write-Host "  [SKIP] $table - empty file" -ForegroundColor Yellow
        $stats.Skipped++
        continue
    }
    
    Write-Host "  [IMPORT] $table ($rowCount rows)..." -NoNewline
    
    try {
        # Copy CSV to container
        $containerPath = "/tmp/$table.csv"
        docker cp $csvPath "${Container}:$containerPath" 2>$null
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host " FAILED (copy)" -ForegroundColor Red
            $stats.Failed++
            continue
        }
        
        # Execute import
        $sql = "\COPY $table FROM '$containerPath' WITH CSV HEADER"
        $result = docker exec $Container psql -U postgres -d postgres -c $sql 2>&1
        
        # Cleanup
        docker exec $Container rm -f $containerPath 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host " OK" -ForegroundColor Green
            $stats.Success++
            $stats.Rows += $rowCount
        } else {
            Write-Host " FAILED" -ForegroundColor Red
            Write-Host "    Error: $result" -ForegroundColor Red
            $stats.Failed++
        }
    } catch {
        Write-Host " ERROR: $_" -ForegroundColor Red
        $stats.Failed++
    }
}

# Summary
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Import Summary" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Success:  $($stats.Success)" -ForegroundColor Green
Write-Host "  Skipped:  $($stats.Skipped)" -ForegroundColor Yellow
Write-Host "  Failed:   $($stats.Failed)" -ForegroundColor $(if ($stats.Failed -gt 0) { "Red" } else { "Gray" })
Write-Host "  Rows:     $($stats.Rows)" -ForegroundColor White
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan

if ($stats.Failed -gt 0) {
    Write-Host ""
    Write-Host "  [WARNING] Some tables failed to import" -ForegroundColor Yellow
}
