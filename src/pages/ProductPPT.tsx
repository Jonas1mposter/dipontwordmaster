import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download, Sparkles, Zap, Trophy, Users, Target, Shield, BarChart3, Cloud, Smartphone, Gamepad2, BookOpen, Swords, Award, MessageCircle, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import interstellarPagerImg from "@/assets/interstellar-pager.jpg";

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

        {/* Slide 3: Product Positioning with Interface Preview */}
        <section 
          data-slide="3"
          className="min-h-[700px] bg-card rounded-3xl p-12 relative overflow-hidden print:break-after-page print:min-h-screen"
        >
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 print:hidden" />
          
          <div style={getSlideAnimation(3)}>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold">产品定位</h2>
            </div>
            <p className="text-xl text-muted-foreground mb-8">Product Positioning</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Features */}
            <div className="space-y-6">
              <div className="text-left space-y-3" style={getItemAnimation(3, 0)}>
                <p className="text-xl md:text-2xl font-medium leading-relaxed">
                  面向初中学生（7-8年级）的
                  <span className="text-primary font-bold mx-1">游戏化</span>
                  英语词汇学习平台
                </p>
                <p className="text-base text-muted-foreground">
                  A Gamified English Vocabulary Platform for Middle School Students
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-4 mt-6">
{[
                  { icon: Gamepad2, title: '游戏化机制', subtitle: 'Gamification', desc: '等级、段位、排行榜' },
                  { icon: BookOpen, title: '学校同步', subtitle: 'School Aligned', desc: '紧贴学习内容' },
                  { icon: Swords, title: '社交竞技', subtitle: 'Social Competition', desc: '实时对战，年级竞赛' },
                ].map((item, i) => (
                  <div 
                    key={i}
                    className="group flex items-center gap-4 bg-primary/5 hover:bg-primary/10 rounded-xl p-4 border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:-translate-x-1"
                    style={getItemAnimation(3, i + 1)}
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-all duration-300">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold">{item.title} <span className="text-sm text-muted-foreground font-normal">| {item.subtitle}</span></h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Login & Dashboard Preview */}
            <div className="space-y-4" style={getItemAnimation(3, 4)}>
              {/* Login Page Preview */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl blur-xl" />
                <div className="relative bg-background/90 backdrop-blur rounded-2xl p-4 border border-primary/20 shadow-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-destructive/60" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                    <div className="w-2 h-2 rounded-full bg-green-500/60" />
                    <span className="ml-2 text-xs text-muted-foreground">登录界面 | Login</span>
                  </div>
                  <div className="flex flex-col items-center py-4 space-y-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                      <span className="text-white text-lg font-bold">狄</span>
                    </div>
                    <p className="text-lg font-bold">登录</p>
                    <p className="text-xs text-muted-foreground">狄邦单词通 · 词汇学习平台</p>
                    <div className="w-full max-w-[200px] space-y-2">
                      <div className="h-8 bg-muted/50 rounded-lg border border-border/50 flex items-center px-3">
                        <span className="text-xs text-muted-foreground">📧 邮箱</span>
                      </div>
                      <div className="h-8 bg-muted/50 rounded-lg border border-border/50 flex items-center px-3">
                        <span className="text-xs text-muted-foreground">🔒 密码</span>
                      </div>
                      <div className="h-8 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-primary-foreground font-medium">登录</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dashboard Preview */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl" />
                <div className="relative bg-background/90 backdrop-blur rounded-2xl p-4 border border-primary/20 shadow-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-destructive/60" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                    <div className="w-2 h-2 rounded-full bg-green-500/60" />
                    <span className="ml-2 text-xs text-muted-foreground">主界面 | Dashboard</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { icon: '📚', label: '闯关', active: true },
                      { icon: '⚔️', label: '排位', active: false },
                      { icon: '🏆', label: '排行', active: false },
                      { icon: '👤', label: '我的', active: false },
                    ].map((item, i) => (
                      <div 
                        key={i} 
                        className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                          item.active ? 'bg-primary/20 text-primary' : 'bg-muted/30'
                        }`}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-xs mt-1">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm">👤</div>
                      <div className="flex-1">
                        <p className="text-xs font-medium">Lv.15 学霸小明</p>
                        <div className="h-1.5 bg-muted rounded-full mt-1">
                          <div className="h-full w-2/3 bg-primary rounded-full" />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-primary">🪙 2,580</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
            
            {/* Three-Stage Learning Interface Previews */}
            <div className="space-y-4" style={getItemAnimation(4, 2)}>
              {/* Stage 1: Recognition - Word Card */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-2xl blur-xl" />
                <div className="relative bg-background/90 backdrop-blur rounded-2xl p-4 border border-blue-500/30 shadow-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-destructive/60" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                    <div className="w-2 h-2 rounded-full bg-green-500/60" />
                    <span className="ml-2 text-xs text-blue-500 font-medium">阶段1: 识记 | Stage 1: Recognition</span>
                  </div>
                  <div className="text-center py-3 space-y-2">
                    <div className="inline-block bg-blue-500/10 rounded-xl px-6 py-4 border border-blue-500/20">
                      <p className="text-2xl font-bold text-blue-600">accomplish</p>
                      <p className="text-sm text-muted-foreground">/əˈkɒmplɪʃ/</p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <span className="text-lg">🔊</span>
                      <span className="text-sm">点击发音</span>
                    </div>
                    <div className="pt-2 border-t border-border/50 mt-2">
                      <p className="text-base font-medium">v. 完成，实现</p>
                      <p className="text-xs text-muted-foreground mt-1">例句: She accomplished her goal.</p>
                    </div>
                    <div className="flex justify-center gap-2 mt-3">
                      <span className="px-3 py-1 bg-green-500/20 text-green-600 rounded-full text-xs">✓ 认识</span>
                      <span className="px-3 py-1 bg-orange-500/20 text-orange-600 rounded-full text-xs">? 模糊</span>
                      <span className="px-3 py-1 bg-red-500/20 text-red-600 rounded-full text-xs">✗ 不认识</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage 2: Spelling - Dictation */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-2xl blur-xl" />
                <div className="relative bg-background/90 backdrop-blur rounded-2xl p-4 border border-green-500/30 shadow-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-destructive/60" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                    <div className="w-2 h-2 rounded-full bg-green-500/60" />
                    <span className="ml-2 text-xs text-green-500 font-medium">阶段2: 拼写 | Stage 2: Spelling</span>
                  </div>
                  <div className="py-3 space-y-3">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">根据释义拼写单词</p>
                      <p className="text-base font-medium">v. 完成，实现</p>
                    </div>
                    <div className="flex justify-center items-center gap-2">
                      <div className="flex gap-1">
                        {['a', 'c', 'c', 'o', 'm', 'p', 'l', 'i', 's', 'h'].map((letter, i) => (
                          <span 
                            key={i} 
                            className={`w-6 h-8 flex items-center justify-center rounded border text-sm font-mono ${
                              i < 6 ? 'bg-green-500/20 border-green-500/50 text-green-600' : 'bg-muted/50 border-border'
                            }`}
                          >
                            {i < 6 ? letter : '_'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-center gap-2">
                      <span className="px-2 py-1 bg-muted/50 rounded text-xs">💡 提示</span>
                      <span className="px-2 py-1 bg-primary/20 text-primary rounded text-xs">提交</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage 3: Application - Fill in Blank */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-2xl blur-xl" />
                <div className="relative bg-background/90 backdrop-blur rounded-2xl p-4 border border-purple-500/30 shadow-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-destructive/60" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                    <div className="w-2 h-2 rounded-full bg-green-500/60" />
                    <span className="ml-2 text-xs text-purple-500 font-medium">阶段3: 应用 | Stage 3: Application</span>
                  </div>
                  <div className="py-3 space-y-3">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">填入正确的单词完成句子</p>
                    </div>
                    <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
                      <p className="text-sm leading-relaxed">
                        She worked hard to <span className="inline-block w-24 h-6 bg-purple-500/30 rounded border-b-2 border-purple-500 mx-1 align-middle"></span> her dream of becoming a doctor.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {['accomplish', 'achieve', 'complete', 'finish'].map((word, i) => (
                        <div 
                          key={i} 
                          className={`px-3 py-2 rounded-lg text-center text-sm cursor-pointer transition-all ${
                            i === 0 ? 'bg-purple-500/30 border border-purple-500 text-purple-600 font-medium' : 'bg-muted/50 hover:bg-muted'
                          }`}
                        >
                          {word}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Slide 4.5: Quiz Types Showcase */}
        <section 
          data-slide="45"
          className="min-h-[700px] bg-card rounded-3xl p-12 print:break-after-page print:min-h-screen"
        >
          <div style={getSlideAnimation(45)}>
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-8 w-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold">多样化题型展示</h2>
            </div>
            <p className="text-xl text-muted-foreground mb-10">Diverse Quiz Types Showcase</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Quiz Type 1: Meaning Selection */}
            <div className="relative" style={getItemAnimation(45, 0)}>
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 rounded-2xl blur-xl" />
              <div className="relative bg-background/90 backdrop-blur rounded-2xl p-5 border border-cyan-500/30 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-destructive/60" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                  <div className="w-2 h-2 rounded-full bg-green-500/60" />
                  <span className="ml-2 text-xs text-cyan-500 font-medium">词义选择 | Meaning Selection</span>
                </div>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">选择单词的正确含义</p>
                    <div className="inline-block bg-cyan-500/10 rounded-xl px-6 py-3 border border-cyan-500/20">
                      <p className="text-2xl font-bold text-cyan-600">determine</p>
                      <p className="text-sm text-muted-foreground">/dɪˈtɜːmɪn/</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { text: 'v. 决定，确定', correct: true },
                      { text: 'v. 描述，形容', correct: false },
                      { text: 'v. 发现，探索', correct: false },
                      { text: 'v. 依赖，依靠', correct: false },
                    ].map((option, i) => (
                      <div 
                        key={i} 
                        className={`px-3 py-2 rounded-lg text-center text-sm transition-all ${
                          option.correct 
                            ? 'bg-green-500/30 border border-green-500 text-green-600 font-medium' 
                            : 'bg-muted/50 hover:bg-muted'
                        }`}
                      >
                        {option.text}
                        {option.correct && <span className="ml-1">✓</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quiz Type 2: Word Selection (Reverse) */}
            <div className="relative" style={getItemAnimation(45, 1)}>
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-amber-500/5 rounded-2xl blur-xl" />
              <div className="relative bg-background/90 backdrop-blur rounded-2xl p-5 border border-amber-500/30 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-destructive/60" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                  <div className="w-2 h-2 rounded-full bg-green-500/60" />
                  <span className="ml-2 text-xs text-amber-500 font-medium">单词选择 | Word Selection</span>
                </div>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">根据释义选择正确单词</p>
                    <div className="inline-block bg-amber-500/10 rounded-xl px-6 py-3 border border-amber-500/20">
                      <p className="text-xl font-bold text-amber-600">v. 影响，对...起作用</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { text: 'effect', correct: false },
                      { text: 'affect', correct: true },
                      { text: 'effort', correct: false },
                      { text: 'afford', correct: false },
                    ].map((option, i) => (
                      <div 
                        key={i} 
                        className={`px-3 py-2 rounded-lg text-center text-sm font-mono transition-all ${
                          option.correct 
                            ? 'bg-green-500/30 border border-green-500 text-green-600 font-medium' 
                            : 'bg-muted/50 hover:bg-muted'
                        }`}
                      >
                        {option.text}
                        {option.correct && <span className="ml-1">✓</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quiz Type 3: Listening */}
            <div className="relative" style={getItemAnimation(45, 2)}>
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-pink-500/5 rounded-2xl blur-xl" />
              <div className="relative bg-background/90 backdrop-blur rounded-2xl p-5 border border-pink-500/30 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-destructive/60" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                  <div className="w-2 h-2 rounded-full bg-green-500/60" />
                  <span className="ml-2 text-xs text-pink-500 font-medium">听力识别 | Listening</span>
                </div>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-3">听发音，输入你听到的单词</p>
                    <div className="inline-flex items-center gap-3 bg-pink-500/10 rounded-xl px-6 py-4 border border-pink-500/20">
                      <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center animate-pulse">
                        <span className="text-2xl">🔊</span>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-pink-600">点击播放</p>
                        <p className="text-xs text-muted-foreground">Click to play</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3 border border-border">
                      <span className="text-muted-foreground">⌨️</span>
                      <span className="text-sm text-muted-foreground">输入你听到的单词...</span>
                    </div>
                    <div className="flex justify-end gap-2">
                      <span className="px-3 py-1.5 bg-muted/50 rounded text-xs">🔄 重播</span>
                      <span className="px-3 py-1.5 bg-primary/20 text-primary rounded text-xs font-medium">提交</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quiz Type 4: Spelling with Hint */}
            <div className="relative" style={getItemAnimation(45, 3)}>
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 rounded-2xl blur-xl" />
              <div className="relative bg-background/90 backdrop-blur rounded-2xl p-5 border border-indigo-500/30 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-destructive/60" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                  <div className="w-2 h-2 rounded-full bg-green-500/60" />
                  <span className="ml-2 text-xs text-indigo-500 font-medium">拼写测试 | Spelling Test</span>
                </div>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">根据释义拼写单词</p>
                    <div className="inline-block bg-indigo-500/10 rounded-xl px-6 py-3 border border-indigo-500/20">
                      <p className="text-base font-bold text-indigo-600">n. 环境；周围的事物</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      <div className="flex gap-1">
                        {['e', 'n', 'v', 'i', 'r', 'o', 'n', 'm', 'e', 'n', 't'].map((letter, i) => (
                          <span 
                            key={i} 
                            className={`w-5 h-7 flex items-center justify-center rounded border text-xs font-mono ${
                              i < 7 ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-600' : 'bg-muted/50 border-border text-muted-foreground'
                            }`}
                          >
                            {i < 7 ? letter : '_'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-center items-center gap-3">
                      <div className="px-3 py-1 bg-amber-500/20 text-amber-600 rounded-full text-xs flex items-center gap-1">
                        <span>💡</span>
                        <span>提示: e _ _ _ r _ _ m _ _ t</span>
                      </div>
                    </div>
                    <div className="flex justify-center gap-2">
                      <span className="px-3 py-1.5 bg-primary/20 text-primary rounded text-xs font-medium">提交答案</span>
                    </div>
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
            
            {/* Battle Interface Preview - During Battle */}
            <div className="space-y-4" style={getItemAnimation(5, 2)}>
              {/* VS Screen */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-blue-500/10 rounded-2xl blur-xl" />
                <div className="relative bg-background/80 backdrop-blur rounded-2xl p-4 border border-primary/20 shadow-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-destructive/60" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                    <div className="w-2 h-2 rounded-full bg-green-500/60" />
                    <span className="ml-2 text-xs text-muted-foreground">对战匹配 | VS Screen</span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 text-center">
                      <div className="w-12 h-12 mx-auto bg-gradient-to-br from-primary/30 to-primary/10 rounded-full flex items-center justify-center ring-2 ring-primary/30">
                        <span className="text-xl">👤</span>
                      </div>
                      <p className="font-bold text-xs mt-1">单词王者</p>
                      <p className="text-xs text-muted-foreground">🥇 Gold III</p>
                      <div className="flex justify-center gap-0.5 mt-1">
                        {['🔥', '⭐', '🎯'].map((b, i) => (
                          <span key={i} className="w-4 h-4 bg-primary/20 rounded-full text-xs flex items-center justify-center">{b}</span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-full flex items-center justify-center animate-pulse border-2 border-orange-500/50">
                        <span className="text-base font-black text-orange-500">VS</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 text-center">
                      <div className="w-12 h-12 mx-auto bg-gradient-to-br from-blue-500/30 to-blue-500/10 rounded-full flex items-center justify-center ring-2 ring-blue-500/30">
                        <span className="text-xl">👤</span>
                      </div>
                      <p className="font-bold text-xs mt-1">英语达人</p>
                      <p className="text-xs text-muted-foreground">🥇 Gold II</p>
                      <div className="flex justify-center gap-0.5 mt-1">
                        {['🏆', '💎', '📚'].map((b, i) => (
                          <span key={i} className="w-4 h-4 bg-blue-500/20 rounded-full text-xs flex items-center justify-center">{b}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Battle In Progress */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-2xl blur-xl" />
                <div className="relative bg-background/80 backdrop-blur rounded-2xl p-4 border border-green-500/20 shadow-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-green-500 font-medium">对战进行中 | Battle in Progress</span>
                    <span className="ml-auto text-xs bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded-full">⏱️ 45s</span>
                  </div>
                  
                  {/* Score Display */}
                  <div className="flex items-center justify-center gap-4 mb-3">
                    <div className="text-center">
                      <span className="text-2xl font-bold text-green-500">7</span>
                      <p className="text-xs text-muted-foreground">我 / Me</p>
                    </div>
                    <div className="text-lg text-muted-foreground">:</div>
                    <div className="text-center">
                      <span className="text-2xl font-bold text-blue-500">5</span>
                      <p className="text-xs text-muted-foreground">对手 / Opponent</p>
                    </div>
                  </div>

                  {/* Question Card */}
                  <div className="bg-muted/30 rounded-xl p-3">
                    <p className="text-center text-sm mb-2">
                      <span className="text-muted-foreground">Q8/10:</span> "adventure" 的意思是?
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {['冒险', '建议', '广告', '进步'].map((opt, i) => (
                        <div 
                          key={i} 
                          className={`p-2 rounded-lg text-center text-xs font-medium transition-all ${
                            i === 0 ? 'bg-green-500/20 border border-green-500/50 text-green-600' : 'bg-muted/50 border border-border/50 hover:bg-muted'
                          }`}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
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

        {/* Slide 6: Gamification System with Badge Screenshot */}
        <section 
          data-slide="6"
          className="min-h-[700px] bg-card rounded-3xl p-12 print:break-after-page print:min-h-screen"
        >
          <div style={getSlideAnimation(6)}>
            <div className="flex items-center gap-3 mb-2">
              <Award className="h-8 w-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold">游戏化激励系统</h2>
            </div>
            <p className="text-xl text-muted-foreground mb-10">Gamification & Incentive System</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Features */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '⚡', title: '经验值 & 等级', subtitle: 'XP & Level', desc: '完成学习和对战获得经验', descEn: 'Earn XP from activities' },
                { icon: '🪙', title: '狄邦豆货币', subtitle: 'Dipont Coins', desc: '游戏内货币购买装饰', descEn: 'In-game currency' },
                { icon: '🏆', title: '三大排行榜', subtitle: 'Leaderboards', desc: '财富/胜场/经验榜', descEn: 'Coins, wins, XP' },
                { icon: '🎖️', title: '徽章收集', subtitle: 'Badges', desc: '解锁并装备徽章', descEn: 'Collect & equip' },
              ].map((item, i) => (
                <div 
                  key={i}
                  className="group bg-background rounded-2xl p-4 space-y-2 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  style={getItemAnimation(6, i)}
                >
                  <div className="text-3xl group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
                  <h3 className="text-base font-bold">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                  <p className="text-xs leading-relaxed">{item.desc}</p>
                  <p className="text-xs text-muted-foreground">{item.descEn}</p>
                </div>
              ))}
            </div>

            {/* Right: Badge Collection Screenshot */}
            <div className="relative" style={getItemAnimation(6, 4)}>
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-purple-500/10 rounded-3xl blur-xl" />
              <div className="relative bg-background/80 backdrop-blur rounded-3xl p-5 border border-primary/20 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  <span className="ml-2 text-xs text-muted-foreground">徽章收藏 | Badge Collection</span>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { icon: '🔥', name: '内测先驱', rarity: 'mythology', earned: true },
                    { icon: '⭐', name: '初来乍到', rarity: 'common', earned: true },
                    { icon: '📚', name: '学海无涯', rarity: 'rare', earned: true },
                    { icon: '🎯', name: '百发百中', rarity: 'epic', earned: true },
                    { icon: '👑', name: '王者之路', rarity: 'legendary', earned: true },
                    { icon: '🏆', name: '连胜达人', rarity: 'rare', earned: true },
                    { icon: '💎', name: '收割机', rarity: 'hidden', earned: false },
                    { icon: '🌟', name: '传奇玩家', rarity: 'legendary', earned: false },
                  ].map((badge, i) => (
                    <div 
                      key={i}
                      className={`aspect-square rounded-xl p-2 flex flex-col items-center justify-center text-center transition-all duration-300 hover:scale-105 ${
                        badge.earned 
                          ? badge.rarity === 'mythology' ? 'bg-gradient-to-br from-red-500/30 to-rose-600/30 border border-red-500/50 ring-1 ring-red-500/30' :
                            badge.rarity === 'hidden' ? 'bg-gradient-to-r from-rose-500/20 via-cyan-500/20 to-violet-500/20 border border-purple-500/50' :
                            badge.rarity === 'legendary' ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30' :
                            badge.rarity === 'epic' ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30' :
                            badge.rarity === 'rare' ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30' :
                            'bg-muted/50 border border-border/50'
                          : 'bg-muted/30 border border-border/30 opacity-50 grayscale'
                      }`}
                    >
                      <span className="text-xl">{badge.icon}</span>
                      <span className="text-xs font-medium mt-1 leading-tight">{badge.name}</span>
                      {!badge.earned && <span className="text-xs text-muted-foreground">🔒</span>}
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl">
                  <p className="text-xs text-center">
                    <span className="font-medium">已装备徽章 | Equipped Badges</span>
                  </p>
                  <div className="flex justify-center gap-3 mt-2">
                    {['🔥', '👑', '🎯'].map((icon, i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                        <span className="text-sm">{icon}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-5 border border-primary/20" style={getItemAnimation(6, 5)}>
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              每日任务系统 | Daily Quest System
            </h3>
            <p className="text-sm text-muted-foreground">
              每日更新的任务目标，完成获得奖励 | Daily refreshing quests with rewards
            </p>
          </div>
        </section>

        {/* Slide 7: Social Features with Leaderboard Screenshot */}
        <section 
          data-slide="7"
          className="min-h-[700px] bg-card rounded-3xl p-12 print:break-after-page print:min-h-screen"
        >
          <div style={getSlideAnimation(7)}>
            <div className="flex items-center gap-3 mb-2">
              <MessageCircle className="h-8 w-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold">社交互动系统</h2>
            </div>
            <p className="text-xl text-muted-foreground mb-10">Social Interaction System</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Features */}
            <div className="space-y-4">
              <div className="bg-background rounded-2xl p-5 border border-border/50 hover:border-primary/30 transition-all duration-300" style={getItemAnimation(7, 0)}>
                <h3 className="text-lg font-bold mb-3">👥 好友系统 | Friend System</h3>
                <ul className="space-y-2">
                  {[
                    '搜索添加好友 / Search & add friends',
                    '好友请求管理 / Friend request management',
                    '观战好友对战 / Spectate friend battles',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 group">
                      <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs group-hover:scale-110 transition-transform">✓</span>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-background rounded-2xl p-5 border border-border/50" style={getItemAnimation(7, 1)}>
                <h3 className="text-lg font-bold mb-2">💬 即时聊天 & ⚔️ 对战邀请</h3>
                <p className="text-sm text-muted-foreground">
                  Real-time Chat & Battle Invites
                </p>
                <p className="text-sm mt-2">
                  好友之间发送消息，一键邀请对战
                </p>
              </div>

              <div className="bg-background rounded-2xl p-5 border border-border/50" style={getItemAnimation(7, 2)}>
                <h3 className="text-lg font-bold mb-3">🏫 班级/年级挑战 | Class/Grade Challenges</h3>
                <ul className="space-y-2">
                  {[
                    '班级/年级排名 / Class & grade rankings',
                    '赛季奖励 / Season rewards',
                    '专属称号卡 / Exclusive cards',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 group">
                      <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs group-hover:scale-110 transition-transform">✓</span>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Right: Leaderboard Screenshot */}
            <div className="relative" style={getItemAnimation(7, 3)}>
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-blue-500/10 rounded-3xl blur-xl" />
              <div className="relative bg-background/80 backdrop-blur rounded-3xl p-5 border border-primary/20 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  <span className="ml-2 text-xs text-muted-foreground">排行榜 | Leaderboard</span>
                </div>

                {/* Tab Pills */}
                <div className="flex gap-2 mb-4">
                  {['🪙 财富榜', '🏆 胜场榜', '⚡ 经验榜'].map((tab, i) => (
                    <div 
                      key={i} 
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      {tab}
                    </div>
                  ))}
                </div>

                {/* Leaderboard List */}
                <div className="space-y-2">
                  {[
                    { rank: 1, name: '单词王者', value: '12,580', icon: '👑', color: 'from-yellow-500/30 to-yellow-600/30' },
                    { rank: 2, name: '学霸小明', value: '10,240', icon: '🥈', color: 'from-slate-400/30 to-slate-500/30' },
                    { rank: 3, name: '英语达人', value: '9,850', icon: '🥉', color: 'from-amber-600/30 to-amber-700/30' },
                    { rank: 4, name: 'WordMaster', value: '8,920', icon: '', color: '' },
                    { rank: 5, name: '勤奋学子', value: '8,100', icon: '', color: '' },
                  ].map((player, i) => (
                    <div 
                      key={i}
                      className={`flex items-center gap-3 p-2 rounded-xl transition-all hover:scale-[1.02] ${
                        player.color ? `bg-gradient-to-r ${player.color}` : 'bg-muted/30'
                      }`}
                    >
                      <span className={`w-6 h-6 flex items-center justify-center text-sm font-bold ${
                        player.rank <= 3 ? '' : 'text-muted-foreground'
                      }`}>
                        {player.icon || player.rank}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs">👤</div>
                      <span className="flex-1 text-sm font-medium">{player.name}</span>
                      <span className="text-sm font-bold text-primary">🪙 {player.value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-muted/30 rounded-xl text-center">
                  <p className="text-xs text-muted-foreground">
                    前10名获得专属称号卡 | Top 10 get exclusive name cards
                  </p>
                </div>
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
                note: '* 目前 iOS 性能最佳',
                noteEn: '* Currently iOS has the best performance',
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
                    {item.note && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                        {item.note}
                        <span className="text-muted-foreground font-normal ml-1">{item.noteEn}</span>
                      </p>
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

        {/* Slide 10.5: Learning Statistics Screenshot */}
        <section 
          data-slide="105"
          className="min-h-[700px] bg-card rounded-3xl p-12 print:break-after-page print:min-h-screen"
        >
          <div style={getSlideAnimation(105)}>
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold">学习数据统计截图</h2>
            </div>
            <p className="text-xl text-muted-foreground mb-10">Learning Statistics Screenshot</p>
          </div>
          
          {/* Stats Dashboard Mockup */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl blur-xl" />
            <div className="relative bg-background/95 backdrop-blur rounded-2xl p-6 border border-primary/20 shadow-xl" style={getItemAnimation(105, 0)}>
              {/* Window controls */}
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border/50">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="ml-4 text-sm text-muted-foreground font-medium">学习数据统计 | Learning Statistics</span>
              </div>
              
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                {[
                  { label: '总学习单词', labelEn: 'Total Words', value: '1,286', icon: '📚', color: 'from-blue-500/20 to-blue-500/10' },
                  { label: '已掌握', labelEn: 'Mastered', value: '847', icon: '✅', color: 'from-green-500/20 to-green-500/10' },
                  { label: '学习中', labelEn: 'Learning', value: '439', icon: '📖', color: 'from-amber-500/20 to-amber-500/10' },
                  { label: '正确率', labelEn: 'Accuracy', value: '92.5%', icon: '🎯', color: 'from-purple-500/20 to-purple-500/10' },
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className={`bg-gradient-to-br ${item.color} rounded-xl p-4 border border-border/30`}
                    style={getItemAnimation(105, i + 1)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{item.icon}</span>
                    </div>
                    <p className="text-2xl font-bold">{item.value}</p>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground/70">{item.labelEn}</p>
                  </div>
                ))}
              </div>
              
              {/* Charts Row */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Weekly Trend Bar Chart */}
                <div className="bg-muted/30 rounded-xl p-5 border border-border/30" style={getItemAnimation(105, 5)}>
                  <h4 className="font-semibold mb-1">本周学习趋势</h4>
                  <p className="text-xs text-muted-foreground mb-4">Weekly Learning Trend</p>
                  <div className="flex items-end justify-between h-32 gap-2 px-2">
                    {[
                      { day: '周一', dayEn: 'Mon', value: 45 },
                      { day: '周二', dayEn: 'Tue', value: 62 },
                      { day: '周三', dayEn: 'Wed', value: 38 },
                      { day: '周四', dayEn: 'Thu', value: 85 },
                      { day: '周五', dayEn: 'Fri', value: 72 },
                      { day: '周六', dayEn: 'Sat', value: 95 },
                      { day: '周日', dayEn: 'Sun', value: 56 },
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col items-center flex-1">
                        <div 
                          className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t-md transition-all"
                          style={{ height: `${item.value}%` }}
                        />
                        <span className="text-xs mt-2 text-muted-foreground">{item.day}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/30 flex justify-between text-xs text-muted-foreground">
                    <span>本周共学习 453 个单词</span>
                    <span>453 words this week</span>
                  </div>
                </div>
                
                {/* Mastery Distribution Pie Chart */}
                <div className="bg-muted/30 rounded-xl p-5 border border-border/30" style={getItemAnimation(105, 6)}>
                  <h4 className="font-semibold mb-1">掌握程度分布</h4>
                  <p className="text-xs text-muted-foreground mb-4">Mastery Distribution</p>
                  <div className="flex items-center justify-center gap-6">
                    {/* Pie Chart Visual */}
                    <div className="relative w-28 h-28">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        {/* Background circle */}
                        <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="20" />
                        {/* Mastered - 65% */}
                        <circle 
                          cx="50" cy="50" r="40" fill="none" 
                          stroke="hsl(142 76% 36%)" strokeWidth="20"
                          strokeDasharray="163.36 251.33"
                          strokeDashoffset="0"
                        />
                        {/* Proficient - 20% */}
                        <circle 
                          cx="50" cy="50" r="40" fill="none" 
                          stroke="hsl(217 91% 60%)" strokeWidth="20"
                          strokeDasharray="50.27 251.33"
                          strokeDashoffset="-163.36"
                        />
                        {/* Familiar - 10% */}
                        <circle 
                          cx="50" cy="50" r="40" fill="none" 
                          stroke="hsl(43 96% 56%)" strokeWidth="20"
                          strokeDasharray="25.13 251.33"
                          strokeDashoffset="-213.63"
                        />
                        {/* New - 5% */}
                        <circle 
                          cx="50" cy="50" r="40" fill="none" 
                          stroke="hsl(0 84% 60%)" strokeWidth="20"
                          strokeDasharray="12.57 251.33"
                          strokeDashoffset="-238.76"
                        />
                      </svg>
                    </div>
                    
                    {/* Legend */}
                    <div className="space-y-2">
                      {[
                        { color: 'bg-green-500', label: '已掌握', labelEn: 'Mastered', percent: '65%' },
                        { color: 'bg-blue-500', label: '掌握中', labelEn: 'Proficient', percent: '20%' },
                        { color: 'bg-yellow-500', label: '熟悉', labelEn: 'Familiar', percent: '10%' },
                        { color: 'bg-red-500', label: '生词', labelEn: 'New', percent: '5%' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className={`w-3 h-3 rounded-full ${item.color}`} />
                          <span>{item.label}</span>
                          <span className="text-muted-foreground text-xs">({item.labelEn})</span>
                          <span className="ml-auto font-medium">{item.percent}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center" style={getItemAnimation(105, 7)}>
            <p className="text-muted-foreground">可视化学习数据，帮助学生了解自己的学习进度和薄弱环节</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Visualized learning data helps students understand their progress and weak areas</p>
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

        {/* Slide 12: Future Vision */}
        <section 
          data-slide="12"
          className="min-h-[700px] flex flex-col items-center justify-center relative overflow-hidden rounded-3xl p-12 print:min-h-screen"
          style={{
            background: 'linear-gradient(135deg, hsl(220, 80%, 10%) 0%, hsl(240, 60%, 15%) 50%, hsl(260, 50%, 12%) 100%)',
          }}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none print:hidden">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            {/* Stars */}
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white/60 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 text-center space-y-8 max-w-4xl" style={getSlideAnimation(12)}>
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold text-white">🚀 未来愿景</h2>
              <p className="text-2xl text-cyan-300/80">Future Vision</p>
            </div>
            
            <div className="h-1 w-40 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent mx-auto rounded-full" />
            
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-cyan-500/20" style={getItemAnimation(12, 0)}>
              <h3 className="text-2xl font-bold text-cyan-300 mb-2">另一个项目：星际寻呼机</h3>
              <p className="text-lg text-white/80 mb-6">Another Project: Interstellar Pager</p>
              <p className="text-muted-foreground mb-6">
                本质相同，都是单词学习平台<br />
                <span className="text-sm">Same essence - a vocabulary learning platform</span>
              </p>
              
              <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
                <img 
                  src={interstellarPagerImg}
                  alt="星际寻呼机效果图" 
                  className="w-full max-w-lg mx-auto"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <p className="text-sm text-cyan-300">此项目的效果图 | Project Preview</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Slide 13: Contact */}
        <section 
          data-slide="13"
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
                <span>📧</span> 000570@nkcswx.cn / zhangshaoqingjonas@qq.com
              </p>
              <p className="flex items-center justify-center gap-2">
                <span>🌐</span> dipontwordmaster.lovable.app
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
          body { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
            background: white !important;
          }
          
          /* Hide non-print elements */
          .print\\:hidden { display: none !important; }
          
          /* Each slide on its own page */
          section[data-slide] { 
            page-break-after: always;
            page-break-inside: avoid;
            break-after: page;
            break-inside: avoid;
            opacity: 1 !important; 
            transform: none !important;
            min-height: 100vh !important;
            margin: 0 !important;
            padding: 40px !important;
            border-radius: 0 !important;
          }
          
          /* Last slide no page break */
          section[data-slide]:last-of-type {
            page-break-after: auto;
            break-after: auto;
          }
          
          /* Ensure backgrounds print */
          section[data-slide] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Container adjustments */
          .max-w-5xl {
            max-width: 100% !important;
            padding: 0 !important;
            gap: 0 !important;
          }
          
          /* Hide animations */
          .animate-pulse, .animate-shimmer {
            animation: none !important;
          }
          
          /* Ensure visibility */
          [data-slide] * {
            opacity: 1 !important;
            transform: none !important;
          }
          
          /* Image sizing */
          img {
            max-width: 100% !important;
            height: auto !important;
          }
        }
        
        @page {
          size: A4 landscape;
          margin: 0;
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
