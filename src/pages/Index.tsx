import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/components/Dashboard";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  // Debug logging
  console.log("[Index] State:", { loading, hasUser: !!user, hasProfile: !!profile, userId: user?.id });

  useEffect(() => {
    if (!loading && !user) {
      console.log("[Index] No user, redirecting to auth");
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // 加载中或等待 profile 数据
  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </div>
    );
  }

  // 未登录则不渲染（useEffect 会跳转）
  if (!user) {
    return null;
  }

  // 用户只能进入自己年级的专区
  const userGrade = (profile?.grade || 7) as 7 | 8;

  return (
    <Dashboard grade={userGrade} />
  );
};

export default Index;
