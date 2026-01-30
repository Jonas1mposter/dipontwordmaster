#!/bin/bash
# Dipont Word Master 数据导出脚本 (macOS/Linux)
# 从 Supabase 导出所有表数据到 CSV 文件
# 使用方法: chmod +x export-dipont-data.sh && ./export-dipont-data.sh

set -e

# ========== 配置 ==========
SUPABASE_URL="${SUPABASE_URL:-}"
SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-}"
OUTPUT_DIR="${OUTPUT_DIR:-./export_data}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log() { echo -e "${CYAN}[$(date '+%H:%M:%S')] $1${NC}"; }
ok() { echo -e "  ${GREEN}[OK]${NC} $1"; }
warn() { echo -e "  ${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "  ${RED}[ERR]${NC} $1"; }

# ========== 表列表 ==========
TABLES=(
    "badges"
    "name_cards"
    "levels"
    "words"
    "math_words"
    "science_words"
    "seasons"
    "daily_quests"
    "season_pass_items"
    "season_milestones"
    "season_events"
    "teams"
    "team_milestones"
    "profiles"
    "user_roles"
    "team_members"
    "team_applications"
    "team_announcements"
    "team_messages"
    "team_battles"
    "team_battle_participants"
    "team_season_stats"
    "team_milestone_claims"
    "team_weekly_rewards"
    "friendships"
    "friend_requests"
    "friend_battle_invites"
    "blocked_users"
    "messages"
    "reports"
    "learning_progress"
    "math_learning_progress"
    "science_learning_progress"
    "level_progress"
    "combo_records"
    "user_badges"
    "user_name_cards"
    "user_quest_progress"
    "user_season_pass"
    "user_pass_rewards"
    "user_season_milestones"
    "match_queue"
    "ranked_matches"
    "grade_challenges"
    "class_challenges"
    "challenge_rewards"
)

# ========== 交互式输入 ==========
if [ -z "$SUPABASE_URL" ]; then
    echo ""
    echo "========================================="
    echo "  Dipont Word Master 数据导出工具"
    echo "========================================="
    echo ""
    echo "请输入 Supabase URL"
    echo "(例如: https://ibhvjdnucfmdfmlmnlif.supabase.co)"
    read -p "Supabase URL: " SUPABASE_URL
fi

if [ -z "$SERVICE_ROLE_KEY" ]; then
    echo ""
    echo "请输入 Service Role Key"
    echo "(在 Supabase Dashboard -> Settings -> API 中获取)"
    read -s -p "Service Role Key: " SERVICE_ROLE_KEY
    echo ""
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
    err "必须提供 Supabase URL 和 Service Role Key"
    exit 1
fi

# 移除末尾斜杠
SUPABASE_URL="${SUPABASE_URL%/}"

# ========== 创建输出目录 ==========
log "创建输出目录: $OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"
ok "目录已创建"

# ========== 导出函数 ==========
export_table() {
    local table=$1
    local output_file="$OUTPUT_DIR/${table}.csv"
    
    # 调用 Supabase REST API
    local response=$(curl -s -w "\n%{http_code}" \
        "${SUPABASE_URL}/rest/v1/${table}?select=*" \
        -H "apikey: ${SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
        -H "Accept: text/csv" \
        -H "Content-Type: application/json")
    
    # 分离响应体和状态码
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        if [ -n "$body" ] && [ "$body" != "" ]; then
            echo "$body" > "$output_file"
            local line_count=$(wc -l < "$output_file" | tr -d ' ')
            local row_count=$((line_count - 1))
            if [ $row_count -lt 0 ]; then row_count=0; fi
            ok "$table: $row_count 行"
            return 0
        else
            warn "$table: 空表"
            return 0
        fi
    else
        warn "$table: HTTP $http_code"
        return 1
    fi
}

# ========== 开始导出 ==========
echo ""
log "开始导出数据..."
echo ""

success_count=0
fail_count=0

for table in "${TABLES[@]}"; do
    if export_table "$table"; then
        ((success_count++))
    else
        ((fail_count++))
    fi
done

# ========== 导出统计 ==========
echo ""
echo "========================================="
echo -e "  ${GREEN}导出完成!${NC}"
echo "========================================="
echo ""
echo "  成功: $success_count 个表"
if [ $fail_count -gt 0 ]; then
    echo -e "  ${YELLOW}失败: $fail_count 个表${NC}"
fi
echo ""
echo "  输出目录: $OUTPUT_DIR"
echo ""

# 显示文件列表
echo "导出的文件:"
ls -lh "$OUTPUT_DIR"/*.csv 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'

echo ""
echo "下一步: 将此目录复制到目标服务器并运行导入脚本"
echo ""
