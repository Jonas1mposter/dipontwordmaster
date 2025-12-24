import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white text-lg">加载中...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  // 用户只能进入自己年级的专区
  const userGrade = profile.grade as 7 | 8;

  return (
    <Dashboard grade={userGrade} onBack={() => navigate("/auth")} />
  );
};

export default Index;
