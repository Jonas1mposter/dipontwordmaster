import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ProductPPT = () => {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Control Bar - Hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          打印/导出PDF
        </Button>
      </div>

      {/* PPT Content */}
      <div className="max-w-5xl mx-auto p-8 space-y-16 print:space-y-0">
        
        {/* Slide 1: Cover */}
        <section className="min-h-[600px] flex flex-col items-center justify-center text-center bg-gradient-to-br from-primary/20 via-background to-primary/10 rounded-2xl p-12 print:break-after-page print:min-h-screen">
          <div className="space-y-6">
            <div className="text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              狄邦单词通
            </div>
            <div className="text-2xl text-muted-foreground">
              Dipont Word Master
            </div>
            <div className="h-1 w-32 bg-primary/50 mx-auto rounded-full" />
            <p className="text-xl max-w-2xl">
              让英语学习充满乐趣的游戏化背单词平台
              <br />
              <span className="text-muted-foreground">A Gamified English Vocabulary Learning Platform</span>
            </p>
            <div className="pt-8 text-muted-foreground">
              狄邦教育 | Dipont Education
            </div>
          </div>
        </section>

        {/* Slide 2: Market Pain Points */}
        <section className="min-h-[600px] bg-card rounded-2xl p-12 print:break-after-page print:min-h-screen">
          <h2 className="text-3xl font-bold mb-2">市场痛点</h2>
          <p className="text-xl text-muted-foreground mb-8">Market Pain Points</p>
          
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="bg-destructive/10 rounded-xl p-6 space-y-4">
              <div className="text-4xl">😴</div>
              <h3 className="text-xl font-semibold">学习枯燥乏味</h3>
              <p className="text-muted-foreground">Boring Learning Experience</p>
              <p className="text-sm">
                传统背单词方式机械重复，学生缺乏持续学习动力，容易半途而废。
              </p>
              <p className="text-sm text-muted-foreground">
                Traditional rote memorization lacks engagement, causing students to lose motivation.
              </p>
            </div>
            
            <div className="bg-destructive/10 rounded-xl p-6 space-y-4">
              <div className="text-4xl">📊</div>
              <h3 className="text-xl font-semibold">进度难以追踪</h3>
              <p className="text-muted-foreground">Difficult Progress Tracking</p>
              <p className="text-sm">
                家长和老师无法实时了解学生学习情况，无法针对性辅导。
              </p>
              <p className="text-sm text-muted-foreground">
                Parents and teachers struggle to monitor student progress in real-time.
              </p>
            </div>
            
            <div className="bg-destructive/10 rounded-xl p-6 space-y-4">
              <div className="text-4xl">🏝️</div>
              <h3 className="text-xl font-semibold">学习孤立无趣</h3>
              <p className="text-muted-foreground">Isolated Learning</p>
              <p className="text-sm">
                缺乏同伴互动和竞争氛围，学习过程单调，无法形成良好学习习惯。
              </p>
              <p className="text-sm text-muted-foreground">
                Lack of peer interaction and competition makes learning monotonous.
              </p>
            </div>
          </div>
        </section>

        {/* Slide 3: Product Positioning */}
        <section className="min-h-[600px] bg-card rounded-2xl p-12 print:break-after-page print:min-h-screen">
          <h2 className="text-3xl font-bold mb-2">产品定位</h2>
          <p className="text-xl text-muted-foreground mb-8">Product Positioning</p>
          
          <div className="flex flex-col items-center justify-center space-y-8 mt-8">
            <div className="text-center max-w-3xl space-y-4">
              <p className="text-2xl font-medium">
                面向初中学生（7-8年级）的
                <span className="text-primary font-bold">游戏化</span>
                英语词汇学习平台
              </p>
              <p className="text-xl text-muted-foreground">
                A Gamified English Vocabulary Platform for Middle School Students (Grades 7-8)
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 w-full mt-8">
              <div className="bg-primary/10 rounded-xl p-6 text-center">
                <div className="text-3xl mb-3">🎮</div>
                <h3 className="font-semibold">游戏化机制</h3>
                <p className="text-sm text-muted-foreground mt-2">Gamification Mechanics</p>
                <p className="text-sm mt-2">等级、段位、排行榜、成就系统</p>
              </div>
              <div className="bg-primary/10 rounded-xl p-6 text-center">
                <div className="text-3xl mb-3">📚</div>
                <h3 className="font-semibold">教材同步</h3>
                <p className="text-sm text-muted-foreground mt-2">Curriculum Aligned</p>
                <p className="text-sm mt-2">紧贴课本单元，按字母分级学习</p>
              </div>
              <div className="bg-primary/10 rounded-xl p-6 text-center">
                <div className="text-3xl mb-3">⚔️</div>
                <h3 className="font-semibold">社交竞技</h3>
                <p className="text-sm text-muted-foreground mt-2">Social Competition</p>
                <p className="text-sm mt-2">实时对战，好友互动，班级竞赛</p>
              </div>
            </div>
          </div>
        </section>

        {/* Slide 4: Core Features - Learning */}
        <section className="min-h-[600px] bg-card rounded-2xl p-12 print:break-after-page print:min-h-screen">
          <h2 className="text-3xl font-bold mb-2">核心功能：闯关学习</h2>
          <p className="text-xl text-muted-foreground mb-8">Core Feature: Level-based Learning</p>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-background rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">三阶段学习模式 | Three-Stage Learning</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-500/20 text-blue-500 px-3 py-1 rounded-full text-sm font-medium">1</span>
                    <div>
                      <p className="font-medium">识记 Recognition</p>
                      <p className="text-sm text-muted-foreground">单词卡片学习，建立初步印象</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-green-500/20 text-green-500 px-3 py-1 rounded-full text-sm font-medium">2</span>
                    <div>
                      <p className="font-medium">拼写 Spelling</p>
                      <p className="text-sm text-muted-foreground">听写、填空，强化拼写记忆</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-purple-500/20 text-purple-500 px-3 py-1 rounded-full text-sm font-medium">3</span>
                    <div>
                      <p className="font-medium">应用 Application</p>
                      <p className="text-sm text-muted-foreground">语境应用，深度掌握</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-background rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">5种题型 | 5 Quiz Types</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="font-medium">词义选择</p>
                    <p className="text-xs text-muted-foreground">Meaning Selection</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="font-medium">单词选择</p>
                    <p className="text-xs text-muted-foreground">Word Selection</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="font-medium">拼写测试</p>
                    <p className="text-xs text-muted-foreground">Spelling Test</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="font-medium">听力识别</p>
                    <p className="text-xs text-muted-foreground">Listening</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center col-span-2">
                    <p className="font-medium">填空应用</p>
                    <p className="text-xs text-muted-foreground">Fill in the Blank</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-background rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-3">按字母分级 | Alphabetical Organization</h3>
                <p className="text-sm text-muted-foreground">
                  A-Z字母顺序组织，每个字母为一个单元，循序渐进解锁
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Words organized A-Z, each letter is a unit, progressive unlocking
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Slide 5: Core Features - Battle */}
        <section className="min-h-[600px] bg-card rounded-2xl p-12 print:break-after-page print:min-h-screen">
          <h2 className="text-3xl font-bold mb-2">核心功能：实时对战</h2>
          <p className="text-xl text-muted-foreground mb-8">Core Feature: Real-time Battles</p>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl p-6 space-y-4">
              <h3 className="text-2xl font-bold">排位对战</h3>
              <p className="text-muted-foreground">Ranked Battles</p>
              <ul className="space-y-2 text-sm">
                <li>• 实时匹配同年级、相近段位对手</li>
                <li>• Real-time matching with same-grade, similar-rank opponents</li>
                <li>• 1v1 或 2v2 对战模式</li>
                <li>• 1v1 or 2v2 battle modes</li>
                <li>• 90秒限时单词挑战</li>
                <li>• 90-second timed word challenges</li>
                <li>• 胜负影响段位积分</li>
                <li>• Win/loss affects rank points</li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-6 space-y-4">
              <h3 className="text-2xl font-bold">自由对战</h3>
              <p className="text-muted-foreground">Free Matches</p>
              <ul className="space-y-2 text-sm">
                <li>• 好友之间自由切磋</li>
                <li>• Free practice with friends</li>
                <li>• 跨年级对战服务器</li>
                <li>• Cross-grade battle server</li>
                <li>• 观战功能</li>
                <li>• Spectate mode</li>
                <li>• 胜率/胜场排行榜</li>
                <li>• Win rate / total wins leaderboard</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 bg-background rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">段位系统 | Rank Tier System</h3>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="text-center p-3 bg-amber-900/30 rounded-lg">
                <div className="text-2xl">🥉</div>
                <p className="font-medium">青铜</p>
                <p className="text-xs text-muted-foreground">Bronze</p>
              </div>
              <div className="text-center p-3 bg-slate-400/30 rounded-lg">
                <div className="text-2xl">🥈</div>
                <p className="font-medium">白银</p>
                <p className="text-xs text-muted-foreground">Silver</p>
              </div>
              <div className="text-center p-3 bg-yellow-500/30 rounded-lg">
                <div className="text-2xl">🥇</div>
                <p className="font-medium">黄金</p>
                <p className="text-xs text-muted-foreground">Gold</p>
              </div>
              <div className="text-center p-3 bg-cyan-500/30 rounded-lg">
                <div className="text-2xl">💎</div>
                <p className="font-medium">铂金</p>
                <p className="text-xs text-muted-foreground">Platinum</p>
              </div>
              <div className="text-center p-3 bg-blue-500/30 rounded-lg">
                <div className="text-2xl">💠</div>
                <p className="font-medium">钻石</p>
                <p className="text-xs text-muted-foreground">Diamond</p>
              </div>
              <div className="text-center p-3 bg-purple-500/30 rounded-lg">
                <div className="text-2xl">👑</div>
                <p className="font-medium">王者</p>
                <p className="text-xs text-muted-foreground">Champion</p>
              </div>
            </div>
          </div>
        </section>

        {/* Slide 6: Gamification System */}
        <section className="min-h-[600px] bg-card rounded-2xl p-12 print:break-after-page print:min-h-screen">
          <h2 className="text-3xl font-bold mb-2">游戏化激励系统</h2>
          <p className="text-xl text-muted-foreground mb-8">Gamification & Incentive System</p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-background rounded-xl p-6 space-y-3">
              <div className="text-3xl">⚡</div>
              <h3 className="text-lg font-semibold">经验值 & 等级</h3>
              <p className="text-sm text-muted-foreground">XP & Level System</p>
              <p className="text-sm">完成学习和对战获得经验，提升等级解锁更多内容</p>
            </div>
            
            <div className="bg-background rounded-xl p-6 space-y-3">
              <div className="text-3xl">🪙</div>
              <h3 className="text-lg font-semibold">狄邦豆货币</h3>
              <p className="text-sm text-muted-foreground">Dipont Coins</p>
              <p className="text-sm">游戏内货币，用于购买道具和装饰</p>
            </div>
            
            <div className="bg-background rounded-xl p-6 space-y-3">
              <div className="text-3xl">🔥</div>
              <h3 className="text-lg font-semibold">连续登录</h3>
              <p className="text-sm text-muted-foreground">Login Streak</p>
              <p className="text-sm">每日签到奖励，培养学习习惯</p>
            </div>
            
            <div className="bg-background rounded-xl p-6 space-y-3">
              <div className="text-3xl">🏆</div>
              <h3 className="text-lg font-semibold">三大排行榜</h3>
              <p className="text-sm text-muted-foreground">Triple Leaderboards</p>
              <p className="text-sm">财富榜、胜场榜、经验榜，多维度竞争</p>
            </div>
            
            <div className="bg-background rounded-xl p-6 space-y-3">
              <div className="text-3xl">🎖️</div>
              <h3 className="text-lg font-semibold">徽章收集</h3>
              <p className="text-sm text-muted-foreground">Badge Collection</p>
              <p className="text-sm">完成成就解锁专属徽章，最多装备3个展示</p>
            </div>
            
            <div className="bg-background rounded-xl p-6 space-y-3">
              <div className="text-3xl">🎴</div>
              <h3 className="text-lg font-semibold">称号卡系统</h3>
              <p className="text-sm text-muted-foreground">Name Card System</p>
              <p className="text-sm">排行榜前10名专属称号卡，彰显荣耀</p>
            </div>
          </div>
          
          <div className="mt-8 bg-primary/10 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-3">每日任务系统 | Daily Quest System</h3>
            <p className="text-muted-foreground">
              每日更新的任务目标，完成获得奖励，保持学习动力
            </p>
            <p className="text-muted-foreground">
              Daily refreshing quests with rewards to maintain learning motivation
            </p>
          </div>
        </section>

        {/* Slide 7: Social Features */}
        <section className="min-h-[600px] bg-card rounded-2xl p-12 print:break-after-page print:min-h-screen">
          <h2 className="text-3xl font-bold mb-2">社交互动系统</h2>
          <p className="text-xl text-muted-foreground mb-8">Social Interaction System</p>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-background rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">好友系统 | Friend System</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span> 搜索添加好友 / Search & add friends
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span> 好友请求管理 / Friend request management
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span> 查看好友状态 / View friend status
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span> 屏蔽/举报功能 / Block & report
                  </li>
                </ul>
              </div>
              
              <div className="bg-background rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">即时聊天 | Real-time Chat</h3>
                <p className="text-muted-foreground">
                  好友之间可以发送消息，讨论学习内容，约战PK
                </p>
                <p className="text-muted-foreground mt-2">
                  Friends can send messages, discuss learning, and challenge each other
                </p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-background rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">对战邀请 | Battle Invites</h3>
                <p className="text-muted-foreground">
                  一键邀请好友进行自由对战，实时通知
                </p>
                <p className="text-muted-foreground mt-2">
                  One-click invite friends to free matches with real-time notifications
                </p>
              </div>
              
              <div className="bg-background rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">班级/年级挑战 | Class/Grade Challenges</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span> 班级整体排名 / Class rankings
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span> 年级整体排名 / Grade rankings
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span> 赛季奖励 / Season rewards
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Slide 8: Season Pass */}
        <section className="min-h-[600px] bg-card rounded-2xl p-12 print:break-after-page print:min-h-screen">
          <h2 className="text-3xl font-bold mb-2">赛季通行证系统</h2>
          <p className="text-xl text-muted-foreground mb-8">Season Pass System</p>
          
          <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-xl p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold">赛季制运营</h3>
                <p className="text-muted-foreground">Season-based Operation</p>
                <ul className="space-y-3 mt-4">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">📅</span>
                    <div>
                      <p className="font-medium">定期赛季更新</p>
                      <p className="text-sm text-muted-foreground">Regular season updates with fresh content</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">🎁</span>
                    <div>
                      <p className="font-medium">等级奖励解锁</p>
                      <p className="text-sm text-muted-foreground">Level-based reward unlocking</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">⭐</span>
                    <div>
                      <p className="font-medium">免费 & 高级通行证</p>
                      <p className="text-sm text-muted-foreground">Free & Premium pass tiers</p>
                    </div>
                  </li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-2xl font-bold">通行证奖励</h3>
                <p className="text-muted-foreground">Pass Rewards</p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-background/50 rounded-lg p-3 text-center">
                    <div className="text-2xl">🪙</div>
                    <p className="text-sm font-medium">狄邦豆</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 text-center">
                    <div className="text-2xl">⚡</div>
                    <p className="text-sm font-medium">经验加成</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 text-center">
                    <div className="text-2xl">🎖️</div>
                    <p className="text-sm font-medium">专属徽章</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 text-center">
                    <div className="text-2xl">🎴</div>
                    <p className="text-sm font-medium">限定称号卡</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-lg text-muted-foreground">
              持续运营模式，保持用户长期活跃与留存
            </p>
            <p className="text-muted-foreground">
              Continuous operation model for long-term user engagement and retention
            </p>
          </div>
        </section>

        {/* Slide 9: Technical Advantages */}
        <section className="min-h-[600px] bg-card rounded-2xl p-12 print:break-after-page print:min-h-screen">
          <h2 className="text-3xl font-bold mb-2">技术优势</h2>
          <p className="text-xl text-muted-foreground mb-8">Technical Advantages</p>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-background rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">🌐 跨平台支持</h3>
                <p className="text-muted-foreground mb-2">Cross-Platform Support</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="bg-muted px-3 py-1 rounded-full text-sm">Web 网页版</span>
                  <span className="bg-muted px-3 py-1 rounded-full text-sm">iOS</span>
                  <span className="bg-muted px-3 py-1 rounded-full text-sm">Android</span>
                  <span className="bg-muted px-3 py-1 rounded-full text-sm">Windows</span>
                  <span className="bg-muted px-3 py-1 rounded-full text-sm">macOS</span>
                </div>
              </div>
              
              <div className="bg-background rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">⚡ 实时对战系统</h3>
                <p className="text-muted-foreground mb-2">Real-time Battle System</p>
                <p className="text-sm">
                  基于WebSocket的实时匹配和对战系统，延迟低，体验流畅
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  WebSocket-based real-time matching with low latency
                </p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-background rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">☁️ 云端数据同步</h3>
                <p className="text-muted-foreground mb-2">Cloud Data Sync</p>
                <p className="text-sm">
                  学习进度、游戏数据云端存储，多设备无缝切换
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Progress and game data stored in cloud, seamless multi-device sync
                </p>
              </div>
              
              <div className="bg-background rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">🔒 数据安全</h3>
                <p className="text-muted-foreground mb-2">Data Security</p>
                <p className="text-sm">
                  完善的用户认证系统，数据加密存储，隐私保护
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Robust authentication, encrypted storage, privacy protection
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Slide 10: Data & Analytics */}
        <section className="min-h-[600px] bg-card rounded-2xl p-12 print:break-after-page print:min-h-screen">
          <h2 className="text-3xl font-bold mb-2">数据统计与分析</h2>
          <p className="text-xl text-muted-foreground mb-8">Data Statistics & Analytics</p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-background rounded-xl p-6 space-y-4">
              <div className="text-3xl">👤</div>
              <h3 className="text-lg font-semibold">个人学习数据</h3>
              <p className="text-sm text-muted-foreground">Personal Learning Data</p>
              <ul className="text-sm space-y-1">
                <li>• 单词掌握情况</li>
                <li>• 正确率统计</li>
                <li>• 学习时长</li>
                <li>• 错题本记录</li>
              </ul>
            </div>
            
            <div className="bg-background rounded-xl p-6 space-y-4">
              <div className="text-3xl">📊</div>
              <h3 className="text-lg font-semibold">班级统计</h3>
              <p className="text-sm text-muted-foreground">Class Statistics</p>
              <ul className="text-sm space-y-1">
                <li>• 班级整体进度</li>
                <li>• 活跃度排名</li>
                <li>• 薄弱词汇分析</li>
                <li>• 对比报告</li>
              </ul>
            </div>
            
            <div className="bg-background rounded-xl p-6 space-y-4">
              <div className="text-3xl">🏫</div>
              <h3 className="text-lg font-semibold">学校报告</h3>
              <p className="text-sm text-muted-foreground">School Reports</p>
              <ul className="text-sm space-y-1">
                <li>• 年级横向对比</li>
                <li>• 使用率统计</li>
                <li>• 效果评估</li>
                <li>• 趋势分析</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 bg-primary/10 rounded-xl p-6 text-center">
            <p className="text-lg font-medium">
              为教师和管理者提供全面的数据支持，助力精准教学
            </p>
            <p className="text-muted-foreground mt-2">
              Comprehensive data support for teachers and administrators to enable precision teaching
            </p>
          </div>
        </section>

        {/* Slide 11: Deployment Options */}
        <section className="min-h-[600px] bg-card rounded-2xl p-12 print:break-after-page print:min-h-screen">
          <h2 className="text-3xl font-bold mb-2">部署方案</h2>
          <p className="text-xl text-muted-foreground mb-8">Deployment Options</p>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-8 space-y-4">
              <h3 className="text-2xl font-bold">☁️ 云端部署</h3>
              <p className="text-muted-foreground">Cloud Deployment</p>
              <ul className="space-y-3 mt-4">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 即开即用，快速上线
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 自动更新维护
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 弹性扩容
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 适合中小规模部署
                </li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-8 space-y-4">
              <h3 className="text-2xl font-bold">🏢 私有化部署</h3>
              <p className="text-muted-foreground">On-Premise Deployment</p>
              <ul className="space-y-3 mt-4">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 数据完全自主可控
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 可定制化开发
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 独立运维
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 适合大规模机构
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 bg-background rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">支持服务 | Support Services</h3>
            <div className="grid md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="font-medium">部署培训</p>
                <p className="text-sm text-muted-foreground">Deployment Training</p>
              </div>
              <div>
                <p className="font-medium">技术支持</p>
                <p className="text-sm text-muted-foreground">Technical Support</p>
              </div>
              <div>
                <p className="font-medium">内容更新</p>
                <p className="text-sm text-muted-foreground">Content Updates</p>
              </div>
              <div>
                <p className="font-medium">定制开发</p>
                <p className="text-sm text-muted-foreground">Custom Development</p>
              </div>
            </div>
          </div>
        </section>

        {/* Slide 12: Contact */}
        <section className="min-h-[600px] flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 via-background to-primary/10 rounded-2xl p-12 print:min-h-screen">
          <div className="text-center space-y-8">
            <h2 className="text-4xl font-bold">感谢关注</h2>
            <p className="text-2xl text-muted-foreground">Thank You for Your Attention</p>
            
            <div className="h-1 w-32 bg-primary/50 mx-auto rounded-full" />
            
            <div className="space-y-4 mt-8">
              <p className="text-xl font-medium">狄邦教育</p>
              <p className="text-lg text-muted-foreground">Dipont Education</p>
            </div>
            
            <div className="mt-12 space-y-3 text-muted-foreground">
              <p>📧 contact@dipont.com</p>
              <p>🌐 www.dipont.com</p>
            </div>
            
            <div className="mt-8 p-6 bg-background/50 rounded-xl inline-block">
              <p className="text-lg font-medium">让每一个单词都充满乐趣</p>
              <p className="text-muted-foreground">Making Every Word a Joy to Learn</p>
            </div>
          </div>
        </section>

      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          section { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
};

export default ProductPPT;
