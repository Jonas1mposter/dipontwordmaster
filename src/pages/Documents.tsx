import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Documents = () => {
  const navigate = useNavigate();
  const [activeDoc, setActiveDoc] = useState<"delivery" | "plan">("delivery");

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 控制栏 - 打印时隐藏 */}
      <div className="print:hidden sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>

          <div className="flex items-center gap-4">
            <Tabs value={activeDoc} onValueChange={(v) => setActiveDoc(v as "delivery" | "plan")}>
              <TabsList>
                <TabsTrigger value="delivery">一期交付说明</TabsTrigger>
                <TabsTrigger value="plan">推广计划书</TabsTrigger>
              </TabsList>
            </Tabs>

            <Button onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              导出PDF
            </Button>
          </div>
        </div>
      </div>

      {/* 文档内容 */}
      <div className="max-w-4xl mx-auto p-8 print:p-0">{activeDoc === "delivery" ? <DeliveryDoc /> : <PlanDoc />}</div>
    </div>
  );
};

// 一期交付说明 - 中英文合并版
const DeliveryDoc = () => (
  <article className="prose prose-slate dark:prose-invert max-w-none print:text-black">
    <div className="text-center mb-12">
      <h1 className="text-3xl font-bold mb-2">狄邦单词通 / Dipont Word Master</h1>
      <h2 className="text-xl text-muted-foreground font-normal">一期交付说明文档 / Phase 1 Delivery Document</h2>
      <p className="text-sm text-muted-foreground mt-4">版本 Version 1.0 | 2025年12月 December 2025</p>
    </div>

    <section className="mb-8">
      <h2 className="text-2xl font-bold border-b pb-2">一、产品概述 / Product Overview</h2>
      <table className="w-full">
        <tbody>
          <tr>
            <td className="font-semibold w-40">产品名称 / Name</td>
            <td>狄邦单词通 / Dipont Word Master</td>
          </tr>
          <tr>
            <td className="font-semibold">产品定位 / Positioning</td>
            <td>游戏化英语单词学习对战平台 / Gamified English Vocabulary Learning & Battle Platform</td>
          </tr>
          <tr>
            <td className="font-semibold">目标用户 / Target Users</td>
            <td>初中七、八年级学生 / Grade 7 & 8 Middle School Students</td>
          </tr>
          <tr>
            <td className="font-semibold">核心价值 / Core Value</td>
            <td>
              通过实时对战、段位竞技、社交互动等游戏化机制，激发学生学习兴趣，提升单词记忆效率
              <br />
              <span className="text-muted-foreground text-sm">
                Stimulate learning interest and improve vocabulary retention through real-time battles, ranking system,
                and social interactions
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-bold border-b pb-2">二、设计特点 / Design Features</h2>

      <h3 className="text-xl font-semibold mt-6">2.1 视觉设计 / Visual Design</h3>
      <ul>
        <li>
          <strong>赛博朋克风格 / Cyberpunk Aesthetic</strong>：深色渐变背景 + 紫色霓虹光效，契合学生审美偏好
          <br />
          <span className="text-muted-foreground text-sm">
            Dark gradient backgrounds with purple neon effects, appealing to student preferences
          </span>
        </li>
        <li>
          <strong>游戏化UI / Gamified UI</strong>：电竞风段位徽章、星级评价、经验条等元素
          <br />
          <span className="text-muted-foreground text-sm">
            E-sports style rank badges, star ratings, XP progress bars
          </span>
        </li>
        <li>
          <strong>流畅动效 / Smooth Animations</strong>：Framer Motion驱动的界面动画，提升交互体验
          <br />
          <span className="text-muted-foreground text-sm">Framer Motion powered interface transitions</span>
        </li>
        <li>
          <strong>响应式布局 / Responsive Layout</strong>：完美适配手机、平板、电脑多端设备
          <br />
          <span className="text-muted-foreground text-sm">Perfect adaptation for mobile, tablet, and desktop</span>
        </li>
      </ul>

      <h3 className="text-xl font-semibold mt-6">2.2 核心功能模块 / Core Functional Modules</h3>

      <h4 className="font-semibold mt-4">智能分级学习系统 / Intelligent Graded Learning System</h4>
      <ul>
        <li>A-Z字母分组，符合词汇表编排逻辑 / A-Z alphabetical grouping following vocabulary list structure</li>
        <li>每10词一个小关卡，降低学习压力 / 10 words per level to reduce learning pressure</li>
        <li>三星评价机制，激励反复挑战 / Three-star rating system encouraging repeated challenges</li>
        <li>解锁机制，确保循序渐进 / Progressive unlock mechanism</li>
      </ul>

      <h4 className="font-semibold mt-4">实时对战系统 / Real-time Battle System</h4>
      <ul>
        <li>
          <strong>排位赛 / Ranked Mode</strong>：同年级同段位智能匹配，6大段位晋级体系 / Same grade/rank smart matching,
          6-tier ranking system
        </li>
        <li>
          <strong>自由对战 / Free Match</strong>：30秒内95%+匹配成功率，支持好友邀请、AI对战、观战 / 95%+ match success
          within 30 seconds, friend invites, AI opponents, spectator mode
        </li>
        <li>
          <strong>对战流程 / Battle Flow</strong>：倒计时准备 → 10题极速对决 → 实时分数同步 → 结算动画 / Countdown →
          10-question speed battle → Real-time score sync → Result animation
        </li>
      </ul>

      <h4 className="font-semibold mt-4">社交互动系统 / Social Interaction System</h4>
      <ul>
        <li>好友搜索与添加、请求管理 / Friend search, adding, and request management</li>
        <li>WebSocket实时私聊 / WebSocket real-time private messaging</li>
        <li>邀请对战、在线状态显示 / Battle invitations, online status display</li>
        <li>屏蔽与举报功能 / Block and report functions</li>
      </ul>

      <h4 className="font-semibold mt-4">错词本系统 / Wrong Word Book</h4>
      <ul>
        <li>答错自动收录，智能分类统计 / Auto-collection of incorrect answers with smart categorization</li>
        <li>针对性复习模式 / Targeted review mode</li>
        <li>掌握度追踪，从错词本毕业 / Mastery tracking and graduation system</li>
      </ul>

      <h4 className="font-semibold mt-4">游戏化激励系统 / Gamification Incentive System</h4>
      <ul>
        <li>
          <strong>每日任务 / Daily Quests</strong>：学习/对战/正确率/连胜等多元任务 / Learning, battle, accuracy, win
          streak tasks
        </li>
        <li>
          <strong>赛季通行证 / Season Pass</strong>：免费/付费双轨道奖励 / Free and premium reward tracks
        </li>
        <li>
          <strong>成就徽章 / Achievement Badges</strong>：多维度成就收集 / Multi-dimensional achievement collection
        </li>
      </ul>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-bold border-b pb-2">三、技术优势 / Technical Advantages</h2>

      <h3 className="text-xl font-semibold mt-6">3.1 技术架构 / Technology Stack</h3>
      <table className="w-full">
        <thead>
          <tr>
            <th>层级 / Layer</th>
            <th>技术选型 / Technology</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>前端框架 / Frontend</td>
            <td>React 18 + TypeScript</td>
          </tr>
          <tr>
            <td>构建工具 / Build Tool</td>
            <td>Vite（极速热更新 / Ultra-fast HMR）</td>
          </tr>
          <tr>
            <td>UI组件库 / UI Components</td>
            <td>shadcn/ui + Tailwind CSS</td>
          </tr>
          <tr>
            <td>后端服务 / Backend</td>
            <td>Lovable Cloud (Supabase)</td>
          </tr>
          <tr>
            <td>实时通信 / Real-time</td>
            <td>WebSocket (Supabase Realtime)</td>
          </tr>
          <tr>
            <td>移动端支持 / Mobile</td>
            <td>Capacitor（已集成 / Integrated）</td>
          </tr>
        </tbody>
      </table>

      <h3 className="text-xl font-semibold mt-6">3.2 性能指标 / Performance Metrics</h3>
      <ul>
        <li>
          <strong>并发能力 / Concurrency</strong>：优化后支持800-1000+用户同时在线 / Supports 800-1000+ simultaneous
          users after optimization
        </li>
        <li>
          <strong>实时同步 / Real-time Sync</strong>：对战延迟 &lt;100ms / Battle latency &lt;100ms
        </li>
        <li>
          <strong>离线友好 / Offline Friendly</strong>：本地缓存机制，弱网可用 / Local caching mechanism for weak
          network conditions
        </li>
      </ul>

      <h3 className="text-xl font-semibold mt-6">3.3 数据安全 / Data Security</h3>
      <ul>
        <li>行级安全策略（RLS）保护用户数据 / Row Level Security (RLS) protecting user data</li>
        <li>HTTPS/WSS全链路加密 / HTTPS/WSS end-to-end encryption</li>
        <li>服务端防作弊机制 / Server-side anti-cheat mechanisms</li>
        <li>每日自动数据备份 / Daily automatic data backups</li>
      </ul>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-bold border-b pb-2">四、竞争优势 / Competitive Advantages</h2>
      <table className="w-full">
        <thead>
          <tr>
            <th>维度 / Dimension</th>
            <th>传统背单词APP / Traditional Apps</th>
            <th>狄邦单词通 / Dipont Word Master</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>学习模式 / Learning Mode</td>
            <td>被动记忆 / Passive memorization</td>
            <td>对战激励主动学习 / Active learning through battles</td>
          </tr>
          <tr>
            <td>社交属性 / Social Features</td>
            <td>无或弱 / None or weak</td>
            <td>强社交（好友、排名、组队）/ Strong (friends, rankings, teams)</td>
          </tr>
          <tr>
            <td>用户粘性 / Retention</td>
            <td>低（7日留存&lt;20%）/ Low (7-day &lt;20%)</td>
            <td>高（预期7日留存&gt;60%）/ High (expected 7-day &gt;60%)</td>
          </tr>
          <tr>
            <td>校园适配 / School Fit</td>
            <td>通用产品 / Generic product</td>
            <td>专为无锡狄邦文理学校定制 / Custom-built for Wuxi Dipont School of Arts and Science</td>
          </tr>
          <tr>
            <td>数据安全 / Data Security</td>
            <td>第三方平台 / Third-party platforms</td>
            <td>自主可控 / Self-controlled</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-bold border-b pb-2">五、一期交付清单 / Phase 1 Delivery Checklist</h2>
      <table className="w-full">
        <thead>
          <tr>
            <th>模块 / Module</th>
            <th>功能项 / Feature</th>
            <th>状态 / Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowSpan={3}>用户系统 / User System</td>
            <td>注册/登录 / Registration & Login</td>
            <td>✅ 已完成 / Completed</td>
          </tr>
          <tr>
            <td>个人资料 / Profile Management</td>
            <td>✅ 已完成 / Completed</td>
          </tr>
          <tr>
            <td>头像上传 / Avatar Upload</td>
            <td>✅ 已完成 / Completed</td>
          </tr>
          <tr>
            <td rowSpan={2}>学习系统 / Learning System</td>
            <td>七年级词库 / Grade 7 Vocabulary</td>
            <td>✅ 已完成 / Completed</td>
          </tr>
          <tr>
            <td>八年级词库 / Grade 8 Vocabulary</td>
            <td>✅ 已完成 / Completed</td>
          </tr>
          <tr>
            <td rowSpan={2}>对战系统 / Battle System</td>
            <td>排位对战 / Ranked Battles</td>
            <td>✅ 已完成 / Completed</td>
          </tr>
          <tr>
            <td>自由对战 / Free Match</td>
            <td>✅ 已完成 / Completed</td>
          </tr>
          <tr>
            <td rowSpan={3}>社交系统 / Social System</td>
            <td>好友管理 / Friend Management</td>
            <td>✅ 已完成 / Completed</td>
          </tr>
          <tr>
            <td>实时聊天 / Real-time Chat</td>
            <td>✅ 已完成 / Completed</td>
          </tr>
          <tr>
            <td>邀请对战 / Battle Invitations</td>
            <td>✅ 已完成 / Completed</td>
          </tr>
          <tr>
            <td rowSpan={2}>激励系统 / Incentive System</td>
            <td>每日任务 / Daily Quests</td>
            <td>✅ 已完成 / Completed</td>
          </tr>
          <tr>
            <td>赛季通行证 / Season Pass</td>
            <td>✅ 已完成 / Completed</td>
          </tr>
          <tr>
            <td>辅助功能 / Auxiliary</td>
            <td>错词本 / Wrong Word Book</td>
            <td>✅ 已完成 / Completed</td>
          </tr>
          <tr>
            <td rowSpan={3}>应用商店 / App Store</td>
            <td>iOS 手机版 / iOS Phone</td>
            <td>📤 已提交审核 / Submitted for Review</td>
          </tr>
          <tr>
            <td>iOS 平板版 / iOS Tablet (iPad)</td>
            <td>📤 已提交审核 / Submitted for Review</td>
          </tr>
          <tr>
            <td>macOS 电脑版 / macOS Desktop</td>
            <td>📤 已提交审核 / Submitted for Review</td>
          </tr>
        </tbody>
      </table>
    </section>

    <footer className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
      <p>
        © 2025 狄邦单词通 / Dipont Word Master | 专为无锡狄邦文理学校定制开发 / Custom Developed for Wuxi Dipont School
        of Arts and Science
      </p>
    </footer>
  </article>
);

