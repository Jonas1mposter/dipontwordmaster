import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Printer, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Documents = () => {
  const navigate = useNavigate();
  const [activeDoc, setActiveDoc] = useState<"delivery" | "plan">("delivery");
  const [language, setLanguage] = useState<"zh" | "en">("zh");

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
            
            <Tabs value={language} onValueChange={(v) => setLanguage(v as "zh" | "en")}>
              <TabsList>
                <TabsTrigger value="zh">中文</TabsTrigger>
                <TabsTrigger value="en">English</TabsTrigger>
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
      <div className="max-w-4xl mx-auto p-8 print:p-0">
        {activeDoc === "delivery" ? (
          language === "zh" ? <DeliveryDocZh /> : <DeliveryDocEn />
        ) : (
          language === "zh" ? <PlanDocZh /> : <PlanDocEn />
        )}
      </div>
    </div>
  );
};

// 一期交付说明 - 中文版
const DeliveryDocZh = () => (
  <article className="prose prose-slate dark:prose-invert max-w-none print:text-black">
    <div className="text-center mb-12">
      <h1 className="text-3xl font-bold mb-2">狄邦单词通</h1>
      <h2 className="text-xl text-muted-foreground font-normal">一期交付说明文档</h2>
      <p className="text-sm text-muted-foreground mt-4">版本 1.0 | 2025年1月</p>
    </div>

    <section className="mb-8">
      <h2 className="text-2xl font-bold border-b pb-2">一、产品概述</h2>
      <table className="w-full">
        <tbody>
          <tr><td className="font-semibold w-32">产品名称</td><td>狄邦单词通</td></tr>
          <tr><td className="font-semibold">产品定位</td><td>游戏化英语单词学习对战平台</td></tr>
          <tr><td className="font-semibold">目标用户</td><td>初中七、八年级学生</td></tr>
          <tr><td className="font-semibold">核心价值</td><td>通过实时对战、段位竞技、社交互动等游戏化机制，激发学生学习兴趣，提升单词记忆效率</td></tr>
        </tbody>
      </table>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-bold border-b pb-2">二、设计特点</h2>
      
      <h3 className="text-xl font-semibold mt-6">2.1 视觉设计</h3>
      <ul>
        <li><strong>赛博朋克风格</strong>：深色渐变背景 + 紫色霓虹光效，契合学生审美偏好</li>
        <li><strong>游戏化UI</strong>：电竞风段位徽章、星级评价、经验条等元素</li>
        <li><strong>流畅动效</strong>：Framer Motion驱动的界面动画，提升交互体验</li>
        <li><strong>响应式布局</strong>：完美适配手机、平板、电脑多端设备</li>
      </ul>

      <h3 className="text-xl font-semibold mt-6">2.2 核心功能模块</h3>
      
      <h4 className="font-semibold mt-4">智能分级学习系统</h4>
      <ul>
        <li>A-Z字母分组，符合词汇表编排逻辑</li>
        <li>每10词一个小关卡，降低学习压力</li>
        <li>三星评价机制，激励反复挑战</li>
        <li>解锁机制，确保循序渐进</li>
      </ul>

      <h4 className="font-semibold mt-4">实时对战系统</h4>
      <ul>
        <li><strong>排位赛</strong>：同年级同段位智能匹配，6大段位晋级体系</li>
        <li><strong>自由对战</strong>：30秒内95%+匹配成功率，支持好友邀请、AI对战、观战</li>
        <li><strong>对战流程</strong>：倒计时准备 → 10题极速对决 → 实时分数同步 → 结算动画</li>
      </ul>

      <h4 className="font-semibold mt-4">社交互动系统</h4>
      <ul>
        <li>好友搜索与添加、请求管理</li>
        <li>WebSocket实时私聊</li>
        <li>邀请对战、在线状态显示</li>
        <li>屏蔽与举报功能</li>
      </ul>

      <h4 className="font-semibold mt-4">错词本系统</h4>
      <ul>
        <li>答错自动收录，智能分类统计</li>
        <li>针对性复习模式</li>
        <li>掌握度追踪，从错词本毕业</li>
      </ul>

      <h4 className="font-semibold mt-4">游戏化激励系统</h4>
      <ul>
        <li><strong>每日任务</strong>：学习/对战/正确率/连胜等多元任务</li>
        <li><strong>赛季通行证</strong>：免费/付费双轨道奖励</li>
        <li><strong>成就徽章</strong>：多维度成就收集</li>
      </ul>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-bold border-b pb-2">三、技术优势</h2>
      
      <h3 className="text-xl font-semibold mt-6">3.1 技术架构</h3>
      <table className="w-full">
        <thead>
          <tr><th>层级</th><th>技术选型</th></tr>
        </thead>
        <tbody>
          <tr><td>前端框架</td><td>React 18 + TypeScript</td></tr>
          <tr><td>构建工具</td><td>Vite（极速热更新）</td></tr>
          <tr><td>UI组件库</td><td>shadcn/ui + Tailwind CSS</td></tr>
          <tr><td>后端服务</td><td>Lovable Cloud (Supabase)</td></tr>
          <tr><td>实时通信</td><td>WebSocket (Supabase Realtime)</td></tr>
          <tr><td>移动端支持</td><td>Capacitor（已集成）</td></tr>
        </tbody>
      </table>

      <h3 className="text-xl font-semibold mt-6">3.2 性能指标</h3>
      <ul>
        <li><strong>并发能力</strong>：优化后支持800-1000+用户同时在线</li>
        <li><strong>实时同步</strong>：对战延迟 &lt;100ms</li>
        <li><strong>离线友好</strong>：本地缓存机制，弱网可用</li>
      </ul>

      <h3 className="text-xl font-semibold mt-6">3.3 数据安全</h3>
      <ul>
        <li>行级安全策略（RLS）保护用户数据</li>
        <li>HTTPS/WSS全链路加密</li>
        <li>服务端防作弊机制</li>
        <li>每日自动数据备份</li>
      </ul>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-bold border-b pb-2">四、竞争优势</h2>
      <table className="w-full">
        <thead>
          <tr><th>维度</th><th>传统背单词APP</th><th>狄邦单词通</th></tr>
        </thead>
        <tbody>
          <tr><td>学习模式</td><td>被动记忆</td><td>对战激励主动学习</td></tr>
          <tr><td>社交属性</td><td>无或弱</td><td>强社交（好友、排名、组队）</td></tr>
          <tr><td>用户粘性</td><td>低（7日留存&lt;20%）</td><td>高（预期7日留存&gt;60%）</td></tr>
          <tr><td>校园适配</td><td>通用产品</td><td>专为狄邦定制</td></tr>
          <tr><td>数据安全</td><td>第三方平台</td><td>自主可控</td></tr>
        </tbody>
      </table>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-bold border-b pb-2">五、一期交付清单</h2>
      <table className="w-full">
        <thead>
          <tr><th>模块</th><th>功能项</th><th>状态</th></tr>
        </thead>
        <tbody>
          <tr><td rowSpan={3}>用户系统</td><td>注册/登录</td><td>✅ 已完成</td></tr>
          <tr><td>个人资料</td><td>✅ 已完成</td></tr>
          <tr><td>头像上传</td><td>✅ 已完成</td></tr>
          <tr><td rowSpan={2}>学习系统</td><td>七年级词库</td><td>✅ 已完成</td></tr>
          <tr><td>八年级词库</td><td>✅ 已完成</td></tr>
          <tr><td rowSpan={2}>对战系统</td><td>排位对战</td><td>✅ 已完成</td></tr>
          <tr><td>自由对战</td><td>✅ 已完成</td></tr>
          <tr><td rowSpan={3}>社交系统</td><td>好友管理</td><td>✅ 已完成</td></tr>
          <tr><td>实时聊天</td><td>✅ 已完成</td></tr>
          <tr><td>邀请对战</td><td>✅ 已完成</td></tr>
          <tr><td rowSpan={2}>激励系统</td><td>每日任务</td><td>✅ 已完成</td></tr>
          <tr><td>赛季通行证</td><td>✅ 已完成</td></tr>
          <tr><td>辅助功能</td><td>错词本</td><td>✅ 已完成</td></tr>
        </tbody>
      </table>
    </section>

    <footer className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
      <p>© 2025 狄邦单词通 | 专为狄邦学校定制开发</p>
    </footer>
  </article>
);

