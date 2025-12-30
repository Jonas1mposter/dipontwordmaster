import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, MessageCircle, HelpCircle, Bug, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Support = () => {
  const navigate = useNavigate();

  const faqItems = [
    {
      question: "如何重置密码？",
      answer: "在登录页面点击「忘记密码」，输入您的注册邮箱，我们会发送重置链接到您的邮箱。"
    },
    {
      question: "如何更换年级？",
      answer: "进入设置页面，在「班级设置」中可以更改您的年级和班级信息。"
    },
    {
      question: "能量是什么？如何恢复？",
      answer: "能量用于进行单词学习，每完成一个关卡消耗能量。能量会随时间自动恢复，每5分钟恢复1点。"
    },
    {
      question: "如何添加好友？",
      answer: "在好友页面点击搜索图标，输入好友的用户名即可发送好友申请。"
    },
    {
      question: "排位赛如何计分？",
      answer: "排位赛根据对战结果增减段位星星，连胜可获得额外星星奖励。"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-primary/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-gaming text-xl text-glow-purple">技术支持</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 pb-20">
        {/* 联系方式 */}
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="w-5 h-5 text-primary" />
              联系我们
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">技术支持邮箱</p>
                <a href="mailto:000570@nkcswx.cn" className="text-primary hover:underline">
                  000570@nkcswx.cn
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">反馈邮箱</p>
                <a href="mailto:zhangshaoqingjonas@qq.com" className="text-primary hover:underline">
                  zhangshaoqingjonas@qq.com
                </a>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              我们的技术团队会在1-2个工作日内回复您的问题。
            </p>
          </CardContent>
        </Card>

        {/* 常见问题 */}
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <HelpCircle className="w-5 h-5 text-primary" />
              常见问题
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {faqItems.map((item, index) => (
              <div key={index} className="p-3 bg-muted/30 rounded-lg space-y-2">
                <p className="font-medium text-foreground">{item.question}</p>
                <p className="text-sm text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 问题反馈 */}
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bug className="w-5 h-5 text-primary" />
              问题反馈
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              如果您在使用过程中遇到任何问题或Bug，请通过邮件联系我们，并提供以下信息：
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>您的用户名</li>
              <li>使用的设备型号和系统版本</li>
              <li>问题的详细描述</li>
              <li>问题发生的时间</li>
              <li>如有可能，请附上截图</li>
            </ul>
          </CardContent>
        </Card>

        {/* 功能建议 */}
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="w-5 h-5 text-primary" />
              功能建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              我们非常欢迎您的宝贵建议！如果您有任何关于新功能或改进的想法，请发送邮件至{" "}
              <a href="mailto:zhangshaoqingjonas@qq.com" className="text-primary hover:underline">
                zhangshaoqingjonas@qq.com
              </a>
              ，我们会认真考虑每一条建议。
            </p>
          </CardContent>
        </Card>

        {/* 版本信息 */}
        <Card className="glass-card border-border/50">
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">狄邦单词通 v1.0.0</p>
            <p className="text-xs text-muted-foreground mt-1">© 2024 狄邦教育. 保留所有权利.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Support;
