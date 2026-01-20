# Dipont Word Master 自托管部署指南

本指南详细介绍如何将 Dipont Word Master 应用从 Lovable Cloud 迁移到你自己的服务器 (10.20.2.20)。

## 📋 目录

1. [服务器要求](#1-服务器要求)
2. [安装 Supabase 自托管版](#2-安装-supabase-自托管版)
3. [数据库迁移](#3-数据库迁移)
4. [数据导入](#4-数据导入)
5. [存储迁移](#5-存储迁移)
6. [认证配置](#6-认证配置)
7. [Edge Functions 部署](#7-edge-functions-部署)
8. [前端配置](#8-前端配置)
9. [验证与测试](#9-验证与测试)

---

## 1. 服务器要求

### 硬件要求
- **CPU**: 4+ 核心
- **内存**: 8GB+ RAM (推荐 16GB)
- **存储**: 50GB+ SSD
- **网络**: 稳定的网络连接

### 软件要求
- **操作系统**: Ubuntu 22.04 LTS / CentOS 8+ / Debian 11+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Git**: 2.30+

### 端口要求
确保以下端口开放：
- `5432` - PostgreSQL
- `8000` - Supabase API (Kong)
- `3000` - Supabase Studio (可选)
- `9000` - Storage API
- `54321` - PostgREST

---

## 2. 安装 Supabase 自托管版

### 2.1 克隆 Supabase Docker 仓库

```bash
# SSH 到你的服务器
ssh root@10.20.2.20

# 创建工作目录
mkdir -p /opt/supabase
cd /opt/supabase

# 克隆 Supabase Docker 配置
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
```

### 2.2 配置环境变量

```bash
# 复制示例配置
cp .env.example .env

# 编辑配置文件
nano .env
```

**重要配置项**（必须修改）：

```env
############
# Secrets
############
# 使用强密码，可以用 openssl rand -base64 32 生成
POSTGRES_PASSWORD=your_strong_postgres_password
JWT_SECRET=your_jwt_secret_at_least_32_characters_long
ANON_KEY=生成的匿名密钥
SERVICE_ROLE_KEY=生成的服务角色密钥

############
# Database
############
POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_PORT=5432

############
# API
############
SITE_URL=http://10.20.2.20:3000
API_EXTERNAL_URL=http://10.20.2.20:8000
SUPABASE_PUBLIC_URL=http://10.20.2.20:8000

############
# Studio (可选)
############
STUDIO_PORT=3000
```

### 2.3 生成 JWT 密钥

访问 https://supabase.com/docs/guides/self-hosting#api-keys 使用在线工具生成，或使用以下方法：

```bash
# 生成 JWT_SECRET
openssl rand -base64 32

# 使用 JWT_SECRET 生成 ANON_KEY 和 SERVICE_ROLE_KEY
# 需要使用在线工具或脚本
```

### 2.4 启动 Supabase

```bash
# 拉取镜像并启动
docker compose up -d

# 检查服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 2.5 验证安装

```bash
# 检查 API 是否正常
curl http://10.20.2.20:8000/rest/v1/

# 访问 Supabase Studio (如果启用)
# 浏览器打开: http://10.20.2.20:3000
```

---

## 3. 数据库迁移

### 3.1 迁移文件列表

你的项目包含以下迁移文件（位于 `supabase/migrations/` 目录）：

```
supabase/migrations/
├── 20260101000001_initial_schema.sql
├── 20260101000002_create_profiles.sql
├── ... (其他迁移文件)
└── 20260120010914_*.sql
```

### 3.2 执行迁移

**方法一：使用 psql 命令行**

```bash
# 连接到数据库
psql -h 10.20.2.20 -p 5432 -U postgres -d postgres

# 或者使用 Docker
docker exec -it supabase-db psql -U postgres -d postgres
```

**方法二：按顺序执行迁移文件**

```bash
# 在你的本地机器上
for file in supabase/migrations/*.sql; do
  echo "Executing $file..."
  psql -h 10.20.2.20 -p 5432 -U postgres -d postgres -f "$file"
done
```

### 3.3 核心表结构

以下是需要创建的主要表（已包含在迁移文件中）：

- `profiles` - 用户档案
- `words` - 英语单词
- `math_words` - 数学词汇
- `science_words` - 科学词汇
- `levels` - 关卡配置
- `level_progress` - 关卡进度
- `learning_progress` - 学习进度
- `ranked_matches` - 排位赛记录
- `match_queue` - 匹配队列
- `teams` - 战队
- `team_members` - 战队成员
- `friendships` - 好友关系
- `badges` - 徽章
- `seasons` - 赛季
- ... 等其他表

### 3.4 创建数据库函数

确保以下函数已创建（包含在迁移文件中）：

```sql
-- 示例：匹配队列函数
CREATE OR REPLACE FUNCTION public.find_match_in_queue(
  p_profile_id uuid, 
  p_grade integer, 
  p_match_type text, 
  p_elo_rating integer
) RETURNS TABLE(...) AS $function$
...
$function$;

-- 其他必要函数:
-- - cancel_queue_entry
-- - check_queue_status
-- - cleanup_expired_queue_entries
-- - update_team_member_count
-- - sync_profile_team_id
-- - award_welcome_badge
-- - has_role
```

### 3.5 启用 Realtime

```sql
-- 启用需要实时更新的表
ALTER PUBLICATION supabase_realtime ADD TABLE public.ranked_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```

---

## 4. 数据导入

### 4.1 从 Lovable Cloud 导出数据

在 Lovable 项目中：
1. 进入 **Cloud** → **Database** → **Tables**
2. 对每个表点击导出，选择 CSV 格式
3. 下载所有表的 CSV 文件

### 4.2 需要导出的表

按优先级排序：

**基础数据（优先导入）**：
- `badges` - 徽章定义
- `name_cards` - 名片定义
- `levels` - 关卡配置
- `words` - 英语单词库
- `math_words` - 数学词汇库
- `science_words` - 科学词汇库
- `daily_quests` - 每日任务
- `seasons` - 赛季配置
- `season_pass_items` - 赛季通行证物品
- `season_milestones` - 赛季里程碑
- `season_events` - 赛季事件
- `team_milestones` - 战队里程碑

**用户数据**：
- `profiles` - 用户档案
- `user_roles` - 用户角色
- `user_badges` - 用户徽章
- `user_name_cards` - 用户名片
- `user_season_pass` - 用户赛季通行证
- `user_pass_rewards` - 用户通行证奖励
- `user_season_milestones` - 用户赛季里程碑
- `user_quest_progress` - 用户任务进度

**学习进度**：
- `learning_progress` - 英语学习进度
- `math_learning_progress` - 数学学习进度
- `science_learning_progress` - 科学学习进度
- `level_progress` - 关卡进度
- `combo_records` - 连击记录

**社交数据**：
- `teams` - 战队
- `team_members` - 战队成员
- `team_applications` - 战队申请
- `team_announcements` - 战队公告
- `team_messages` - 战队消息
- `friendships` - 好友关系
- `friend_requests` - 好友请求
- `friend_battle_invites` - 好友对战邀请
- `messages` - 私信
- `blocked_users` - 屏蔽用户

**对战数据**：
- `ranked_matches` - 排位赛记录
- `match_queue` - 匹配队列（可清空）

**赛季挑战**：
- `grade_challenges` - 年级挑战
- `class_challenges` - 班级挑战
- `challenge_rewards` - 挑战奖励
- `team_season_stats` - 战队赛季统计
- `team_battles` - 战队对战
- `team_battle_participants` - 战队对战参与者
- `team_milestone_claims` - 战队里程碑领取
- `team_weekly_rewards` - 战队周奖励

**举报数据**：
- `reports` - 举报记录

### 4.3 导入数据到新数据库

```bash
# 使用 psql 的 COPY 命令导入 CSV
# 注意：需要按照外键依赖顺序导入

# 1. 首先导入无依赖的基础表
psql -h 10.20.2.20 -U postgres -d postgres -c "\COPY badges FROM 'badges.csv' WITH CSV HEADER"
psql -h 10.20.2.20 -U postgres -d postgres -c "\COPY name_cards FROM 'name_cards.csv' WITH CSV HEADER"
psql -h 10.20.2.20 -U postgres -d postgres -c "\COPY levels FROM 'levels.csv' WITH CSV HEADER"
psql -h 10.20.2.20 -U postgres -d postgres -c "\COPY words FROM 'words.csv' WITH CSV HEADER"
# ... 继续其他表

# 2. 然后导入用户相关表
psql -h 10.20.2.20 -U postgres -d postgres -c "\COPY profiles FROM 'profiles.csv' WITH CSV HEADER"
# ... 继续

# 3. 最后导入有外键依赖的表
```

### 4.4 数据导入脚本

创建一个导入脚本 `import_data.sh`：

```bash
#!/bin/bash
DB_HOST="10.20.2.20"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="postgres"
CSV_DIR="./exported_data"

# 基础表（按顺序）
TABLES=(
  "badges"
  "name_cards"
  "levels"
  "words"
  "math_words"
  "science_words"
  "daily_quests"
  "seasons"
  "season_pass_items"
  "season_milestones"
  "season_events"
  "team_milestones"
  "profiles"
  "user_roles"
  "teams"
  "team_members"
  "friendships"
  "friend_requests"
  "messages"
  "blocked_users"
  "user_badges"
  "user_name_cards"
  "learning_progress"
  "math_learning_progress"
  "science_learning_progress"
  "level_progress"
  "combo_records"
  "ranked_matches"
  "user_season_pass"
  "user_pass_rewards"
  "user_season_milestones"
  "user_quest_progress"
  "team_applications"
  "team_announcements"
  "team_messages"
  "friend_battle_invites"
  "grade_challenges"
  "class_challenges"
  "challenge_rewards"
  "team_season_stats"
  "team_battles"
  "team_battle_participants"
  "team_milestone_claims"
  "team_weekly_rewards"
  "reports"
)

for table in "${TABLES[@]}"; do
  if [ -f "$CSV_DIR/$table.csv" ]; then
    echo "Importing $table..."
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
      -c "\COPY $table FROM '$CSV_DIR/$table.csv' WITH CSV HEADER"
  else
    echo "Skipping $table (file not found)"
  fi
done

echo "Import completed!"
```

---

## 5. 存储迁移

### 5.1 创建存储桶

```sql
-- 在 Supabase 数据库中创建存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('profile-backgrounds', 'profile-backgrounds', true);
```

### 5.2 配置存储策略

```sql
-- 头像存储策略
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 背景图片存储策略
CREATE POLICY "Background images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-backgrounds');

CREATE POLICY "Users can upload their own background"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-backgrounds' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 5.3 迁移存储文件

1. 从 Lovable Cloud 下载存储桶中的文件
2. 上传到新服务器的存储桶

```bash
# 使用 Supabase CLI 或 API 上传文件
# 或者直接复制到 Docker 卷中

# 查找存储卷位置
docker volume inspect supabase_storage-data

# 复制文件到存储卷
docker cp ./avatars/ supabase-storage:/var/lib/storage/avatars/
docker cp ./profile-backgrounds/ supabase-storage:/var/lib/storage/profile-backgrounds/
```

---

## 6. 认证配置

### 6.1 配置认证提供商

编辑 Supabase 配置或使用 Studio：

```yaml
# docker-compose.yml 中的 auth 服务配置
auth:
  environment:
    GOTRUE_SITE_URL: http://10.20.2.20:3000
    GOTRUE_URI_ALLOW_LIST: "*"
    GOTRUE_DISABLE_SIGNUP: "false"
    GOTRUE_MAILER_AUTOCONFIRM: "true"  # 自动确认邮箱
```

### 6.2 邮件配置（可选）

如果需要邮件验证功能：

```env
# .env 文件
GOTRUE_SMTP_HOST=smtp.example.com
GOTRUE_SMTP_PORT=587
GOTRUE_SMTP_USER=your_smtp_user
GOTRUE_SMTP_PASS=your_smtp_password
GOTRUE_SMTP_ADMIN_EMAIL=admin@example.com
```

### 6.3 用户迁移注意事项

⚠️ **重要**：用户密码无法直接迁移（密码是加密存储的）

解决方案：
1. 通知用户使用"忘记密码"功能重置密码
2. 或者要求所有用户重新注册

---

## 7. Edge Functions 部署

### 7.1 Edge Functions 列表

你的项目包含以下 Edge Functions：

```
supabase/functions/
├── award-leaderboard-cards/
├── award-season-rewards/
├── delete-user/
├── generate-examples/
└── update-challenge-stats/
```

### 7.2 部署 Edge Functions

**方法一：使用 Supabase CLI**

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录到你的自托管实例
supabase login

# 链接项目
supabase link --project-ref your-project-ref

# 部署函数
supabase functions deploy award-leaderboard-cards
supabase functions deploy award-season-rewards
supabase functions deploy delete-user
supabase functions deploy generate-examples
supabase functions deploy update-challenge-stats
```

**方法二：使用 Docker（自托管）**

```bash
# Edge Functions 在自托管版本中通过 Deno 运行
# 将函数文件复制到 functions 目录

docker exec -it supabase-functions /bin/bash
# 在容器内部署函数
```

### 7.3 配置 Edge Functions 密钥

确保以下密钥已配置：

```bash
# 设置密钥
supabase secrets set LOVABLE_API_KEY=your_lovable_api_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 8. 前端配置

### 8.1 修改环境变量

更新项目根目录的 `.env` 文件：

```env
# 修改为你的服务器地址
VITE_SUPABASE_URL="http://10.20.2.20:8000"
VITE_SUPABASE_PUBLISHABLE_KEY="你生成的 ANON_KEY"
VITE_SUPABASE_PROJECT_ID="self-hosted"
```

### 8.2 构建前端

```bash
# 安装依赖
npm install

# 构建生产版本
npm run build

# 输出目录: dist/
```

### 8.3 部署前端

**方法一：使用 Nginx**

```nginx
# /etc/nginx/sites-available/dipont-word-master
server {
    listen 80;
    server_name 10.20.2.20;
    
    root /var/www/dipont-word-master/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API 代理（可选）
    location /api {
        proxy_pass http://10.20.2.20:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**方法二：使用 Docker**

```dockerfile
# Dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
# 构建并运行
docker build -t dipont-word-master .
docker run -d -p 80:80 dipont-word-master
```

---

## 9. 验证与测试

### 9.1 检查清单

- [ ] PostgreSQL 数据库正常运行
- [ ] 所有表结构已创建
- [ ] 数据已成功导入
- [ ] RLS 策略已启用
- [ ] 存储桶已创建并配置
- [ ] 认证服务正常
- [ ] Edge Functions 已部署
- [ ] 前端可以正常访问
- [ ] Realtime 功能正常

### 9.2 功能测试

1. **用户注册/登录**
   ```bash
   curl -X POST http://10.20.2.20:8000/auth/v1/signup \
     -H "apikey: YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpassword"}'
   ```

2. **数据查询**
   ```bash
   curl http://10.20.2.20:8000/rest/v1/profiles \
     -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
   ```

3. **Realtime 测试**
   - 打开两个浏览器窗口
   - 发起对战匹配
   - 验证实时更新是否正常

### 9.3 常见问题排查

**问题：无法连接数据库**
```bash
# 检查 PostgreSQL 状态
docker logs supabase-db

# 检查连接
psql -h 10.20.2.20 -U postgres -d postgres -c "SELECT 1"
```

**问题：API 返回 401**
```bash
# 检查 JWT 配置
docker logs supabase-kong
docker logs supabase-auth
```

**问题：Realtime 不工作**
```bash
# 检查 Realtime 服务
docker logs supabase-realtime

# 确认表已添加到 publication
psql -c "SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';"
```

---

## 📞 支持

如有问题，请参考：
- [Supabase 自托管文档](https://supabase.com/docs/guides/self-hosting)
- [Supabase GitHub Issues](https://github.com/supabase/supabase/issues)

---

## 📝 版本信息

- 文档版本: 1.0
- 创建日期: 2026-01-20
- 适用于: Dipont Word Master v1.x