// 一期交付说明 - 英文版
const DeliveryDocEn = () => (
  <article className="prose prose-slate dark:prose-invert max-w-none print:text-black">
    <div className="text-center mb-12">
      <h1 className="text-3xl font-bold mb-2">Dipont Word Master</h1>
      <h2 className="text-xl text-muted-foreground font-normal">Phase 1 Delivery Document</h2>
      <p className="text-sm text-muted-foreground mt-4">Version 1.0 | January 2025</p>
    </div>

    <section className="mb-8">
      <h2 className="text-2xl font-bold border-b pb-2">1. Product Overview</h2>
      <table className="w-full">
        <tbody>
          <tr><td className="font-semibold w-40">Product Name</td><td>Dipont Word Master</td></tr>
          <tr><td className="font-semibold">Positioning</td><td>Gamified English Vocabulary Learning & Battle Platform</td></tr>
          <tr><td className="font-semibold">Target Users</td><td>Grade 7 & 8 Middle School Students</td></tr>
          <tr><td className="font-semibold">Core Value</td><td>Stimulate learning interest and improve vocabulary retention through real-time battles, ranking system, and social interactions</td></tr>
        </tbody>
      </table>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-bold border-b pb-2">2. Design Features</h2>
      
      <h3 className="text-xl font-semibold mt-6">2.1 Visual Design</h3>
      <ul>
        <li><strong>Cyberpunk Aesthetic</strong>: Dark gradient backgrounds with purple neon effects, appealing to student preferences</li>
        <li><strong>Gamified UI</strong>: E-sports style rank badges, star ratings, XP progress bars</li>
        <li><strong>Smooth Animations</strong>: Framer Motion powered interface transitions</li>
        <li><strong>Responsive Layout</strong>: Perfect adaptation for mobile, tablet, and desktop</li>
      </ul>

      <h3 className="text-xl font-semibold mt-6">2.2 Core Functional Modules</h3>
      
      <h4 className="font-semibold mt-4">Intelligent Graded Learning System</h4>
      <ul>
        <li>A-Z alphabetical grouping following vocabulary list structure</li>
        <li>10 words per level to reduce learning pressure</li>
        <li>Three-star rating system encouraging repeated challenges</li>
        <li>Progressive unlock mechanism</li>
      </ul>

      <h4 className="font-semibold mt-4">Real-time Battle System</h4>
      <ul>
        <li><strong>Ranked Mode</strong>: Same grade/rank smart matching, 6-tier ranking system</li>
        <li><strong>Free Match</strong>: 95%+ match success within 30 seconds, friend invites, AI opponents, spectator mode</li>
        <li><strong>Battle Flow</strong>: Countdown → 10-question speed battle → Real-time score sync → Result animation</li>
      </ul>

      <h4 className="font-semibold mt-4">Social Interaction System</h4>
      <ul>
        <li>Friend search, adding, and request management</li>
        <li>WebSocket real-time private messaging</li>
        <li>Battle invitations, online status display</li>
        <li>Block and report functions</li>
      </ul>

      <h4 className="font-semibold mt-4">Wrong Word Book</h4>
      <ul>
        <li>Auto-collection of incorrect answers with smart categorization</li>
        <li>Targeted review mode</li>
        <li>Mastery tracking and graduation system</li>
      </ul>

      <h4 className="font-semibold mt-4">Gamification Incentive System</h4>
      <ul>
        <li><strong>Daily Quests</strong>: Learning, battle, accuracy, win streak tasks</li>
        <li><strong>Season Pass</strong>: Free and premium reward tracks</li>
        <li><strong>Achievement Badges</strong>: Multi-dimensional achievement collection</li>
      </ul>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-bold border-b pb-2">3. Technical Advantages</h2>
      
      <h3 className="text-xl font-semibold mt-6">3.1 Technology Stack</h3>
      <table className="w-full">
        <thead>
          <tr><th>Layer</th><th>Technology</th></tr>
        </thead>
        <tbody>
          <tr><td>Frontend Framework</td><td>React 18 + TypeScript</td></tr>
          <tr><td>Build Tool</td><td>Vite (Ultra-fast HMR)</td></tr>
          <tr><td>UI Components</td><td>shadcn/ui + Tailwind CSS</td></tr>
          <tr><td>Backend Services</td><td>Lovable Cloud (Supabase)</td></tr>
          <tr><td>Real-time Communication</td><td>WebSocket (Supabase Realtime)</td></tr>
          <tr><td>Mobile Support</td><td>Capacitor (Integrated)</td></tr>
        </tbody>
      </table>

      <h3 className="text-xl font-semibold mt-6">3.2 Performance Metrics</h3>
      <ul>
        <li><strong>Concurrency</strong>: Supports 800-1000+ simultaneous users after optimization</li>
        <li><strong>Real-time Sync</strong>: Battle latency &lt;100ms</li>
        <li><strong>Offline Friendly</strong>: Local caching mechanism for weak network conditions</li>
      </ul>

      <h3 className="text-xl font-semibold mt-6">3.3 Data Security</h3>
      <ul>
        <li>Row Level Security (RLS) protecting user data</li>
        <li>HTTPS/WSS end-to-end encryption</li>
        <li>Server-side anti-cheat mechanisms</li>
        <li>Daily automatic data backups</li>
      </ul>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-bold border-b pb-2">4. Competitive Advantages</h2>
      <table className="w-full">
        <thead>
          <tr><th>Dimension</th><th>Traditional Vocab Apps</th><th>Dipont Word Master</th></tr>
        </thead>
        <tbody>
          <tr><td>Learning Mode</td><td>Passive memorization</td><td>Active learning through battles</td></tr>
          <tr><td>Social Features</td><td>None or weak</td><td>Strong (friends, rankings, teams)</td></tr>
          <tr><td>User Retention</td><td>Low (7-day &lt;20%)</td><td>High (expected 7-day &gt;60%)</td></tr>
          <tr><td>School Adaptation</td><td>Generic product</td><td>Custom-built for Dipont</td></tr>
          <tr><td>Data Security</td><td>Third-party platforms</td><td>Self-controlled</td></tr>
        </tbody>
      </table>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-bold border-b pb-2">5. Phase 1 Delivery Checklist</h2>
      <table className="w-full">
        <thead>
          <tr><th>Module</th><th>Feature</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr><td rowSpan={3}>User System</td><td>Registration/Login</td><td>✅ Completed</td></tr>
          <tr><td>Profile Management</td><td>✅ Completed</td></tr>
          <tr><td>Avatar Upload</td><td>✅ Completed</td></tr>
          <tr><td rowSpan={2}>Learning System</td><td>Grade 7 Vocabulary</td><td>✅ Completed</td></tr>
          <tr><td>Grade 8 Vocabulary</td><td>✅ Completed</td></tr>
          <tr><td rowSpan={2}>Battle System</td><td>Ranked Battles</td><td>✅ Completed</td></tr>
          <tr><td>Free Match</td><td>✅ Completed</td></tr>
          <tr><td rowSpan={3}>Social System</td><td>Friend Management</td><td>✅ Completed</td></tr>
          <tr><td>Real-time Chat</td><td>✅ Completed</td></tr>
          <tr><td>Battle Invitations</td><td>✅ Completed</td></tr>
          <tr><td rowSpan={2}>Incentive System</td><td>Daily Quests</td><td>✅ Completed</td></tr>
          <tr><td>Season Pass</td><td>✅ Completed</td></tr>
          <tr><td>Auxiliary Features</td><td>Wrong Word Book</td><td>✅ Completed</td></tr>
        </tbody>
      </table>
    </section>

    <footer className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
      <p>© 2025 Dipont Word Master | Custom Developed for Dipont School</p>
    </footer>
  </article>
);

