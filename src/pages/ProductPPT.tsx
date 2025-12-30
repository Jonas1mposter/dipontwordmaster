import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Sparkles, Zap, Trophy, Users, Target, Shield, BarChart3, Cloud, Smartphone, Gamepad2, BookOpen, Swords, Award, MessageCircle, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const ProductPPT = () => {
  const navigate = useNavigate();
  const [visibleSlides, setVisibleSlides] = useState<Set<number>>(new Set());

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const slideIndex = parseInt(entry.target.getAttribute('data-slide') || '0');
            setVisibleSlides((prev) => new Set(prev).add(slideIndex));
          }
        });
      },
      { threshold: 0.2 }
    );

    document.querySelectorAll('[data-slide]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const getSlideAnimation = (index: number, delay: number = 0) => {
    const isVisible = visibleSlides.has(index);
    return {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
      transition: `all 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
    };
  };

  const getItemAnimation = (index: number, itemIndex: number) => {
    const isVisible = visibleSlides.has(index);
    return {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
      transition: `all 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${150 + itemIndex * 100}ms`,
    };
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Control Bar - Hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          打印/导出PDF
        </Button>
      </div>

      {/* PPT Content */}
      <div className="max-w-6xl mx-auto p-8 space-y-20 print:space-y-0">
        
        {/* Slide 1: Cover */}
        <section 
          data-slide="1"
          className="min-h-[700px] flex flex-col items-center justify-center text-center relative overflow-hidden rounded-3xl p-12 print:break-after-page print:min-h-screen"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)/0.15) 0%, hsl(var(--background)) 50%, hsl(var(--primary)/0.1) 100%)',
          }}
        >
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none print:hidden">
            <div className="absolute top-20 left-20 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-20 w-48 h-48 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-accent/10 rounded-full blur-2xl animate-float" />
          </div>

          <div className="relative z-10 space-y-8" style={getSlideAnimation(1)}>
            {/* Logo */}
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
              <img 
                src="/lovable-uploads/122730b2-9017-437d-b8c7-3055cea14fe7.png" 
                alt="狄邦单词通 Logo" 
                className="w-32 h-32 mx-auto relative z-10 drop-shadow-2xl"
              />
            </div>

            <div className="space-y-4">
              <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent animate-shimmer">
                狄邦单词通
              </h1>
              <p className="text-2xl md:text-3xl text-muted-foreground font-light tracking-wide">
                Dipont Word Master
              </p>
            </div>

            <div className="h-1 w-40 bg-gradient-to-r from-transparent via-primary/60 to-transparent mx-auto rounded-full" />
            
            <div className="space-y-2 max-w-2xl">
              <p className="text-xl md:text-2xl font-medium">
                让英语学习充满乐趣的游戏化背单词平台
              </p>
              <p className="text-lg text-muted-foreground">
                A Gamified English Vocabulary Learning Platform
              </p>
            </div>

            {/* Feature highlights */}
            <div className="flex flex-wrap justify-center gap-4 pt-6">
              {[
                { icon: Gamepad2, label: '游戏化学习', labelEn: 'Gamified Learning' },
                { icon: Swords, label: '实时对战', labelEn: 'Real-time Battles' },
                { icon: Trophy, label: '排行竞技', labelEn: 'Competitive Rankings' },
              ].map((item, i) => (
                <div 
                  key={i}
                  className="flex flex-col items-center gap-1 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 hover:bg-primary/20 transition-all duration-300 hover:scale-105"
                  style={getItemAnimation(1, i)}
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.labelEn}</span>
                </div>
              ))}
            </div>

            <div className="pt-8 text-muted-foreground">
              <p className="font-medium">狄邦教育 | Dipont Education</p>
            </div>
          </div>
        </section>

        {/* Slide 2: Market Pain Points */}
        <section 
          data-slide="2"
          className="min-h-[600px] bg-card rounded-3xl p-12 relative overflow-hidden print:break-after-page print:min-h-screen"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-destructive/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 print:hidden" />
          
          <div style={getSlideAnimation(2)}>
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-8 w-8 text-destructive" />
              <h2 className="text-3xl md:text-4xl font-bold">市场痛点</h2>
            </div>
            <p className="text-xl text-muted-foreground mb-10">Market Pain Points</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {[
              {
                emoji: '😴',
                title: '学习枯燥乏味',
                subtitle: 'Boring Learning Experience',
                desc: '传统背单词方式机械重复，学生缺乏持续学习动力，平均坚持时间不足2周',
                descEn: 'Traditional rote memorization lacks engagement, average persistence less than 2 weeks',
              },
              {
                emoji: '📊',
                title: '进度难以追踪',
                subtitle: 'Difficult Progress Tracking',
                desc: '家长和老师无法实时了解学生学习情况，无法针对性辅导',
                descEn: 'Parents and teachers struggle to monitor student progress in real-time',
              },
              {
                emoji: '🏝️',
                title: '学习孤立无趣',
                subtitle: 'Isolated Learning',
                desc: '缺乏同伴互动和竞争氛围，学习过程单调，无法形成良好学习习惯',
                descEn: 'Lack of peer interaction and competition makes learning monotonous',
              },
            ].map((item, i) => (
              <div 
                key={i}
                className="group bg-destructive/5 hover:bg-destructive/10 rounded-2xl p-6 space-y-4 border border-destructive/10 hover:border-destructive/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl"
                style={getItemAnimation(2, i)}
              >
                <div className="text-5xl group-hover:scale-110 transition-transform duration-300">{item.emoji}</div>
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                <div className="h-px bg-destructive/20 w-full" />
                <p className="text-sm leading-relaxed">{item.desc}</p>
                <p className="text-xs text-muted-foreground">{item.descEn}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Slide 3: Product Positioning */}
        <section 
          data-slide="3"
          className="min-h-[600px] bg-card rounded-3xl p-12 relative overflow-hidden print:break-after-page print:min-h-screen"
        >
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 print:hidden" />
          
          <div style={getSlideAnimation(3)}>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold">产品定位</h2>
            </div>
            <p className="text-xl text-muted-foreground mb-10">Product Positioning</p>
          </div>
          
          <div className="flex flex-col items-center justify-center space-y-10 mt-8">
            <div className="text-center max-w-3xl space-y-4" style={getItemAnimation(3, 0)}>
              <p className="text-2xl md:text-3xl font-medium leading-relaxed">
                面向初中学生（7-8年级）的
                <span className="text-primary font-bold mx-2 relative">
                  游戏化
                  <span className="absolute -bottom-1 left-0 w-full h-1 bg-primary/30 rounded-full" />
                </span>
                英语词汇学习平台
              </p>
              <p className="text-xl text-muted-foreground">
                A Gamified English Vocabulary Platform for Middle School Students (Grades 7-8)
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 w-full mt-8">
              {[
                { icon: Gamepad2, title: '游戏化机制', subtitle: 'Gamification Mechanics', desc: '等级、段位、排行榜、成就系统', descEn: 'Levels, ranks, leaderboards, achievements' },
                { icon: BookOpen, title: '教材同步', subtitle: 'Curriculum Aligned', desc: '紧贴课本单元，按字母分级学习', descEn: 'Textbook-aligned, A-Z organized learning' },
                { icon: Swords, title: '社交竞技', subtitle: 'Social Competition', desc: '实时对战，好友互动，班级竞赛', descEn: 'Real-time battles, friend interactions, class competitions' },
              ].map((item, i) => (
                <div 
                  key={i}
                  className="group bg-primary/5 hover:bg-primary/10 rounded-2xl p-6 text-center border border-primary/10 hover:border-primary/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:shadow-primary/10"
                  style={getItemAnimation(3, i + 1)}
                >
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                    <item.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{item.subtitle}</p>
                  <p className="text-sm mt-3">{item.desc}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.descEn}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Slide 4: Core Features - Learning with Screenshot */}
        <section 
          data-slide="4"
          className="min-h-[700px] bg-card rounded-3xl p-12 print:break-after-page print:min-h-screen"
        >
          <div style={getSlideAnimation(4)}>
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold">核心功能：闯关学习</h2>
            </div>
            <p className="text-xl text-muted-foreground mb-10">Core Feature: Level-based Learning</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-background rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300" style={getItemAnimation(4, 0)}>
                <h3 className="text-xl font-bold mb-5 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  三阶段学习模式 | Three-Stage Learning
                </h3>
                <div className="space-y-4">
                  {[
                    { num: 1, color: 'blue', label: '识记 Recognition', desc: '单词卡片学习，建立初步印象', descEn: 'Flashcard learning for initial impression' },
                    { num: 2, color: 'green', label: '拼写 Spelling', desc: '听写、填空，强化拼写记忆', descEn: 'Dictation and fill-in to reinforce spelling' },
                    { num: 3, color: 'purple', label: '应用 Application', desc: '语境应用，深度掌握', descEn: 'Contextual usage for deep mastery' },
                  ].map((stage, i) => (
                    <div key={i} className="flex items-center gap-4 group">
                      <span className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 group-hover:scale-110 ${
                        stage.color === 'blue' ? 'bg-blue-500/20 text-blue-500' :
                        stage.color === 'green' ? 'bg-green-500/20 text-green-500' :
                        'bg-purple-500/20 text-purple-500'
                      }`}>
                        {stage.num}
                      </span>
                      <div>
                        <p className="font-semibold">{stage.label}</p>
                        <p className="text-sm text-muted-foreground">{stage.desc}</p>
                        <p className="text-xs text-muted-foreground">{stage.descEn}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-background rounded-2xl p-6 border border-border/50" style={getItemAnimation(4, 1)}>
                <h3 className="text-xl font-bold mb-4">5种题型 | 5 Quiz Types</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { zh: '词义选择', en: 'Meaning Selection' },
                    { zh: '单词选择', en: 'Word Selection' },
                    { zh: '拼写测试', en: 'Spelling Test' },
                    { zh: '听力识别', en: 'Listening' },
                    { zh: '填空应用', en: 'Fill in the Blank' },
                  ].map((type, i) => (
                    <div key={i} className={`bg-muted/50 hover:bg-muted rounded-xl p-3 text-center transition-all duration-300 hover:scale-105 ${i === 4 ? 'col-span-2' : ''}`}>
                      <p className="font-medium text-sm">{type.zh}</p>
                      <p className="text-xs text-muted-foreground">{type.en}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Interface Preview */}
            <div className="relative" style={getItemAnimation(4, 2)}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl blur-xl" />
              <div className="relative bg-background/80 backdrop-blur rounded-3xl p-6 border border-primary/20 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  <span className="ml-2 text-xs text-muted-foreground">关卡选择界面 | Level Selection</span>
                </div>
                <div className="space-y-3">
                  <div className="text-center mb-4">
                    <p className="text-lg font-bold">Unit A - 单元关卡</p>
                    <p className="text-sm text-muted-foreground">按字母 A-Z 分组学习 | Organized A-Z</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((level, i) => (
                      <div 
                        key={i} 
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all duration-300 hover:scale-105 ${
                          i < 3 ? 'bg-green-500/20 text-green-600 border border-green-500/30' : 
                          i === 3 ? 'bg-primary/20 text-primary border border-primary/30 animate-pulse' :
                          'bg-muted/50 text-muted-foreground'
                        }`}
                      >
                        <span className="text-lg">Level {level}</span>
                        {i < 3 && <span className="text-xs">★★★</span>}
                        {i === 3 && <span className="text-xs">In Progress</span>}
                        {i > 3 && <span className="text-xs">🔒</span>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-muted/30 rounded-xl text-center">
                    <p className="text-sm text-muted-foreground">每个关卡包含 10-15 个单词 | 10-15 words per level</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Slide 5: Core Features - Battle with Screenshot */}
        <section 
          data-slide="5"
          className="min-h-[700px] bg-card rounded-3xl p-12 relative overflow-hidden print:break-after-page print:min-h-screen"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl print:hidden" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl print:hidden" />
          
          <div style={getSlideAnimation(5)}>
            <div className="flex items-center gap-3 mb-2">
              <Swords className="h-8 w-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold">核心功能：实时对战</h2>
            </div>
            <p className="text-xl text-muted-foreground mb-10">Core Feature: Real-time Battles</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div 
                className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-2xl p-6 border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 hover:-translate-y-1"
                style={getItemAnimation(5, 0)}
              >
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-orange-500" />
                  排位对战
                </h3>
                <p className="text-muted-foreground mb-4">Ranked Battles</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                    <span>实时匹配同年级、相近段位对手<br /><span className="text-muted-foreground text-xs">Match with same-grade, similar-rank opponents</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                    <span>90秒限时单词挑战，考验反应速度<br /><span className="text-muted-foreground text-xs">90-second timed word challenges</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                    <span>胜负影响段位积分，挑战更高段位<br /><span className="text-muted-foreground text-xs">Win/loss affects rank points</span></span>
                  </li>
                </ul>
              </div>
              
              <div 
                className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:-translate-y-1"
                style={getItemAnimation(5, 1)}
              >
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Users className="h-6 w-6 text-blue-500" />
                  自由对战
                </h3>
                <p className="text-muted-foreground mb-4">Free Matches</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <span>好友之间自由切磋，不影响段位<br /><span className="text-muted-foreground text-xs">Practice with friends, no rank impact</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <span>支持观战功能，学习高手策略<br /><span className="text-muted-foreground text-xs">Spectate mode to learn from experts</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <span>独立胜率/胜场排行榜<br /><span className="text-muted-foreground text-xs">Separate win rate / wins leaderboard</span></span>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Battle Interface Preview */}
            <div className="relative" style={getItemAnimation(5, 2)}>
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-blue-500/10 rounded-3xl blur-xl" />
              <div className="relative bg-background/80 backdrop-blur rounded-3xl p-6 border border-primary/20 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  <span className="ml-2 text-xs text-muted-foreground">对战匹配界面 | Battle Matching</span>
                </div>
                
                <div className="flex items-center justify-between gap-4">
                  {/* Player 1 */}
                  <div className="flex-1 text-center">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary/30 to-primary/10 rounded-full flex items-center justify-center mb-2 ring-2 ring-primary/30">
                      <span className="text-2xl">👤</span>
                    </div>
                    <p className="font-bold text-sm">Player A</p>
                    <p className="text-xs text-muted-foreground">Gold III</p>
                    <div className="flex justify-center gap-1 mt-1">
                      <span className="w-4 h-4 bg-yellow-500/20 rounded-full text-xs flex items-center justify-center">🎖️</span>
                      <span className="w-4 h-4 bg-blue-500/20 rounded-full text-xs flex items-center justify-center">⭐</span>
                    </div>
                  </div>
                  
                  {/* VS */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full flex items-center justify-center animate-pulse">
                      <span className="text-xl font-black text-orange-500">VS</span>
                    </div>
                  </div>
                  
                  {/* Player 2 */}
                  <div className="flex-1 text-center">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500/30 to-blue-500/10 rounded-full flex items-center justify-center mb-2 ring-2 ring-blue-500/30">
                      <span className="text-2xl">👤</span>
                    </div>
                    <p className="font-bold text-sm">Player B</p>
                    <p className="text-xs text-muted-foreground">Gold II</p>
                    <div className="flex justify-center gap-1 mt-1">
                      <span className="w-4 h-4 bg-green-500/20 rounded-full text-xs flex items-center justify-center">🏆</span>
                      <span className="w-4 h-4 bg-purple-500/20 rounded-full text-xs flex items-center justify-center">💎</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">对战即将开始... | Battle starting...</p>
                  <div className="w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full animate-pulse" style={{ width: '70%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Rank Tier System */}
          <div className="mt-10 bg-background rounded-2xl p-6 border border-border/50" style={getItemAnimation(5, 3)}>
            <h3 className="text-xl font-bold mb-6 text-center">段位系统 | Rank Tier System</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { icon: '🥉', name: '青铜', nameEn: 'Bronze', color: 'bg-amber-900/20' },
                { icon: '🥈', name: '白银', nameEn: 'Silver', color: 'bg-slate-400/20' },
                { icon: '🥇', name: '黄金', nameEn: 'Gold', color: 'bg-yellow-500/20' },
                { icon: '💎', name: '铂金', nameEn: 'Platinum', color: 'bg-cyan-500/20' },
                { icon: '💠', name: '钻石', nameEn: 'Diamond', color: 'bg-blue-500/20' },
                { icon: '👑', name: '王者', nameEn: 'Champion', color: 'bg-purple-500/20' },
              ].map((rank, i) => (
                <div 
                  key={i} 
                  className={`${rank.color} rounded-xl p-4 text-center min-w-[100px] hover:scale-110 transition-all duration-300 hover:shadow-lg cursor-default`}
                >
                  <div className="text-3xl mb-1">{rank.icon}</div>
                  <p className="font-bold text-sm">{rank.name}</p>
                  <p className="text-xs text-muted-foreground">{rank.nameEn}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Slide 6: Gamification System */}
        <section 
          data-slide="6"
          className="min-h-[600px] bg-card rounded-3xl p-12 print:break-after-page print:min-h-screen"
        >
          <div style={getSlideAnimation(6)}>
            <div className="flex items-center gap-3 mb-2">
              <Award className="h-8 w-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold">游戏化激励系统</h2>
            </div>
            <p className="text-xl text-muted-foreground mb-10">Gamification & Incentive System</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: '⚡', title: '经验值 & 等级', subtitle: 'XP & Level System', desc: '完成学习和对战获得经验，提升等级解锁更多内容', descEn: 'Earn XP from learning and battles, level up to unlock content' },
              { icon: '🪙', title: '狄邦豆货币', subtitle: 'Dipont Coins', desc: '游戏内货币，用于购买道具和装饰', descEn: 'In-game currency for items and cosmetics' },
              { icon: '🔥', title: '连续登录', subtitle: 'Login Streak', desc: '每日签到奖励，培养学习习惯', descEn: 'Daily check-in rewards to build learning habits' },
              { icon: '🏆', title: '三大排行榜', subtitle: 'Triple Leaderboards', desc: '财富榜、胜场榜、经验榜，多维度竞争', descEn: 'Coins, wins, and XP rankings for multi-dimensional competition' },
              { icon: '🎖️', title: '徽章收集', subtitle: 'Badge Collection', desc: '完成成就解锁专属徽章，最多装备3个展示', descEn: 'Unlock exclusive badges, equip up to 3 for display' },
              { icon: '🎴', title: '称号卡系统', subtitle: 'Name Card System', desc: '排行榜前10名专属称号卡，彰显荣耀', descEn: 'Exclusive name cards for top 10 leaderboard players' },
            ].map((item, i) => (
              <div 
                key={i}
                className="group bg-background rounded-2xl p-5 space-y-3 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
                style={getItemAnimation(6, i)}
              >
                <div className="text-4xl group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                <p className="text-sm leading-relaxed">{item.desc}</p>
                <p className="text-xs text-muted-foreground">{item.descEn}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-8 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/20" style={getItemAnimation(6, 6)}>
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              每日任务系统 | Daily Quest System
            </h3>
            <p className="text-muted-foreground">
              每日更新的任务目标，完成获得奖励，保持学习动力 | Daily refreshing quests with rewards to maintain learning motivation
            </p>
          </div>
        </section>

        {/* Slide 7: Social Features */}
        <section 
          data-slide="7"
          className="min-h-[600px] bg-card rounded-3xl p-12 print:break-after-page print:min-h-screen"
        >
          <div style={getSlideAnimation(7)}>
            <div className="flex items-center gap-3 mb-2">
              <MessageCircle className="h-8 w-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold">社交互动系统</h2>
            </div>
            <p className="text-xl text-muted-foreground mb-10">Social Interaction System</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-background rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300" style={getItemAnimation(7, 0)}>
                <h3 className="text-xl font-bold mb-4">👥 好友系统 | Friend System</h3>
                <ul className="space-y-3">
                  {[
                    '搜索添加好友 / Search & add friends',
                    '好友请求管理 / Friend request management',
                    '查看好友状态 / View friend status',
                    '屏蔽/举报功能 / Block & report',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 group">
                      <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs group-hover:scale-110 transition-transform">✓</span>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-background rounded-2xl p-6 border border-border/50" style={getItemAnimation(7, 1)}>
                <h3 className="text-xl font-bold mb-3">💬 即时聊天 | Real-time Chat</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  好友之间可以发送消息，讨论学习内容，约战PK<br />
                  Friends can send messages, discuss learning, and challenge each other
                </p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-background rounded-2xl p-6 border border-border/50" style={getItemAnimation(7, 2)}>
                <h3 className="text-xl font-bold mb-3">⚔️ 对战邀请 | Battle Invites</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  一键邀请好友进行自由对战，实时通知<br />
                  One-click invite friends to free matches with real-time notifications
                </p>
              </div>
              
              <div className="bg-background rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300" style={getItemAnimation(7, 3)}>
                <h3 className="text-xl font-bold mb-4">🏫 班级/年级挑战 | Class/Grade Challenges</h3>
                <ul className="space-y-3">
                  {[
                    '班级整体排名 / Class rankings',
                    '年级整体排名 / Grade rankings',
                    '赛季奖励 / Season rewards',
                    '专属称号卡和徽章 / Exclusive cards & badges',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 group">
                      <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs group-hover:scale-110 transition-transform">✓</span>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Slide 8: Season Pass */}
        <section 
          data-slide="8"
          className="min-h-[600px] bg-card rounded-3xl p-12 relative overflow-hidden print:break-after-page print:min-h-screen"
        >
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none print:hidden" />
          
          <div className="relative z-10" style={getSlideAnimation(8)}>
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-8 w-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold">赛季通行证系统</h2>
            </div>
            <p className="text-xl text-muted-foreground mb-10">Season Pass System</p>
          </div>
          
          <div className="relative z-10 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 border border-primary/20" style={getItemAnimation(8, 0)}>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold">赛季制运营</h3>
                <p className="text-muted-foreground">Season-based Operation</p>
                <ul className="space-y-4 mt-4">
                  {[
                    { icon: '📅', title: '定期赛季更新', desc: 'Regular season updates with fresh content' },
                    { icon: '🎁', title: '等级奖励解锁', desc: 'Level-based reward unlocking' },
                    { icon: '⭐', title: '免费 & 高级通行证', desc: 'Free & Premium pass tiers' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <p className="font-semibold">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-2xl font-bold">通行证奖励</h3>
                <p className="text-muted-foreground">Pass Rewards</p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {[
                    { icon: '🪙', label: '狄邦豆', labelEn: 'Coins' },
                    { icon: '⚡', label: '经验加成', labelEn: 'XP Boost' },
                    { icon: '🎖️', label: '专属徽章', labelEn: 'Badges' },
                    { icon: '🎴', label: '限定称号卡', labelEn: 'Name Cards' },
                  ].map((item, i) => (
                    <div key={i} className="bg-background/50 rounded-xl p-4 text-center hover:bg-background/80 transition-all duration-300 hover:scale-105">
                      <div className="text-3xl mb-2">{item.icon}</div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.labelEn}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 mt-8 text-center" style={getItemAnimation(8, 1)}>
            <p className="text-lg font-medium">持续运营模式，保持用户长期活跃与留存</p>
            <p className="text-muted-foreground mt-1">Continuous operation model for long-term user engagement and retention</p>
          </div>
        </section>

        {/* Slide 9: Technical Advantages */}
        <section 
          data-slide="9"
          className="min-h-[600px] bg-card rounded-3xl p-12 print:break-after-page print:min-h-screen"
        >
          <div style={getSlideAnimation(9)}>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold">技术优势</h2>
            </div>
            <p className="text-xl text-muted-foreground mb-10">Technical Advantages</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Smartphone,
                title: '跨平台支持',
                subtitle: 'Cross-Platform Support',
                desc: '一次开发，多端运行',
                descEn: 'Build once, run everywhere',
                tags: ['Web', 'iOS', 'Android', 'Windows', 'macOS'],
              },
              {
                icon: Zap,
                title: '实时对战系统',
                subtitle: 'Real-time Battle System',
                desc: '基于WebSocket的实时匹配和对战系统，延迟低，体验流畅',
                descEn: 'WebSocket-based real-time matching with low latency',
              },
              {
                icon: Cloud,
                title: '云端数据同步',
                subtitle: 'Cloud Data Sync',
                desc: '学习进度、游戏数据云端存储，多设备无缝切换',
                descEn: 'Progress and game data stored in cloud, seamless multi-device sync',
              },
              {
                icon: Shield,
                title: '数据安全',
                subtitle: 'Data Security',
                desc: '完善的用户认证系统，数据加密存储，隐私保护',
                descEn: 'Robust authentication, encrypted storage, privacy protection',
              },
            ].map((item, i) => (
              <div 
                key={i}
                className="bg-background rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                style={getItemAnimation(9, i)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{item.subtitle}</p>
                    <p className="text-sm">{item.desc}</p>
                    {item.descEn && <p className="text-xs text-muted-foreground mt-1">{item.descEn}</p>}
                    {item.tags && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {item.tags.map((tag, j) => (
                          <span key={j} className="bg-muted px-3 py-1 rounded-full text-xs font-medium">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Slide 10: Data & Analytics */}
        <section 
          data-slide="10"
          className="min-h-[600px] bg-card rounded-3xl p-12 print:break-after-page print:min-h-screen"
        >
          <div style={getSlideAnimation(10)}>
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold">数据统计与分析</h2>
            </div>
            <p className="text-xl text-muted-foreground mb-10">Data Statistics & Analytics</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: '👤',
                title: '个人学习数据',
                subtitle: 'Personal Learning Data',
                items: [
                  { zh: '单词掌握情况', en: 'Word mastery status' },
                  { zh: '正确率统计', en: 'Accuracy statistics' },
                  { zh: '学习时长', en: 'Study duration' },
                  { zh: '错题本记录', en: 'Wrong word book' },
                ],
              },
              {
                icon: '📊',
                title: '班级统计',
                subtitle: 'Class Statistics',
                items: [
                  { zh: '班级整体进度', en: 'Class progress' },
                  { zh: '活跃度排名', en: 'Activity rankings' },
                  { zh: '薄弱词汇分析', en: 'Weak vocabulary analysis' },
                  { zh: '对比报告', en: 'Comparison reports' },
                ],
              },
              {
                icon: '🏫',
                title: '学校报告',
                subtitle: 'School Reports',
                items: [
                  { zh: '年级横向对比', en: 'Cross-grade comparison' },
                  { zh: '使用率统计', en: 'Usage statistics' },
                  { zh: '效果评估', en: 'Effectiveness evaluation' },
                  { zh: '趋势分析', en: 'Trend analysis' },
                ],
              },
            ].map((item, i) => (
              <div 
                key={i}
                className="bg-background rounded-2xl p-6 space-y-4 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
                style={getItemAnimation(10, i)}
              >
                <div className="text-4xl">{item.icon}</div>
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                <ul className="text-sm space-y-2">
                  {item.items.map((listItem, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <span>{listItem.zh}<br /><span className="text-xs text-muted-foreground">{listItem.en}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="mt-8 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-6 text-center border border-primary/20" style={getItemAnimation(10, 3)}>
            <p className="text-lg font-medium">为教师和管理者提供全面的数据支持，助力精准教学</p>
            <p className="text-muted-foreground mt-1">Comprehensive data support for teachers and administrators to enable precision teaching</p>
          </div>
        </section>

        {/* Slide 11: Deployment Options */}
        <section 
          data-slide="11"
          className="min-h-[600px] bg-card rounded-3xl p-12 print:break-after-page print:min-h-screen"
        >
          <div style={getSlideAnimation(11)}>
            <div className="flex items-center gap-3 mb-2">
              <Cloud className="h-8 w-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold">部署方案</h2>
            </div>
            <p className="text-xl text-muted-foreground mb-10">Deployment Options</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div 
              className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl p-8 space-y-4 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              style={getItemAnimation(11, 0)}
            >
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Cloud className="h-6 w-6 text-blue-500" />
                云端部署
              </h3>
              <p className="text-muted-foreground">Cloud Deployment</p>
              <ul className="space-y-3 mt-4">
                {[
                  { zh: '即开即用，快速上线', en: 'Ready to use, quick deployment' },
                  { zh: '自动更新维护', en: 'Auto updates & maintenance' },
                  { zh: '弹性扩容', en: 'Elastic scaling' },
                  { zh: '适合中小规模部署', en: 'Ideal for small-medium scale' },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 text-xs flex-shrink-0">✓</span>
                    <span>{item.zh}<br /><span className="text-xs text-muted-foreground">{item.en}</span></span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div 
              className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-8 space-y-4 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              style={getItemAnimation(11, 1)}
            >
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Shield className="h-6 w-6 text-purple-500" />
                私有化部署
              </h3>
              <p className="text-muted-foreground">On-Premise Deployment</p>
              <ul className="space-y-3 mt-4">
                {[
                  { zh: '数据完全自主可控', en: 'Full data ownership & control' },
                  { zh: '可定制化开发', en: 'Customizable development' },
                  { zh: '独立运维', en: 'Independent operations' },
                  { zh: '适合大规模机构', en: 'Ideal for large institutions' },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 text-xs flex-shrink-0">✓</span>
                    <span>{item.zh}<br /><span className="text-xs text-muted-foreground">{item.en}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="mt-8 bg-background rounded-2xl p-6 border border-border/50" style={getItemAnimation(11, 2)}>
            <h3 className="text-xl font-bold mb-6 text-center">支持服务 | Support Services</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { title: '部署培训', subtitle: 'Deployment Training' },
                { title: '技术支持', subtitle: 'Technical Support' },
                { title: '内容更新', subtitle: 'Content Updates' },
                { title: '定制开发', subtitle: 'Custom Development' },
              ].map((item, i) => (
                <div key={i} className="text-center p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-all duration-300">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Slide 12: Contact */}
        <section 
          data-slide="12"
          className="min-h-[700px] flex flex-col items-center justify-center relative overflow-hidden rounded-3xl p-12 print:min-h-screen"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)/0.15) 0%, hsl(var(--background)) 50%, hsl(var(--primary)/0.1) 100%)',
          }}
        >
          {/* Animated background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none print:hidden">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="relative z-10 text-center space-y-8" style={getSlideAnimation(12)}>
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold">感谢关注</h2>
              <p className="text-2xl text-muted-foreground">Thank You for Your Attention</p>
            </div>
            
            <div className="h-1 w-40 bg-gradient-to-r from-transparent via-primary/60 to-transparent mx-auto rounded-full" />
            
            <div className="space-y-2">
              <img 
                src="/lovable-uploads/122730b2-9017-437d-b8c7-3055cea14fe7.png" 
                alt="狄邦单词通 Logo" 
                className="w-20 h-20 mx-auto opacity-80"
              />
              <p className="text-xl font-medium">狄邦教育</p>
              <p className="text-lg text-muted-foreground">Dipont Education</p>
            </div>
            
            <div className="space-y-3 text-muted-foreground" style={getItemAnimation(12, 0)}>
              <p className="flex items-center justify-center gap-2">
                <span>📧</span> contact@dipont.com
              </p>
              <p className="flex items-center justify-center gap-2">
                <span>🌐</span> www.dipont.com
              </p>
            </div>
            
            <div className="mt-8 p-6 bg-background/50 backdrop-blur rounded-2xl border border-primary/20 inline-block" style={getItemAnimation(12, 1)}>
              <p className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                让每一个单词都充满乐趣
              </p>
              <p className="text-muted-foreground mt-2">Making Every Word a Joy to Learn</p>
            </div>
          </div>
        </section>

      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          section { page-break-inside: avoid; }
          [data-slide] { opacity: 1 !important; transform: none !important; }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        
        .animate-shimmer {
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default ProductPPT;
