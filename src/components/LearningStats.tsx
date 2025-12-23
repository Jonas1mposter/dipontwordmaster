import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { BookOpen, Target, TrendingUp, CheckCircle } from "lucide-react";
import { Loader2 } from "lucide-react";

interface LearningData {
  totalWords: number;
  masteredWords: number;
  learningWords: number;
  correctRate: number;
  weeklyData: { day: string; count: number }[];
  masteryDistribution: { name: string; value: number; color: string }[];
}

const LearningStats = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LearningData>({
    totalWords: 0,
    masteredWords: 0,
    learningWords: 0,
    correctRate: 0,
    weeklyData: [],
    masteryDistribution: [],
  });

  useEffect(() => {
    const fetchLearningStats = async () => {
      if (!profile) return;

      try {
        // Fetch learning progress
        const { data: progressData, error } = await supabase
          .from("learning_progress")
          .select("*")
          .eq("profile_id", profile.id);

        if (error) throw error;

        if (progressData) {
          const totalWords = progressData.length;
          const masteredWords = progressData.filter(p => p.mastery_level >= 3).length;
          const learningWords = progressData.filter(p => p.mastery_level > 0 && p.mastery_level < 3).length;
          
          const totalCorrect = progressData.reduce((sum, p) => sum + p.correct_count, 0);
          const totalIncorrect = progressData.reduce((sum, p) => sum + p.incorrect_count, 0);
          const total = totalCorrect + totalIncorrect;
          const correctRate = total > 0 ? Math.round((totalCorrect / total) * 100) : 0;

          // Calculate weekly data (last 7 days)
          const now = new Date();
          const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
          const weeklyData = [];
          
          for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dayStart = new Date(date.setHours(0, 0, 0, 0));
            const dayEnd = new Date(date.setHours(23, 59, 59, 999));
            
            const dayCount = progressData.filter(p => {
              const updatedAt = new Date(p.updated_at);
              return updatedAt >= dayStart && updatedAt <= dayEnd;
            }).length;
            
            weeklyData.push({
              day: `周${weekDays[new Date(now.getTime() - i * 24 * 60 * 60 * 1000).getDay()]}`,
              count: dayCount,
            });
          }

          // Mastery distribution
          const newWords = progressData.filter(p => p.mastery_level === 0).length;
          const familiar = progressData.filter(p => p.mastery_level === 1).length;
          const proficient = progressData.filter(p => p.mastery_level === 2).length;
          const mastered = progressData.filter(p => p.mastery_level >= 3).length;

          const masteryDistribution = [
            { name: "生词", value: newWords, color: "hsl(0, 72%, 51%)" },
            { name: "熟悉", value: familiar, color: "hsl(45, 100%, 55%)" },
            { name: "掌握中", value: proficient, color: "hsl(200, 100%, 60%)" },
            { name: "已掌握", value: mastered, color: "hsl(142, 76%, 45%)" },
          ].filter(item => item.value > 0);

          setData({
            totalWords,
            masteredWords,
            learningWords,
            correctRate,
            weeklyData,
            masteryDistribution,
          });
        }
      } catch (error) {
        console.error("Error fetching learning stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLearningStats();
  }, [profile]);

  if (loading) {
    return (
      <Card variant="gaming" className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card variant="gaming" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">学习单词</p>
              <p className="text-xl font-gaming text-foreground">{data.totalWords}</p>
            </div>
          </div>
        </Card>

        <Card variant="gaming" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">已掌握</p>
              <p className="text-xl font-gaming text-success">{data.masteredWords}</p>
            </div>
          </div>
        </Card>

        <Card variant="gaming" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">学习中</p>
              <p className="text-xl font-gaming text-accent">{data.learningWords}</p>
            </div>
          </div>
        </Card>

        <Card variant="gaming" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neon-cyan/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-neon-cyan" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">正确率</p>
              <p className="text-xl font-gaming text-neon-cyan">{data.correctRate}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Weekly Learning Chart */}
        <Card variant="gaming">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-gaming text-foreground">本周学习趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 20%)" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(230, 20%, 20%)' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(230, 20%, 20%)' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(230, 25%, 12%)',
                      border: '1px solid hsl(265, 89%, 66%)',
                      borderRadius: '8px',
                      color: 'hsl(210, 40%, 98%)',
                    }}
                    labelStyle={{ color: 'hsl(210, 40%, 98%)' }}
                    formatter={(value: number) => [`${value} 个单词`, '学习']}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(265, 89%, 66%)" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Mastery Distribution */}
        <Card variant="gaming">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-gaming text-foreground">掌握程度分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {data.masteryDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.masteryDistribution}
                      cx="50%"
                      cy="45%"
                      innerRadius={35}
                      outerRadius={60}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {data.masteryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(230, 25%, 12%)',
                        border: '1px solid hsl(265, 89%, 66%)',
                        borderRadius: '8px',
                        color: 'hsl(210, 40%, 98%)',
                      }}
                      formatter={(value: number) => [`${value} 个单词`, '数量']}
                    />
                    <Legend 
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value, entry: any) => {
                        const item = data.masteryDistribution.find(d => d.name === value);
                        const total = data.masteryDistribution.reduce((sum, d) => sum + d.value, 0);
                        const percent = item && total > 0 ? Math.round((item.value / total) * 100) : 0;
                        return <span style={{ color: 'hsl(215, 20%, 65%)', fontSize: '12px' }}>{value} {percent}%</span>;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  暂无学习数据
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LearningStats;