// 推广计划书 - 中文版
const PlanDocZh = () => (
  <article className="prose prose-slate dark:prose-invert max-w-none print:text-black">
    <div className="text-center mb-12">
      <h1 className="text-3xl font-bold mb-2">狄邦单词通</h1>
      <h2 className="text-xl text-muted-foreground font-normal">产品推广计划书</h2>
      <p className="text-sm text-muted-foreground mt-4">版本 1.0 | 2025年1月</p>
    </div>

    <section className="mb-8">
      <h2 className="text-2xl font-bold border-b pb-2">项目概述</h2>
      <table className="w-full">
        <tbody>
          <tr><td className="font-semibold w-32">产品名称</td><td>狄邦单词通</td></tr>
          <tr><td className="font-semibold">产品定位</td><td>游戏化英语单词学习对战平台</td></tr>
          <tr><td className="font-semibold">目标愿景</td><td>打造覆盖K12全学段的智能英语学习生态系统</td></tr>
        </tbody>
      </table>
    </section>

    <section className="mb-8 page-break-before">
      <h2 className="text-2xl font-bold border-b pb-2">一期计划：初中部推广（当前阶段）</h2>
      
      <h3 className="text-xl font-semibold mt-6">1.1 目标用户</h3>
      <ul>
        <li><strong>年级范围</strong>：七年级、八年级</li>
        <li><strong>预计用户规模</strong>：200-500人</li>
        <li><strong>使用场景</strong>：课堂辅助、课后复习、自主学习</li>
      </ul>

      <h3 className="text-xl font-semibold mt-6">1.2 已完成功能模块</h3>
      <table className="w-full text-sm">
        <thead>
          <tr><th>模块</th><th>功能特性</th><th>教学价值</th></tr>
        </thead>
        <tbody>
          <tr><td>分级学习系统</td><td>A-Z字母单元、10词小关卡、三星评价</td><td>循序渐进，符合记忆曲线</td></tr>
          <tr><td>排位对战</td><td>实时匹配、段位晋级、积分系统</td><td>激发竞争意识，提升学习动力</td></tr>
          <tr><td>自由对战</td><td>好友邀请、AI对战、观战模式</td><td>社交互动，降低学习孤独感</td></tr>
          <tr><td>错词本</td><td>自动收录、分类统计、针对复习</td><td>精准定位薄弱点，提高效率</td></tr>
          <tr><td>每日任务</td><td>学习/对战/正确率任务</td><td>培养学习习惯，保持活跃度</td></tr>
          <tr><td>社交系统</td><td>好友添加、私聊、邀请对战</td><td>构建学习社区，同伴互助</td></tr>
        </tbody>
      </table>

      <h3 className="text-xl font-semibold mt-6">1.3 推广策略</h3>
      <table className="w-full text-sm">
        <thead>
          <tr><th>阶段</th><th>时间</th><th>内容</th></tr>
        </thead>
        <tbody>
          <tr><td>试点班级</td><td>第1-2周</td><td>选取2-3个试点班级，收集反馈，快速迭代</td></tr>
          <tr><td>年级推广</td><td>第3-4周</td><td>举办单词王争霸赛，班级排行榜，教师培训</td></tr>
          <tr><td>全面运营</td><td>第5周起</td><td>常态化融入教学体系，定期数据分析报告</td></tr>
        </tbody>
      </table>

      <h3 className="text-xl font-semibold mt-6">1.4 成功指标</h3>
      <table className="w-full">
        <thead>
          <tr><th>指标</th><th>目标值</th></tr>
        </thead>
        <tbody>
          <tr><td>日活跃率</td><td>≥60%</td></tr>
          <tr><td>周留存率</td><td>≥70%</td></tr>
          <tr><td>平均学习时长</td><td>≥15分钟/天</td></tr>
          <tr><td>单词掌握率提升</td><td>≥20%</td></tr>
        </tbody>
      </table>
    </section>

    <section className="mb-8 page-break-before">
      <h2 className="text-2xl font-bold border-b pb-2">二期计划：小学部推广</h2>
      
      <h3 className="text-xl font-semibold mt-6">2.1 启动条件</h3>
      <ul>
        <li>初中部运行稳定3个月以上</li>
        <li>日活跃率稳定在50%以上</li>
        <li>技术架构经受住压力测试</li>
      </ul>

      <h3 className="text-xl font-semibold mt-6">2.2 适配改造</h3>
      <table className="w-full text-sm">
        <thead>
          <tr><th>层面</th><th>项目</th><th>调整内容</th></tr>
        </thead>
        <tbody>
          <tr><td rowSpan={2}>内容层面</td><td>词汇库</td><td>新增3-6年级词汇（约800-1200词）</td></tr>
          <tr><td>题型设计</td><td>增加图片选词、听音选词等低龄友好题型</td></tr>
          <tr><td rowSpan={2}>界面层面</td><td>视觉风格</td><td>可选卡通主题皮肤</td></tr>
          <tr><td>交互设计</td><td>更大的点击区域、更直观的引导</td></tr>
          <tr><td rowSpan={2}>功能层面</td><td>家长监护</td><td>学习时长限制、进度报告推送</td></tr>
          <tr><td>发音跟读</td><td>TTS语音示范 + 录音对比</td></tr>
        </tbody>
      </table>

      <h3 className="text-xl font-semibold mt-6">2.3 推广时间线</h3>
      <table className="w-full text-sm">
        <thead>
          <tr><th>阶段</th><th>时间</th><th>内容</th></tr>
        </thead>
        <tbody>
          <tr><td>需求调研</td><td>第1-2周</td><td>小学英语教师访谈、学生使用习惯调研</td></tr>
          <tr><td>功能开发</td><td>第3-8周</td><td>内容适配、界面改造、新功能开发</td></tr>
          <tr><td>内部测试</td><td>第9-10周</td><td>教师试用、问题修复</td></tr>
          <tr><td>试点推广</td><td>第11-12周</td><td>选取试点年级</td></tr>
          <tr><td>全面推广</td><td>第13周起</td><td>覆盖小学全年级</td></tr>
        </tbody>
      </table>

      <h3 className="text-xl font-semibold mt-6">2.4 预期用户规模</h3>
      <ul>
        <li>小学部预计新增用户：300-600人</li>
        <li>总用户规模：500-1100人</li>
      </ul>
    </section>

    <section className="mb-8 page-break-before">
      <h2 className="text-2xl font-bold border-b pb-2">三期计划：便携掌机开发</h2>
      
      <h3 className="text-xl font-semibold mt-6">3.1 产品形态</h3>
      <p>将Web应用封装为便携式学习掌机，实现"随时随地学单词"的极致体验。</p>

      <h3 className="text-xl font-semibold mt-6">3.2 硬件选型建议</h3>
      <table className="w-full text-sm">
        <thead>
          <tr><th>方案</th><th>设备</th><th>优势</th><th>劣势</th><th>预估单价</th></tr>
        </thead>
        <tbody>
          <tr><td>方案A</td><td>安卓学习平板</td><td>生态成熟、开发简单</td><td>体积较大</td><td>¥300-500</td></tr>
          <tr><td>方案B</td><td>定制安卓掌机</td><td>专用形态、游戏手感</td><td>定制成本高</td><td>¥400-600</td></tr>
          <tr><td>方案C</td><td>Linux开源掌机</td><td>成本低、可深度定制</td><td>开发门槛高</td><td>¥200-400</td></tr>
        </tbody>
      </table>
      <p className="text-sm"><strong>推荐方案</strong>：方案A或B，基于成熟安卓生态，降低开发和维护成本。</p>

      <h3 className="text-xl font-semibold mt-6">3.3 技术实现路径</h3>
      <div className="bg-muted/30 p-4 rounded-lg font-mono text-sm">
        <p>Web应用 → Capacitor封装 → 原生APK → 预装到设备</p>
        <ul className="mt-2">
          <li>· 离线词汇学习（本地缓存）</li>
          <li>· WiFi环境下在线对战</li>
          <li>· 自动同步学习进度</li>
          <li>· OTA远程更新</li>
        </ul>
      </div>

      <h3 className="text-xl font-semibold mt-6">3.4 掌机功能规划</h3>
      <table className="w-full text-sm">
        <thead>
          <tr><th>模式</th><th>功能</th></tr>
        </thead>
        <tbody>
          <tr><td rowSpan={3}>离线模式</td><td>词汇学习：本地缓存全部词库</td></tr>
          <tr><td>错词复习：离线刷题</td></tr>
          <tr><td>学习进度：联网时自动同步</td></tr>
          <tr><td rowSpan={3}>在线模式</td><td>实时对战：WiFi环境下完整体验</td></tr>
          <tr><td>排行榜：实时更新</td></tr>
          <tr><td>社交功能：好友互动</td></tr>
          <tr><td rowSpan={3}>设备管理</td><td>统一管理平台：学校可批量管理设备</td></tr>
          <tr><td>使用时长控制：防沉迷机制</td></tr>
          <tr><td>远程锁定/解锁：防止滥用</td></tr>
        </tbody>
      </table>

      <h3 className="text-xl font-semibold mt-6">3.5 开发时间线</h3>
      <table className="w-full text-sm">
        <thead>
          <tr><th>阶段</th><th>时间</th><th>内容</th></tr>
        </thead>
        <tbody>
          <tr><td>硬件选型</td><td>第1-2周</td><td>测试样机、确定供应商</td></tr>
          <tr><td>封装开发</td><td>第3-6周</td><td>Capacitor封装、离线功能开发</td></tr>
          <tr><td>系统定制</td><td>第7-10周</td><td>安卓系统精简、开机自启</td></tr>
          <tr><td>样机测试</td><td>第11-12周</td><td>功能测试、续航测试</td></tr>
          <tr><td>小批量试产</td><td>第13-16周</td><td>首批50-100台</td></tr>
          <tr><td>规模化生产</td><td>第17周起</td><td>根据需求量产</td></tr>
        </tbody>
      </table>

      <h3 className="text-xl font-semibold mt-6">3.6 成本预算（参考）</h3>
      <table className="w-full text-sm">
        <thead>
          <tr><th>项目</th><th>单价预估</th><th>备注</th></tr>
        </thead>
        <tbody>
          <tr><td>硬件成本</td><td>¥300-500/台</td><td>含屏幕、电池、外壳</td></tr>
          <tr><td>软件授权</td><td>¥0</td><td>自研产品</td></tr>
          <tr><td>定制开发</td><td>一次性投入</td><td>系统封装、OTA系统</td></tr>
          <tr><td>售后维护</td><td>约5%/年</td><td>更换损坏设备</td></tr>
        </tbody>
      </table>
    </section>

    <section className="mb-8 page-break-before">
      <h2 className="text-2xl font-bold border-b pb-2">项目里程碑</h2>
      <table className="w-full">
        <thead>
          <tr><th>阶段</th><th>时间</th><th>目标</th></tr>
        </thead>
        <tbody>
          <tr><td>一期：初中部推广</td><td>2025 Q1-Q2</td><td>500用户，验证模式，收集反馈</td></tr>
          <tr><td>二期：小学部推广</td><td>2025 Q3-Q4</td><td>1000+用户，全学段覆盖，完善生态</td></tr>
          <tr><td>三期：便携掌机开发</td><td>2026 Q1-Q2</td><td>硬件产品化，商业化潜力，品牌影响力</td></tr>
        </tbody>
      </table>
    </section>

    <footer className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
      <p>© 2025 狄邦单词通 | 专为狄邦学校定制开发</p>
    </footer>
  </article>
);