// 推广计划书 - 中英文合并版
const PlanDoc = () => (
  <article className="prose prose-slate dark:prose-invert max-w-none print:text-black">
    <div className="text-center mb-12">
      <h1 className="text-3xl font-bold mb-2">狄邦单词通 / Dipont Word Master</h1>
      <h2 className="text-xl text-muted-foreground font-normal">产品推广计划书 / Product Rollout Plan</h2>
      <p className="text-sm text-muted-foreground mt-4">版本 Version 1.0 | 2025年12月 December 2025</p>
    </div>

    <section className="mb-8">
      <h2 className="text-2xl font-bold border-b pb-2">项目概述 / Project Overview</h2>
      <table className="w-full">
        <tbody>
          <tr>
            <td className="font-semibold w-40">产品名称 / Name</td>
            <td>狄邦单词通 / Dipont Word Master</td>
          </tr>
          <tr>
            <td className="font-semibold">产品定位 / Positioning</td>
            <td>游戏化英语单词学习对战平台 / Gamified English Vocabulary Learning & Battle Platform</td>
          </tr>
          <tr>
            <td className="font-semibold">目标愿景 / Vision</td>
            <td>
              打造覆盖K12全学段的智能英语学习生态系统 / Build an intelligent English learning ecosystem covering all K12
              grades
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section className="mb-8 page-break-before">
      <h2 className="text-2xl font-bold border-b pb-2">
        一期计划：初中部推广（当前阶段）/ Phase 1: Middle School Rollout (Current)
      </h2>

      <h3 className="text-xl font-semibold mt-6">1.1 目标用户 / Target Users</h3>
      <ul>
        <li>
          <strong>年级范围 / Grade Range</strong>：七年级、八年级 / Grade 7 & 8
        </li>
        <li>
          <strong>预计用户规模 / Expected User Base</strong>：200-500人 / 200-500 students
        </li>
        <li>
          <strong>使用场景 / Use Cases</strong>：课堂辅助、课后复习、自主学习 / Classroom support, after-class review,
          self-study
        </li>
      </ul>

      <h3 className="text-xl font-semibold mt-6">1.2 已完成功能模块 / Completed Functional Modules</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>模块 / Module</th>
            <th>功能特性 / Features</th>
            <th>教学价值 / Educational Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>分级学习系统 / Graded Learning</td>
            <td>A-Z字母单元、10词小关卡、三星评价</td>
            <td>循序渐进，符合记忆曲线 / Progressive, follows memory curve</td>
          </tr>
          <tr>
            <td>排位对战 / Ranked Battles</td>
            <td>实时匹配、段位晋级、积分系统</td>
            <td>激发竞争意识，提升学习动力 / Stimulates competition</td>
          </tr>
          <tr>
            <td>自由对战 / Free Match</td>
            <td>好友邀请、AI对战、观战模式</td>
            <td>社交互动，降低学习孤独感 / Social interaction</td>
          </tr>
          <tr>
            <td>错词本 / Wrong Word Book</td>
            <td>自动收录、分类统计、针对复习</td>
            <td>精准定位薄弱点 / Precise weakness targeting</td>
          </tr>
          <tr>
            <td>每日任务 / Daily Quests</td>
            <td>学习/对战/正确率任务</td>
            <td>培养学习习惯 / Habit formation</td>
          </tr>
          <tr>
            <td>社交系统 / Social System</td>
            <td>好友添加、私聊、邀请对战</td>
            <td>构建学习社区 / Learning community</td>
          </tr>
        </tbody>
      </table>

      <h3 className="text-xl font-semibold mt-6">1.3 推广策略 / Rollout Strategy</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>阶段 / Phase</th>
            <th>时间 / Timeline</th>
            <th>内容 / Activities</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>试点班级 / Pilot Classes</td>
            <td>第1-2周 / Week 1-2</td>
            <td>选取1-2个试点班级，收集反馈，快速迭代 / Select 2-3 pilot classes, collect feedback</td>
          </tr>
          <tr>
            <td>年级推广 / Grade Expansion</td>
            <td>第3-4周 / Week 3-4</td>
            <td>加入班级/年级挑战赛，年级排行榜 / Add grade/class word challenge, leaderboards</td>
          </tr>
          <tr>
            <td>全面运营 / Full Operations</td>
            <td>第5周起 / Week 5+</td>
            <td>常态化融入教学体系，定期数据分析报告 / Integration into teaching system</td>
          </tr>
        </tbody>
      </table>

      <h3 className="text-xl font-semibold mt-6">1.4 成功指标 / Success Metrics</h3>
      <table className="w-full">
        <thead>
          <tr>
            <th>指标 / Metric</th>
            <th>目标值 / Target</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>日活跃率 / Daily Active Rate</td>
            <td>≥60%</td>
          </tr>
          <tr>
            <td>周留存率 / Weekly Retention</td>
            <td>≥70%</td>
          </tr>
          <tr>
            <td>平均学习时长 / Avg. Learning Time</td>
            <td>≥15分钟/天 / ≥15 min/day</td>
          </tr>
          <tr>
            <td>单词掌握率提升 / Vocabulary Mastery Improvement</td>
            <td>≥20%</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section className="mb-8 page-break-before">
      <h2 className="text-2xl font-bold border-b pb-2">二期计划：小学部推广 / Phase 2: Elementary School Rollout</h2>

      <h3 className="text-xl font-semibold mt-6">2.1 启动条件 / Launch Conditions</h3>
      <ul>
        <li>初中部运行稳定后启动 / Launch after middle school operations are stable</li>
        <li>日活跃率稳定在50%以上 / Daily active rate consistently above 50%</li>
        <li>技术架构经受住压力测试 / Technical architecture proven under stress tests</li>
      </ul>

      <h3 className="text-xl font-semibold mt-6">2.2 目标用户 / Target Users</h3>
      <ul>
        <li>
          <strong>年级范围 / Grade Range</strong>：1-6年级全覆盖 / Full coverage of Grades 1-6
        </li>
        <li>
          <strong>预计新增用户 / Expected New Users</strong>：500-1000人 / 500-1000 students
        </li>
        <li>
          <strong>总用户规模 / Total User Base</strong>：700-1500人 / 700-1500 users
        </li>
      </ul>

      <h3 className="text-xl font-semibold mt-6">2.3 适配改造 / Adaptations</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>层面 / Layer</th>
            <th>项目 / Item</th>
            <th>调整内容 / Changes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowSpan={2}>内容层面 / Content</td>
            <td>词汇库 / Vocabulary</td>
            <td>新增1-6年级词汇（约1500-2500词）/ Add Grade 1-6 words (1500-2500 words)</td>
          </tr>
          <tr>
            <td>题型设计 / Question Types</td>
            <td>增加图片选词、听音选词等低龄友好题型 / Add image-word matching, audio-word selection</td>
          </tr>
          <tr>
            <td rowSpan={2}>界面层面 / Interface</td>
            <td>视觉风格 / Visual Style</td>
            <td>可选卡通主题皮肤 / Optional cartoon theme skins</td>
          </tr>
          <tr>
            <td>交互设计 / Interaction</td>
            <td>更大的点击区域、更直观的引导 / Larger tap areas, more intuitive guidance</td>
          </tr>
          <tr>
            <td rowSpan={2}>功能层面 / Features</td>
            <td>家长监护 / Parental Controls</td>
            <td>学习时长限制、进度报告推送 / Time limits, progress report notifications</td>
          </tr>
          <tr>
            <td>发音跟读 / Pronunciation</td>
            <td>TTS语音示范 + 录音对比 / TTS voice demo + recording comparison</td>
          </tr>
        </tbody>
      </table>

      <h3 className="text-xl font-semibold mt-6">2.4 推广时间线 / Rollout Timeline</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>阶段 / Phase</th>
            <th>时间 / Timeline</th>
            <th>内容 / Activities</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>需求调研 / Research</td>
            <td>第1周 / Week 1</td>
            <td>小学英语教师访谈、学生使用习惯调研 / Teacher interviews, student usage research</td>
          </tr>
          <tr>
            <td>功能开发与测试 / Development & Testing</td>
            <td>第2-3周 / Week 2-3</td>
            <td>内容适配、界面改造、新功能开发、内部测试 / Content adaptation, UI redesign, testing</td>
          </tr>
          <tr>
            <td>全面推广 / Full Rollout</td>
            <td>第4周起 / Week 4+</td>
            <td>覆盖小学1-6年级 / Cover all elementary grades 1-6</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section className="mb-8 page-break-before">
      <h2 className="text-2xl font-bold border-b pb-2">三期计划：便携掌机开发 / Phase 3: Portable Learning Device</h2>

      <h3 className="text-xl font-semibold mt-6">3.1 产品形态 / Product Form</h3>
      <p>
        将Web应用封装为便携式学习掌机，实现"随时随地学单词"的极致体验。
        <br />
        <span className="text-muted-foreground text-sm">
          Package the web application into a portable learning device for anytime, anywhere vocabulary learning.
        </span>
      </p>

      <h3 className="text-xl font-semibold mt-6">3.2 硬件选型建议 / Hardware Options</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>方案 / Option</th>
            <th>设备 / Device</th>
            <th>优势 / Pros</th>
            <th>劣势 / Cons</th>
            <th>预估单价 / Est. Cost</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>方案A / Option A</td>
            <td>安卓学习平板 / Android Tablet</td>
            <td>生态成熟、开发简单 / Mature ecosystem</td>
            <td>体积较大 / Larger size</td>
            <td>¥300-500</td>
          </tr>
          <tr>
            <td>方案B / Option B</td>
            <td>定制安卓掌机 / Custom Handheld</td>
            <td>专用形态、游戏手感 / Gaming feel</td>
            <td>定制成本高 / Higher cost</td>
            <td>¥400-600</td>
          </tr>
          <tr>
            <td>方案C / Option C</td>
            <td>Linux开源掌机 / Linux Handheld</td>
            <td>成本低、可深度定制 / Low cost</td>
            <td>开发门槛高 / Higher dev barrier</td>
            <td>¥200-400</td>
          </tr>
        </tbody>
      </table>
      <p className="text-sm">
        <strong>推荐方案 / Recommended</strong>：方案A或B，基于成熟安卓生态，降低开发和维护成本。
        <br />
        <span className="text-muted-foreground">
          Option A or B, leveraging mature Android ecosystem for lower development and maintenance costs.
        </span>
      </p>

      <h3 className="text-xl font-semibold mt-6">3.3 技术实现路径 / Technical Implementation</h3>
      <div className="bg-muted/30 p-4 rounded-lg font-mono text-sm">
        <p>Web应用 → Capacitor封装 → 原生APK → 预装到设备</p>
        <p className="text-muted-foreground">Web App → Capacitor Packaging → Native APK → Pre-installed on Device</p>
        <ul className="mt-2">
          <li>· 离线词汇学习（本地缓存）/ Offline vocabulary learning (local cache)</li>
          <li>· WiFi环境下在线对战 / Online battles over WiFi</li>
          <li>· 自动同步学习进度 / Auto-sync learning progress</li>
          <li>· OTA远程更新 / OTA remote updates</li>
        </ul>
      </div>

      <h3 className="text-xl font-semibold mt-6">3.4 掌机功能规划 / Device Features</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>模式 / Mode</th>
            <th>功能 / Function</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowSpan={3}>离线模式 / Offline Mode</td>
            <td>词汇学习：本地缓存全部词库 / Vocabulary learning: local cache</td>
          </tr>
          <tr>
            <td>错词复习：离线刷题 / Wrong word review: offline practice</td>
          </tr>
          <tr>
            <td>学习进度：联网时自动同步 / Progress: auto-sync when connected</td>
          </tr>
          <tr>
            <td rowSpan={3}>在线模式 / Online Mode</td>
            <td>实时对战：WiFi环境下完整体验 / Real-time battles over WiFi</td>
          </tr>
          <tr>
            <td>排行榜：实时更新 / Leaderboards: real-time updates</td>
          </tr>
          <tr>
            <td>社交功能：好友互动 / Social features: friend interactions</td>
          </tr>
          <tr>
            <td rowSpan={3}>设备管理 / Device Management</td>
            <td>统一管理平台：学校可批量管理设备 / Unified management platform</td>
          </tr>
          <tr>
            <td>使用时长控制：防沉迷机制 / Usage time control: anti-addiction</td>
          </tr>
          <tr>
            <td>远程锁定/解锁：防止滥用 / Remote lock/unlock</td>
          </tr>
        </tbody>
      </table>

      <h3 className="text-xl font-semibold mt-6">3.5 开发时间线 / Development Timeline</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>阶段 / Phase</th>
            <th>时间 / Timeline</th>
            <th>内容 / Activities</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>硬件选型 / Hardware Selection</td>
            <td>第1-2周 / Week 1-2</td>
            <td>测试样机、确定供应商 / Test samples, select suppliers</td>
          </tr>
          <tr>
            <td>封装开发 / Packaging Development</td>
            <td>第3-6周 / Week 3-6</td>
            <td>Capacitor封装、离线功能开发 / Capacitor packaging, offline features</td>
          </tr>
          <tr>
            <td>系统定制 / System Customization</td>
            <td>第7-10周 / Week 7-10</td>
            <td>安卓系统精简、开机自启 / Android system optimization, auto-start</td>
          </tr>
          <tr>
            <td>样机测试 / Sample Testing</td>
            <td>第11-12周 / Week 11-12</td>
            <td>功能测试、续航测试 / Function testing, battery testing</td>
          </tr>
          <tr>
            <td>小批量试产 / Pilot Production</td>
            <td>第13-16周 / Week 13-16</td>
            <td>首批50-100台 / First batch 50-100 units</td>
          </tr>
          <tr>
            <td>规模化生产 / Mass Production</td>
            <td>第17周起 / Week 17+</td>
            <td>根据需求量产 / Scale based on demand</td>
          </tr>
        </tbody>
      </table>

      <h3 className="text-xl font-semibold mt-6">3.6 成本预算（参考）/ Cost Estimates (Reference)</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>项目 / Item</th>
            <th>单价预估 / Est. Unit Cost</th>
            <th>备注 / Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>硬件成本 / Hardware</td>
            <td>¥300-500/台 / per unit</td>
            <td>含屏幕、电池、外壳 / Includes screen, battery, case</td>
          </tr>
          <tr>
            <td>软件授权 / Software License</td>
            <td>¥0</td>
            <td>自研产品 / Self-developed</td>
          </tr>
          <tr>
            <td>定制开发 / Custom Development</td>
            <td>一次性投入 / One-time investment</td>
            <td>系统封装、OTA系统 / System packaging, OTA</td>
          </tr>
          <tr>
            <td>售后维护 / After-sales</td>
            <td>约5%/年 / ~5%/year</td>
            <td>更换损坏设备 / Replace damaged devices</td>
          </tr>
        </tbody>
      </table>
    </section>

    <footer className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
      <p>
        © 2025 狄邦单词通 / Dipont Word Master | 专为无锡狄邦文理学校定制开发 / Custom Developed for Wuxi Dipont School
        of Arts and Science
      </p>
    </footer>
  </article>
);

export default Documents;
