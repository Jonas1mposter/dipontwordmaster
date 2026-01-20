# Dipont Word Master Windows Server 自托管部署指南

本指南详细介绍如何将 Dipont Word Master 应用从 Lovable Cloud 迁移到 Windows Server (10.20.2.20)。

## 📋 目录

1. [服务器要求](#1-服务器要求)
2. [安装 Docker Desktop](#2-安装-docker-desktop)
3. [安装 Supabase 自托管版](#3-安装-supabase-自托管版)
4. [数据库迁移](#4-数据库迁移)
5. [数据导入](#5-数据导入)
6. [存储迁移](#6-存储迁移)
7. [认证配置](#7-认证配置)
8. [Edge Functions 部署](#8-edge-functions-部署)
9. [前端配置](#9-前端配置)
10. [验证与测试](#10-验证与测试)
11. [Windows 服务配置](#11-windows-服务配置)

---

## 1. 服务器要求

### 硬件要求
- **CPU**: 4+ 核心
- **内存**: 8GB+ RAM (推荐 16GB)
- **存储**: 50GB+ SSD
- **网络**: 稳定的网络连接

### 软件要求
- **操作系统**: Windows Server 2019 / 2022
- **Docker Desktop**: 4.x+ (需要启用 WSL2 或 Hyper-V)
- **Git for Windows**: 2.30+
- **PowerShell**: 5.1+ (推荐 PowerShell 7)
- **Node.js**: 18+ LTS (用于构建前端)

### 端口要求
确保 Windows 防火墙允许以下端口：
- `5432` - PostgreSQL
- `8000` - Supabase API (Kong)
- `3000` - Supabase Studio (可选)
- `9000` - Storage API
- `54321` - PostgREST
- `80` / `443` - 前端 Web 服务

---

## 2. 安装 Docker Desktop

### 2.1 启用 Windows 功能

以管理员身份打开 PowerShell：

```powershell
# 启用 Hyper-V (Windows Server)
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All

# 或者启用 WSL2 (推荐)
wsl --install
wsl --set-default-version 2

# 重启服务器
Restart-Computer
```

### 2.2 安装 Docker Desktop

1. 下载 Docker Desktop: https://www.docker.com/products/docker-desktop/
2. 运行安装程序
3. 选择 "Use WSL 2 instead of Hyper-V" (如果可用)
4. 完成安装后重启

### 2.3 配置 Docker Desktop

```powershell
# 验证 Docker 安装
docker --version
docker-compose --version

# 测试 Docker
docker run hello-world
```

在 Docker Desktop 设置中：
- **Resources** → **Advanced**: 分配至少 4GB 内存
- **General**: 勾选 "Start Docker Desktop when you log in"

---

## 3. 安装 Supabase 自托管版

### 3.1 创建工作目录

```powershell
# 创建工作目录
New-Item -ItemType Directory -Path "C:\Supabase" -Force
Set-Location C:\Supabase

# 克隆 Supabase Docker 配置
git clone --depth 1 https://github.com/supabase/supabase
Set-Location supabase\docker
```

### 3.2 配置环境变量

```powershell
# 复制示例配置
Copy-Item .env.example .env

# 使用记事本或 VS Code 编辑
notepad .env
# 或
code .env
```

**重要配置项**（必须修改）：

```env
############
# Secrets - 必须修改！
############
# 使用在线工具生成: https://generate-secret.vercel.app/32
POSTGRES_PASSWORD=YourStrongPassword123!
JWT_SECRET=your_jwt_secret_at_least_32_characters_long_here

# 使用 https://supabase.com/docs/guides/self-hosting#api-keys 生成
ANON_KEY=生成的匿名密钥
SERVICE_ROLE_KEY=生成的服务角色密钥

############
# Database
############
POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_PORT=5432

############
# API - 修改为你的服务器 IP
############
SITE_URL=http://10.20.2.20:3000
API_EXTERNAL_URL=http://10.20.2.20:8000
SUPABASE_PUBLIC_URL=http://10.20.2.20:8000

############
# Studio (可选)
############
STUDIO_PORT=3000
STUDIO_DEFAULT_ORGANIZATION=Dipont
STUDIO_DEFAULT_PROJECT=WordMaster
```

### 3.3 生成 JWT 密钥

使用在线工具生成：
1. 访问 https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys
2. 输入你的 JWT_SECRET
3. 复制生成的 ANON_KEY 和 SERVICE_ROLE_KEY

或使用 PowerShell 生成 JWT_SECRET：

```powershell
# 生成随机密钥
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### 3.4 启动 Supabase

```powershell
# 拉取镜像并启动
docker-compose up -d

# 检查服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 单独查看某个服务的日志
docker-compose logs -f db
docker-compose logs -f kong
```

### 3.5 验证安装

```powershell
# 使用 PowerShell 测试 API
Invoke-RestMethod -Uri "http://10.20.2.20:8000/rest/v1/" -Method Get

# 或使用 curl (如果安装了)
curl http://10.20.2.20:8000/rest/v1/
```

浏览器访问 Supabase Studio: `http://10.20.2.20:3000`

---

## 4. 数据库迁移

### 4.1 安装 PostgreSQL 客户端工具

下载并安装 PostgreSQL: https://www.postgresql.org/download/windows/

安装时选择 "Command Line Tools"，这会安装 `psql.exe`。

将 PostgreSQL bin 目录添加到 PATH：

```powershell
# 临时添加到 PATH
$env:PATH += ";C:\Program Files\PostgreSQL\16\bin"

# 永久添加（需要重启 PowerShell）
[Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";C:\Program Files\PostgreSQL\16\bin", "User")
```

### 4.2 连接到数据库

```powershell
# 使用 psql 连接
psql -h 10.20.2.20 -p 5432 -U postgres -d postgres

# 或者使用 Docker 内部的 psql
docker exec -it supabase-db psql -U postgres -d postgres
```

### 4.3 执行迁移文件

创建 PowerShell 迁移脚本 `run_migrations.ps1`：

```powershell
# run_migrations.ps1
$DB_HOST = "10.20.2.20"
$DB_PORT = "5432"
$DB_USER = "postgres"
$DB_NAME = "postgres"
$MIGRATIONS_DIR = "C:\path\to\your\project\supabase\migrations"

# 设置密码环境变量（或在连接时输入）
$env:PGPASSWORD = "YourStrongPassword123!"

# 获取所有迁移文件并按名称排序
$files = Get-ChildItem -Path $MIGRATIONS_DIR -Filter "*.sql" | Sort-Object Name

foreach ($file in $files) {
    Write-Host "Executing $($file.Name)..." -ForegroundColor Cyan
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $file.FullName
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Success" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed" -ForegroundColor Red
    }
}

Write-Host "`nMigrations completed!" -ForegroundColor Yellow
```

运行迁移：

```powershell
.\run_migrations.ps1
```

### 4.4 核心表结构

确认以下主要表已创建：

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

### 4.5 启用 Realtime

```sql
-- 在 psql 中执行
ALTER PUBLICATION supabase_realtime ADD TABLE public.ranked_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```

---

## 5. 数据导入

### 5.1 从 Lovable Cloud 导出数据

在 Lovable 项目中：
1. 进入 **Cloud** → **Database** → **Tables**
2. 对每个表点击导出，选择 CSV 格式
3. 下载所有表的 CSV 文件到本地目录（如 `C:\Supabase\exported_data\`）

### 5.2 需要导出的表

按优先级排序：

**基础数据（优先导入）**：
- `badges`, `name_cards`, `levels`
- `words`, `math_words`, `science_words`
- `daily_quests`, `seasons`
- `season_pass_items`, `season_milestones`, `season_events`
- `team_milestones`

**用户数据**：
- `profiles`, `user_roles`
- `user_badges`, `user_name_cards`
- `user_season_pass`, `user_pass_rewards`, `user_season_milestones`
- `user_quest_progress`

**学习进度**：
- `learning_progress`, `math_learning_progress`, `science_learning_progress`
- `level_progress`, `combo_records`

**社交数据**：
- `teams`, `team_members`, `team_applications`
- `team_announcements`, `team_messages`
- `friendships`, `friend_requests`, `friend_battle_invites`
- `messages`, `blocked_users`

**对战数据**：
- `ranked_matches`
- `match_queue`（可清空）

**赛季挑战**：
- `grade_challenges`, `class_challenges`, `challenge_rewards`
- `team_season_stats`, `team_battles`, `team_battle_participants`
- `team_milestone_claims`, `team_weekly_rewards`

**其他**：
- `reports`

### 5.3 数据导入脚本

创建 PowerShell 导入脚本 `import_data.ps1`：

```powershell
# import_data.ps1
param(
    [string]$DBHost = "10.20.2.20",
    [string]$DBPort = "5432",
    [string]$DBUser = "postgres",
    [string]$DBName = "postgres",
    [string]$CSVDir = "C:\Supabase\exported_data"
)

# 设置密码
$env:PGPASSWORD = "YourStrongPassword123!"

# 按导入顺序定义表（考虑外键依赖）
$tables = @(
    # 基础表（无外键依赖）
    "badges",
    "name_cards",
    "levels",
    "words",
    "math_words",
    "science_words",
    "daily_quests",
    "seasons",
    
    # 依赖 seasons
    "season_pass_items",
    "season_milestones",
    "season_events",
    "team_milestones",
    
    # 用户相关
    "profiles",
    "user_roles",
    
    # 依赖 profiles
    "teams",
    "team_members",
    "friendships",
    "friend_requests",
    "messages",
    "blocked_users",
    "user_badges",
    "user_name_cards",
    
    # 学习进度
    "learning_progress",
    "math_learning_progress",
    "science_learning_progress",
    "level_progress",
    "combo_records",
    
    # 对战
    "ranked_matches",
    
    # 赛季相关
    "user_season_pass",
    "user_pass_rewards",
    "user_season_milestones",
    "user_quest_progress",
    
    # 战队相关
    "team_applications",
    "team_announcements",
    "team_messages",
    "friend_battle_invites",
    
    # 挑战
    "grade_challenges",
    "class_challenges",
    "challenge_rewards",
    "team_season_stats",
    "team_battles",
    "team_battle_participants",
    "team_milestone_claims",
    "team_weekly_rewards",
    
    # 其他
    "reports"
)

Write-Host "=== 开始数据导入 ===" -ForegroundColor Cyan
Write-Host "数据库: $DBHost`:$DBPort/$DBName" -ForegroundColor Gray
Write-Host "CSV 目录: $CSVDir" -ForegroundColor Gray
Write-Host ""

$successCount = 0
$failCount = 0
$skipCount = 0

foreach ($table in $tables) {
    $csvPath = Join-Path $CSVDir "$table.csv"
    
    if (Test-Path $csvPath) {
        Write-Host "导入 $table..." -NoNewline
        
        # 使用 psql 的 \copy 命令导入 CSV
        $sql = "\COPY $table FROM '$csvPath' WITH CSV HEADER"
        $result = psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -c $sql 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host " ✓" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host " ✗" -ForegroundColor Red
            Write-Host "  错误: $result" -ForegroundColor Red
            $failCount++
        }
    } else {
        Write-Host "跳过 $table (文件不存在)" -ForegroundColor Yellow
        $skipCount++
    }
}

Write-Host ""
Write-Host "=== 导入完成 ===" -ForegroundColor Cyan
Write-Host "成功: $successCount | 失败: $failCount | 跳过: $skipCount" -ForegroundColor White
```

运行导入脚本：

```powershell
.\import_data.ps1 -CSVDir "C:\Supabase\exported_data"
```

### 5.4 验证数据导入

```powershell
# 连接数据库并检查数据
docker exec -it supabase-db psql -U postgres -d postgres -c "SELECT COUNT(*) FROM profiles;"
docker exec -it supabase-db psql -U postgres -d postgres -c "SELECT COUNT(*) FROM words;"
```

---

## 6. 存储迁移

### 6.1 创建存储桶

```sql
-- 在 psql 中执行
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('profile-backgrounds', 'profile-backgrounds', true)
ON CONFLICT (id) DO NOTHING;
```

### 6.2 配置存储策略

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

### 6.3 迁移存储文件

将头像和背景图片文件复制到 Docker 存储卷：

```powershell
# 查找存储卷位置
docker volume inspect supabase_storage-data

# 复制文件到容器
docker cp C:\Supabase\avatars\. supabase-storage:/var/lib/storage/avatars/
docker cp C:\Supabase\profile-backgrounds\. supabase-storage:/var/lib/storage/profile-backgrounds/
```

---

## 7. 认证配置

### 7.1 配置认证服务

编辑 `docker-compose.yml` 中的 auth 服务：

```yaml
auth:
  environment:
    GOTRUE_SITE_URL: http://10.20.2.20:3000
    GOTRUE_URI_ALLOW_LIST: "*"
    GOTRUE_DISABLE_SIGNUP: "false"
    GOTRUE_MAILER_AUTOCONFIRM: "true"  # 自动确认邮箱
```

重启服务：

```powershell
docker-compose restart auth
```

### 7.2 邮件配置（可选）

如果需要邮件验证功能，在 `.env` 中添加：

```env
GOTRUE_SMTP_HOST=smtp.example.com
GOTRUE_SMTP_PORT=587
GOTRUE_SMTP_USER=your_smtp_user
GOTRUE_SMTP_PASS=your_smtp_password
GOTRUE_SMTP_ADMIN_EMAIL=admin@example.com
```

### 7.3 用户迁移注意事项

⚠️ **重要**：用户密码无法直接迁移（密码是加密存储的）

解决方案：
1. 通知用户使用"忘记密码"功能重置密码
2. 或者要求所有用户重新注册

---

## 8. Edge Functions 部署

### 8.1 安装 Supabase CLI

```powershell
# 使用 npm 安装
npm install -g supabase

# 或使用 Scoop (Windows 包管理器)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 8.2 Edge Functions 列表

你的项目包含以下 Edge Functions：

```
supabase/functions/
├── award-leaderboard-cards/
├── award-season-rewards/
├── delete-user/
├── generate-examples/
└── update-challenge-stats/
```

### 8.3 部署 Edge Functions

```powershell
# 进入项目目录
Set-Location C:\path\to\your\project

# 链接到自托管实例
supabase link --project-ref your-project-ref

# 部署所有函数
supabase functions deploy award-leaderboard-cards
supabase functions deploy award-season-rewards
supabase functions deploy delete-user
supabase functions deploy generate-examples
supabase functions deploy update-challenge-stats
```

### 8.4 配置 Edge Functions 密钥

```powershell
supabase secrets set LOVABLE_API_KEY=your_lovable_api_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 9. 前端配置

### 9.1 安装 Node.js

下载并安装 Node.js LTS: https://nodejs.org/

```powershell
# 验证安装
node --version
npm --version
```

### 9.2 修改环境变量

在项目根目录创建或修改 `.env` 文件：

```env
VITE_SUPABASE_URL=http://10.20.2.20:8000
VITE_SUPABASE_PUBLISHABLE_KEY=你生成的_ANON_KEY
VITE_SUPABASE_PROJECT_ID=self-hosted
```

### 9.3 构建前端

```powershell
# 进入项目目录
Set-Location C:\path\to\your\project

# 安装依赖
npm install

# 构建生产版本
npm run build

# 输出目录: dist\
```

### 9.4 部署前端

#### 方法一：使用 IIS

1. 安装 IIS：
```powershell
# 以管理员身份运行
Install-WindowsFeature -name Web-Server -IncludeManagementTools
```

2. 安装 URL Rewrite 模块：
   - 下载: https://www.iis.net/downloads/microsoft/url-rewrite
   - 安装后重启 IIS

3. 复制构建文件：
```powershell
Copy-Item -Path ".\dist\*" -Destination "C:\inetpub\wwwroot\dipont-word-master\" -Recurse
```

4. 创建 `web.config` 文件（用于 SPA 路由）：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="SPA Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
    </staticContent>
  </system.webServer>
</configuration>
```

5. 在 IIS 管理器中配置网站：
   - 打开 IIS 管理器
   - 右键 "Sites" → "Add Website"
   - Site name: `DipontWordMaster`
   - Physical path: `C:\inetpub\wwwroot\dipont-word-master`
   - Port: `80` (或其他端口)

#### 方法二：使用 Docker + Nginx

创建 `Dockerfile`：

```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

创建 `nginx.conf`：

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://host.docker.internal:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

构建并运行：

```powershell
docker build -t dipont-word-master .
docker run -d -p 80:80 --name dipont-frontend dipont-word-master
```

---

## 10. 验证与测试

### 10.1 检查清单

- [ ] Docker Desktop 正常运行
- [ ] PostgreSQL 数据库正常运行
- [ ] 所有表结构已创建
- [ ] 数据已成功导入
- [ ] RLS 策略已启用
- [ ] 存储桶已创建并配置
- [ ] 认证服务正常
- [ ] Edge Functions 已部署
- [ ] 前端可以正常访问
- [ ] Realtime 功能正常

### 10.2 功能测试

```powershell
# 1. 测试 API
Invoke-RestMethod -Uri "http://10.20.2.20:8000/rest/v1/" -Method Get

# 2. 测试用户注册
$body = @{
    email = "test@example.com"
    password = "testpassword123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://10.20.2.20:8000/auth/v1/signup" `
    -Method Post `
    -Headers @{"apikey" = "YOUR_ANON_KEY"; "Content-Type" = "application/json"} `
    -Body $body

# 3. 测试数据查询
Invoke-RestMethod -Uri "http://10.20.2.20:8000/rest/v1/words?select=*&limit=5" `
    -Method Get `
    -Headers @{"apikey" = "YOUR_ANON_KEY"}
```

### 10.3 Realtime 测试

1. 打开两个浏览器窗口
2. 发起对战匹配
3. 验证实时更新是否正常

### 10.4 常见问题排查

**问题：Docker Desktop 无法启动**
```powershell
# 检查 Hyper-V 是否启用
Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V

# 检查 WSL 状态
wsl --status
```

**问题：无法连接数据库**
```powershell
# 检查 PostgreSQL 容器状态
docker logs supabase-db

# 检查端口是否被占用
netstat -an | findstr "5432"
```

**问题：API 返回 401**
```powershell
# 检查 JWT 配置
docker logs supabase-kong
docker logs supabase-auth
```

**问题：Realtime 不工作**
```powershell
# 检查 Realtime 服务
docker logs supabase-realtime

# 确认表已添加到 publication
docker exec -it supabase-db psql -U postgres -c "SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';"
```

**问题：前端页面刷新后 404**
- IIS: 确保安装了 URL Rewrite 模块并配置了 `web.config`
- Nginx: 确保配置了 `try_files $uri $uri/ /index.html;`

---

## 11. Windows 服务配置

### 11.1 设置 Docker 开机自启

Docker Desktop 默认会开机自启。确保在设置中勾选：
- Settings → General → "Start Docker Desktop when you log in"

### 11.2 设置容器自动重启

确保 `docker-compose.yml` 中所有服务都有 `restart: unless-stopped`：

```yaml
services:
  db:
    restart: unless-stopped
  kong:
    restart: unless-stopped
  auth:
    restart: unless-stopped
  # ... 其他服务
```

### 11.3 创建 Windows 计划任务（可选）

创建一个启动脚本 `start_supabase.ps1`：

```powershell
# start_supabase.ps1
Set-Location C:\Supabase\supabase\docker
docker-compose up -d
```

使用任务计划程序在系统启动时运行此脚本。

### 11.4 设置防火墙规则

```powershell
# 以管理员身份运行
# 允许 Supabase API
New-NetFirewallRule -DisplayName "Supabase API" -Direction Inbound -Port 8000 -Protocol TCP -Action Allow

# 允许 PostgreSQL
New-NetFirewallRule -DisplayName "PostgreSQL" -Direction Inbound -Port 5432 -Protocol TCP -Action Allow

# 允许 Supabase Studio
New-NetFirewallRule -DisplayName "Supabase Studio" -Direction Inbound -Port 3000 -Protocol TCP -Action Allow

# 允许 Web 服务
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -Port 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Port 443 -Protocol TCP -Action Allow
```

---

## 📞 支持

如有问题，请参考：
- [Supabase 自托管文档](https://supabase.com/docs/guides/self-hosting)
- [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
- [IIS URL Rewrite](https://www.iis.net/downloads/microsoft/url-rewrite)

---

## 📝 版本信息

- 文档版本: 1.0 (Windows Server)
- 创建日期: 2026-01-20
- 适用于: Dipont Word Master v1.x
- 操作系统: Windows Server 2019 / 2022
