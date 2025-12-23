import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import GradeSelector from "@/components/GradeSelector";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedGrade, setSelectedGrade] = useState<7 | 8 | null>(null);

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

  if (!user) {
    return null;
  }

  if (selectedGrade === null) {
    return <GradeSelector onSelectGrade={setSelectedGrade} />;
  }

  return (
    <Dashboard grade={selectedGrade} onBack={() => setSelectedGrade(null)} />
  );
};

export default Index;