// 推广计划书 - 英文版
const PlanDocEn = () => (
  <article className="prose prose-slate dark:prose-invert max-w-none print:text-black">
    <div className="text-center mb-12">
      <h1 className="text-3xl font-bold mb-2">Dipont Word Master</h1>
      <h2 className="text-xl text-muted-foreground font-normal">Product Rollout Plan</h2>
      <p className="text-sm text-muted-foreground mt-4">Version 1.0 | January 2025</p>
    </div>

    <section className="mb-8">
      <h2 className="text-2xl font-bold border-b pb-2">Project Overview</h2>
      <table className="w-full">
        <tbody>
          <tr><td className="font-semibold w-40">Product Name</td><td>Dipont Word Master</td></tr>
          <tr><td className="font-semibold">Positioning</td><td>Gamified English Vocabulary Learning & Battle Platform</td></tr>
          <tr><td className="font-semibold">Vision</td><td>Build an intelligent English learning ecosystem covering all K12 grades</td></tr>
        </tbody>
      </table>
    </section>

    <section className="mb-8 page-break-before">
      <h2 className="text-2xl font-bold border-b pb-2">Phase 1: Middle School Rollout (Current)</h2>
      
      <h3 className="text-xl font-semibold mt-6">1.1 Target Users</h3>
      <ul>
        <li><strong>Grade Range</strong>: Grade 7 & 8</li>
        <li><strong>Expected User Base</strong>: 200-500 students</li>
        <li><strong>Use Cases</strong>: Classroom support, after-class review, self-study</li>
      </ul>

      <h3 className="text-xl font-semibold mt-6">1.2 Completed Functional Modules</h3>
      <table className="w-full text-sm">
        <thead>
          <tr><th>Module</th><th>Features</th><th>Educational Value</th></tr>
        </thead>
        <tbody>
          <tr><td>Graded Learning</td><td>A-Z units, 10-word levels, 3-star rating</td><td>Progressive, follows memory curve</td></tr>
          <tr><td>Ranked Battles</td><td>Real-time matching, ranking tiers, point system</td><td>Stimulates competition, boosts motivation</td></tr>
          <tr><td>Free Match</td><td>Friend invites, AI opponents, spectator mode</td><td>Social interaction, reduces isolation</td></tr>
          <tr><td>Wrong Word Book</td><td>Auto-collection, categorization, targeted review</td><td>Precise weakness targeting</td></tr>
          <tr><td>Daily Quests</td><td>Learning/battle/accuracy tasks</td><td>Habit formation, maintains engagement</td></tr>
          <tr><td>Social System</td><td>Friend adding, chat, battle invites</td><td>Learning community, peer support</td></tr>
        </tbody>
      </table>

      <h3 className="text-xl font-semibold mt-6">1.3 Rollout Strategy</h3>
      <table className="w-full text-sm">
        <thead>
          <tr><th>Phase</th><th>Timeline</th><th>Activities</th></tr>
        </thead>
        <tbody>
          <tr><td>Pilot Classes</td><td>Week 1-2</td><td>Select 2-3 pilot classes, collect feedback, rapid iteration</td></tr>
          <tr><td>Grade Expansion</td><td>Week 3-4</td><td>Word Champion competition, class leaderboards, teacher training</td></tr>
          <tr><td>Full Operations</td><td>Week 5+</td><td>Integration into teaching system, regular data analysis reports</td></tr>
        </tbody>
      </table>

      <h3 className="text-xl font-semibold mt-6">1.4 Success Metrics</h3>
      <table className="w-full">
        <thead>
          <tr><th>Metric</th><th>Target</th></tr>
        </thead>
        <tbody>
          <tr><td>Daily Active Rate</td><td>≥60%</td></tr>
          <tr><td>Weekly Retention</td><td>≥70%</td></tr>
          <tr><td>Avg. Learning Time</td><td>≥15 min/day</td></tr>
          <tr><td>Vocabulary Mastery Improvement</td><td>≥20%</td></tr>
        </tbody>
      </table>
    </section>

    <section className="mb-8 page-break-before">
      <h2 className="text-2xl font-bold border-b pb-2">Phase 2: Elementary School Rollout</h2>
      
      <h3 className="text-xl font-semibold mt-6">2.1 Launch Conditions</h3>
      <ul>
        <li>Middle school operations stable for 3+ months</li>
        <li>Daily active rate consistently above 50%</li>
        <li>Technical architecture proven under stress tests</li>
      </ul>

      <h3 className="text-xl font-semibold mt-6">2.2 Adaptations</h3>
      <table className="w-full text-sm">
        <thead>
          <tr><th>Layer</th><th>Item</th><th>Changes</th></tr>
        </thead>
        <tbody>
          <tr><td rowSpan={2}>Content</td><td>Vocabulary</td><td>Add Grade 3-6 words (800-1200 words)</td></tr>
          <tr><td>Question Types</td><td>Add image-word matching, audio-word selection for younger students</td></tr>
          <tr><td rowSpan={2}>Interface</td><td>Visual Style</td><td>Optional cartoon theme skins</td></tr>
          <tr><td>Interaction</td><td>Larger tap areas, more intuitive guidance</td></tr>
          <tr><td rowSpan={2}>Features</td><td>Parental Controls</td><td>Time limits, progress report notifications</td></tr>
          <tr><td>Pronunciation</td><td>TTS voice demo + recording comparison</td></tr>
        </tbody>
      </table>

      <h3 className="text-xl font-semibold mt-6">2.3 Rollout Timeline</h3>
      <table className="w-full text-sm">
        <thead>
          <tr><th>Phase</th><th>Timeline</th><th>Activities</th></tr>
        </thead>
        <tbody>
          <tr><td>Research</td><td>Week 1-2</td><td>Elementary teacher interviews, student usage research</td></tr>
          <tr><td>Development</td><td>Week 3-8</td><td>Content adaptation, UI redesign, new features</td></tr>
          <tr><td>Internal Testing</td><td>Week 9-10</td><td>Teacher trials, bug fixes</td></tr>
          <tr><td>Pilot Rollout</td><td>Week 11-12</td><td>Select pilot grades</td></tr>
          <tr><td>Full Rollout</td><td>Week 13+</td><td>Cover all elementary grades</td></tr>
        </tbody>
      </table>

      <h3 className="text-xl font-semibold mt-6">2.4 Expected User Scale</h3>
      <ul>
        <li>Elementary school: 300-600 new users</li>
        <li>Total user base: 500-1100 users</li>
      </ul>
    </section>

    <section className="mb-8 page-break-before">
      <h2 className="text-2xl font-bold border-b pb-2">Phase 3: Portable Learning Device</h2>
      
      <h3 className="text-xl font-semibold mt-6">3.1 Product Form</h3>
      <p>Package the web application into a portable learning device for anytime, anywhere vocabulary learning.</p>

      <h3 className="text-xl font-semibold mt-6">3.2 Hardware Options</h3>
      <table className="w-full text-sm">
        <thead>
          <tr><th>Option</th><th>Device</th><th>Pros</th><th>Cons</th><th>Est. Cost</th></tr>
        </thead>
        <tbody>
          <tr><td>Option A</td><td>Android Learning Tablet</td><td>Mature ecosystem, easy dev</td><td>Larger size</td><td>¥300-500</td></tr>
          <tr><td>Option B</td><td>Custom Android Handheld</td><td>Dedicated form factor, gaming feel</td><td>Higher customization cost</td><td>¥400-600</td></tr>
          <tr><td>Option C</td><td>Linux Open-source Handheld</td><td>Low cost, deep customization</td><td>Higher dev barrier</td><td>¥200-400</td></tr>
        </tbody>
      </table>
      <p className="text-sm"><strong>Recommended</strong>: Option A or B, leveraging mature Android ecosystem for lower development and maintenance costs.</p>

      <h3 className="text-xl font-semibold mt-6">3.3 Technical Implementation</h3>
      <div className="bg-muted/30 p-4 rounded-lg font-mono text-sm">
        <p>Web App → Capacitor Packaging → Native APK → Pre-installed on Device</p>
        <ul className="mt-2">
          <li>· Offline vocabulary learning (local cache)</li>
          <li>· Online battles over WiFi</li>
          <li>· Auto-sync learning progress</li>
          <li>· OTA remote updates</li>
        </ul>
      </div>

      <h3 className="text-xl font-semibold mt-6">3.4 Device Features</h3>
      <table className="w-full text-sm">
        <thead>
          <tr><th>Mode</th><th>Features</th></tr>
        </thead>
        <tbody>
          <tr><td rowSpan={3}>Offline Mode</td><td>Vocabulary learning: Locally cached word bank</td></tr>
          <tr><td>Wrong word review: Offline practice</td></tr>
          <tr><td>Progress sync: Auto-sync when online</td></tr>
          <tr><td rowSpan={3}>Online Mode</td><td>Real-time battles: Full experience over WiFi</td></tr>
          <tr><td>Leaderboards: Real-time updates</td></tr>
          <tr><td>Social features: Friend interactions</td></tr>
          <tr><td rowSpan={3}>Device Management</td><td>Unified platform: Batch device management for schools</td></tr>
          <tr><td>Time controls: Anti-addiction measures</td></tr>
          <tr><td>Remote lock/unlock: Prevent misuse</td></tr>
        </tbody>
      </table>

      <h3 className="text-xl font-semibold mt-6">3.5 Development Timeline</h3>
      <table className="w-full text-sm">
        <thead>
          <tr><th>Phase</th><th>Timeline</th><th>Activities</th></tr>
        </thead>
        <tbody>
          <tr><td>Hardware Selection</td><td>Week 1-2</td><td>Test samples, select supplier</td></tr>
          <tr><td>App Packaging</td><td>Week 3-6</td><td>Capacitor packaging, offline features</td></tr>
          <tr><td>System Customization</td><td>Week 7-10</td><td>Android system slimming, auto-start</td></tr>
          <tr><td>Prototype Testing</td><td>Week 11-12</td><td>Functional testing, battery testing</td></tr>
          <tr><td>Small Batch Production</td><td>Week 13-16</td><td>First batch of 50-100 units</td></tr>
          <tr><td>Mass Production</td><td>Week 17+</td><td>Scale production based on demand</td></tr>
        </tbody>
      </table>

      <h3 className="text-xl font-semibold mt-6">3.6 Cost Estimate</h3>
      <table className="w-full text-sm">
        <thead>
          <tr><th>Item</th><th>Estimate</th><th>Notes</th></tr>
        </thead>
        <tbody>
          <tr><td>Hardware Cost</td><td>¥300-500/unit</td><td>Screen, battery, shell</td></tr>
          <tr><td>Software License</td><td>¥0</td><td>Self-developed product</td></tr>
          <tr><td>Custom Development</td><td>One-time investment</td><td>System packaging, OTA system</td></tr>
          <tr><td>After-sales Maintenance</td><td>~5%/year</td><td>Replacement of damaged devices</td></tr>
        </tbody>
      </table>
    </section>

    <section className="mb-8 page-break-before">
      <h2 className="text-2xl font-bold border-b pb-2">Project Milestones</h2>
      <table className="w-full">
        <thead>
          <tr><th>Phase</th><th>Timeline</th><th>Goals</th></tr>
        </thead>
        <tbody>
          <tr><td>Phase 1: Middle School</td><td>2025 Q1-Q2</td><td>500 users, validate model, collect feedback</td></tr>
          <tr><td>Phase 2: Elementary School</td><td>2025 Q3-Q4</td><td>1000+ users, full grade coverage, complete ecosystem</td></tr>
          <tr><td>Phase 3: Portable Device</td><td>2026 Q1-Q2</td><td>Hardware productization, commercial potential, brand influence</td></tr>
        </tbody>
      </table>
    </section>

    <footer className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
      <p>© 2025 Dipont Word Master | Custom Developed for Dipont School</p>
    </footer>
  </article>
);

export default Documents;
