import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Lock, User, ChevronLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<7 | 8>(7);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/");
      }
    });
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session?.user) {
        navigate("/");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("请填写邮箱和密码");
      return;
    }
    if (!isLogin && !username) {
      toast.error("请填写用户名");
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const {
          error
        } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          if (error.message.includes("Invalid login")) {
            toast.error("邮箱或密码错误");
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success("登录成功！");
      } else {
        const {
          data: authData,
          error: signUpError
        } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        if (signUpError) {
          if (signUpError.message.includes("already registered")) {
            toast.error("该邮箱已被注册");
          } else {
            toast.error(signUpError.message);
          }
          return;
        }
        if (authData.user) {
          const {
            error: profileError
          } = await supabase.from("profiles").insert({
            user_id: authData.user.id,
            username,
            grade: selectedGrade
          });
          if (profileError) {
            console.error("Profile creation error:", profileError);
            toast.error("创建用户资料失败，请重试");
            return;
          }
          toast.success("注册成功！欢迎加入狄邦单词通！");
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("操作失败，请重试");
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen flex items-center justify-center p-6 bg-background bg-grid-pattern">
      {/* Ambient Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-blue/10 rounded-full blur-3xl animate-float" style={{
        animationDelay: "-3s"
      }} />
      </div>

      <Card variant="glow" className="w-full max-w-md relative z-10 animate-scale-in">
        <CardHeader className="text-center pb-2">
          <img alt="狄邦单词通" className="w-20 h-20 mx-auto mb-4 rounded-xl shadow-lg shadow-primary/30" src="/lovable-uploads/bc7d1c2a-b9e9-4f6e-8569-77324e67bc27.jpg" />
          <CardTitle className="text-2xl text-glow-purple">
            {isLogin ? "登录" : "注册"}
          </CardTitle>
          <p className="text-muted-foreground text-sm mt-2">
            狄邦单词通 · 词汇学习平台
          </p>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && <>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">用户名</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="text" placeholder="输入你的用户名" value={username} onChange={e => setUsername(e.target.value)} className="pl-10 bg-secondary/50 border-border/50 focus:border-primary" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">选择年级</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[7, 8].map(grade => <button key={grade} type="button" onClick={() => setSelectedGrade(grade as 7 | 8)} className={cn("p-3 rounded-xl border-2 transition-all duration-300 text-center", selectedGrade === grade ? "border-primary bg-primary/10 text-primary" : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50")}>
                        <span className="font-gaming text-lg">{grade}</span>
                        <span className="text-sm ml-1">年级</span>
                      </button>)}
                  </div>
                </div>
              </>}

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" placeholder="输入你的邮箱" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 bg-secondary/50 border-border/50 focus:border-primary" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="password" placeholder="输入你的密码" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 bg-secondary/50 border-border/50 focus:border-primary" />
              </div>
            </div>

            <Button type="submit" variant="hero" className="w-full" disabled={loading}>
              {loading ? "处理中..." : isLogin ? "登录" : "注册"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              {isLogin ? "还没有账号？" : "已有账号？"}
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline ml-1">
                {isLogin ? "立即注册" : "立即登录"}
              </button>
            </p>
          </div>

          <Button variant="ghost" className="w-full mt-4" onClick={() => navigate("/")}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            返回首页
          </Button>
        </CardContent>
      </Card>
    </div>;
};
export default Auth;