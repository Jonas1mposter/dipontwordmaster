import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  BarChart3, Users, Target, TrendingUp, BookOpen, Award,
  ArrowLeft, ChevronRight, Star, Zap
} from 'lucide-react';

interface StudentProfile {
  id: string;
  username: string;
  level: number;
  grade: number;
  class: string | null;
  total_xp: number;
  coins: number;
  wins: number;
  losses: number;
  streak: number;
}

interface StudentLearningData {
  profile_id: string;
  total_words: number;
  mastered_words: number;
  accuracy: number;
}

interface LevelProgressData {
  profile_id: string;
  level_id: string;
  stars: number;
  best_score: number;
  status: string;
  attempts: number;
}

interface Props {
  students: StudentProfile[];
  learningData: Map<string, StudentLearningData>;
  levelProgressData: Map<string, LevelProgressData[]>;
  selectedClass: string;
}

const CHART_COLORS = {
  primary: 'hsl(265, 89%, 66%)',
  success: 'hsl(142, 76%, 45%)',
  warning: 'hsl(45, 100%, 55%)',
  danger: 'hsl(0, 72%, 51%)',
  info: 'hsl(200, 100%, 60%)',
};

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(230, 25%, 12%)',
  border: '1px solid hsl(265, 89%, 66%)',
  borderRadius: '8px',
  color: 'hsl(210, 40%, 98%)',
};

export default function StudentProgressDashboard({ students, learningData, levelProgressData, selectedClass }: Props) {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  // Class-level summary stats
  const classSummary = useMemo(() => {
    if (students.length === 0) return null;

    const learningEntries = Array.from(learningData.values());
    const totalWords = learningEntries.reduce((s, d) => s + d.total_words, 0);
    const totalMastered = learningEntries.reduce((s, d) => s + d.mastered_words, 0);
    const avgAccuracy = learningEntries.length > 0
      ? Math.round(learningEntries.reduce((s, d) => s + d.accuracy, 0) / learningEntries.length)
      : 0;
    const avgXP = Math.round(students.reduce((s, st) => s + st.total_xp, 0) / students.length);
    const totalWins = students.reduce((s, st) => s + st.wins, 0);
    const totalLosses = students.reduce((s, st) => s + st.losses, 0);

    // Level completion stats
    const allLevelProgress = Array.from(levelProgressData.values()).flat();
    const completedLevels = allLevelProgress.filter(lp => lp.status === 'completed').length;
    const totalStars = allLevelProgress.reduce((s, lp) => s + lp.stars, 0);

    return {
      studentCount: students.length,
      totalWords,
      totalMastered,
      avgAccuracy,
      avgXP,
      totalWins,
      totalLosses,
      completedLevels,
      totalStars,
    };
  }, [students, learningData, levelProgressData]);

  // Accuracy distribution for bar chart
  const accuracyDistribution = useMemo(() => {
    const ranges = [
      { label: '0-30%', min: 0, max: 30, count: 0 },
      { label: '31-50%', min: 31, max: 50, count: 0 },
      { label: '51-70%', min: 51, max: 70, count: 0 },
      { label: '71-90%', min: 71, max: 90, count: 0 },
      { label: '91-100%', min: 91, max: 100, count: 0 },
    ];
    learningData.forEach(d => {
      const r = ranges.find(r => d.accuracy >= r.min && d.accuracy <= r.max);
      if (r) r.count++;
    });
    return ranges.map(r => ({ name: r.label, 学生数: r.count }));
  }, [learningData]);

  // Mastery distribution pie chart
  const masteryPie = useMemo(() => {
    let newWords = 0, learning = 0, mastered = 0;
    learningData.forEach(d => {
      mastered += d.mastered_words;
      learning += Math.max(0, d.total_words - d.mastered_words);
    });
    // Estimate: students with 0 progress
    const studentsWithData = learningData.size;
    const noData = students.length - studentsWithData;

    const result = [];
    if (mastered > 0) result.push({ name: '已掌握', value: mastered, color: CHART_COLORS.success });
    if (learning > 0) result.push({ name: '学习中', value: learning, color: CHART_COLORS.warning });
    if (noData > 0) result.push({ name: '未开始', value: noData, color: CHART_COLORS.danger });
    return result;
  }, [learningData, students]);

  // Student ranking by XP
  const rankedStudents = useMemo(() => {
    return [...students].sort((a, b) => b.total_xp - a.total_xp);
  }, [students]);

  // Selected student detail
  const studentDetail = useMemo(() => {
    if (!selectedStudent) return null;
    const student = students.find(s => s.id === selectedStudent);
    if (!student) return null;
    const learning = learningData.get(selectedStudent);
    const levels = levelProgressData.get(selectedStudent) || [];
    const completedLevels = levels.filter(l => l.status === 'completed').length;
    const totalStars = levels.reduce((s, l) => s + l.stars, 0);
    const avgScore = levels.length > 0
      ? Math.round(levels.reduce((s, l) => s + l.best_score, 0) / levels.length)
      : 0;

    const radarData = [
      { metric: '词汇量', value: Math.min(100, (learning?.total_words || 0) / 2) },
      { metric: '掌握率', value: learning && learning.total_words > 0 ? Math.round((learning.mastered_words / learning.total_words) * 100) : 0 },
      { metric: '正确率', value: learning?.accuracy || 0 },
      { metric: '关卡', value: Math.min(100, completedLevels * 5) },
      { metric: '对战', value: Math.min(100, (student.wins / Math.max(1, student.wins + student.losses)) * 100) },
      { metric: '活跃度', value: Math.min(100, student.streak * 15) },
    ];

    return { student, learning, levels, completedLevels, totalStars, avgScore, radarData };
  }, [selectedStudent, students, learningData, levelProgressData]);

  if (selectedStudent && studentDetail) {
    return (
      <div className="space-y-4">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          返回班级概览
        </Button>

        {/* Student header */}
        <Card variant="gaming">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-lg font-gaming text-primary">
                  {studentDetail.student.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-gaming">{studentDetail.student.username}</h3>
                <p className="text-sm text-muted-foreground">
                  Lv.{studentDetail.student.level} · {selectedClass}
                </p>
              </div>
              <div className="flex gap-4 flex-wrap">
                <div className="text-center">
                  <div className="text-lg font-gaming text-primary">{studentDetail.student.total_xp}</div>
                  <div className="text-xs text-muted-foreground">总XP</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-gaming text-success">{studentDetail.learning?.accuracy || 0}%</div>
                  <div className="text-xs text-muted-foreground">正确率</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-gaming text-accent">{studentDetail.completedLevels}</div>
                  <div className="text-xs text-muted-foreground">通关数</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-gaming text-yellow-400">{studentDetail.totalStars}⭐</div>
                  <div className="text-xs text-muted-foreground">总星数</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Radar chart */}
          <Card variant="gaming">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-gaming">能力雷达图</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={studentDetail.radarData}>
                    <PolarGrid stroke="hsl(230, 20%, 25%)" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      tick={{ fill: 'hsl(215, 20%, 45%)', fontSize: 10 }}
                    />
                    <Radar
                      name="能力值"
                      dataKey="value"
                      stroke={CHART_COLORS.primary}
                      fill={CHART_COLORS.primary}
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Word mastery breakdown */}
          <Card variant="gaming">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-gaming">词汇掌握情况</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-primary/10 text-center">
                    <div className="text-2xl font-gaming text-primary">{studentDetail.learning?.total_words || 0}</div>
                    <div className="text-xs text-muted-foreground">学习单词</div>
                  </div>
                  <div className="p-3 rounded-lg bg-success/10 text-center">
                    <div className="text-2xl font-gaming text-success">{studentDetail.learning?.mastered_words || 0}</div>
                    <div className="text-xs text-muted-foreground">已掌握</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">掌握进度</span>
                    <span className="font-medium">
                      {studentDetail.learning && studentDetail.learning.total_words > 0
                        ? Math.round((studentDetail.learning.mastered_words / studentDetail.learning.total_words) * 100)
                        : 0}%
                    </span>
                  </div>
                  <Progress
                    value={studentDetail.learning && studentDetail.learning.total_words > 0
                      ? Math.round((studentDetail.learning.mastered_words / studentDetail.learning.total_words) * 100)
                      : 0}
                    variant="success"
                    className="h-3"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">答题正确率</span>
                    <span className="font-medium">{studentDetail.learning?.accuracy || 0}%</span>
                  </div>
                  <Progress value={studentDetail.learning?.accuracy || 0} className="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Level progress detail */}
        <Card variant="gaming">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-gaming">关卡完成情况</CardTitle>
            <CardDescription>共完成 {studentDetail.completedLevels} 个关卡，平均分 {studentDetail.avgScore}</CardDescription>
          </CardHeader>
          <CardContent>
            {studentDetail.levels.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">暂无关卡记录</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {studentDetail.levels.map((lp, i) => (
                  <div
                    key={lp.level_id}
                    className={`p-2 rounded-lg border text-center text-xs ${
                      lp.status === 'completed'
                        ? 'border-success/30 bg-success/5'
                        : 'border-border/50 bg-muted/20'
                    }`}
                  >
                    <div className="text-muted-foreground mb-1">关卡 {i + 1}</div>
                    <div className="flex justify-center gap-0.5 mb-1">
                      {[1, 2, 3].map(s => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${s <= lp.stars ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`}
                        />
                      ))}
                    </div>
                    <div className="font-medium">{lp.best_score}分</div>
                    <div className="text-muted-foreground">{lp.attempts}次</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Battle stats */}
        <Card variant="gaming">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-gaming">对战数据</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <div className="text-xl font-gaming text-success">{studentDetail.student.wins}</div>
                <div className="text-xs text-muted-foreground">胜场</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <div className="text-xl font-gaming text-destructive">{studentDetail.student.losses}</div>
                <div className="text-xs text-muted-foreground">负场</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <div className="text-xl font-gaming text-primary">
                  {studentDetail.student.wins + studentDetail.student.losses > 0
                    ? Math.round((studentDetail.student.wins / (studentDetail.student.wins + studentDetail.student.losses)) * 100)
                    : 0}%
                </div>
                <div className="text-xs text-muted-foreground">胜率</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <div className="text-xl font-gaming text-accent">{studentDetail.student.streak}</div>
                <div className="text-xs text-muted-foreground">连胜</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Class overview
  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {classSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card variant="gaming" className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">学生人数</p>
                <p className="text-xl font-gaming">{classSummary.studentCount}</p>
              </div>
            </div>
          </Card>
          <Card variant="gaming" className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">平均正确率</p>
                <p className="text-xl font-gaming text-success">{classSummary.avgAccuracy}%</p>
              </div>
            </div>
          </Card>
          <Card variant="gaming" className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">平均XP</p>
                <p className="text-xl font-gaming text-accent">{classSummary.avgXP}</p>
              </div>
            </div>
          </Card>
          <Card variant="gaming" className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">总通关/星数</p>
                <p className="text-xl font-gaming text-yellow-400">{classSummary.completedLevels}/{classSummary.totalStars}⭐</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Accuracy distribution */}
        <Card variant="gaming">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-gaming">正确率分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={accuracyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 20%)" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v} 人`, '学生数']} />
                  <Bar dataKey="学生数" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Mastery pie */}
        <Card variant="gaming">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-gaming">全班词汇掌握分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {masteryPie.length > 0 ? (
                <div className="flex flex-col h-full">
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={masteryPie}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={55}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {masteryPie.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}`, '数量']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 pt-1">
                    {masteryPie.map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-muted-foreground">{item.name} ({item.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">暂无数据</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student ranking list */}
      <Card variant="gaming">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-gaming flex items-center gap-2">
            <Award className="w-4 h-4" />
            学生进度排名（点击查看详情）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">暂无学生</div>
          ) : (
            <div className="space-y-2">
              {rankedStudents.map((s, i) => {
                const data = learningData.get(s.id);
                const levels = levelProgressData.get(s.id) || [];
                const completedLevels = levels.filter(l => l.status === 'completed').length;
                const masteryPercent = data && data.total_words > 0
                  ? Math.round((data.mastered_words / data.total_words) * 100) : 0;

                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedStudent(s.id)}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 cursor-pointer transition-all group"
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                      i === 1 ? 'bg-gray-400/20 text-gray-300' :
                      i === 2 ? 'bg-amber-700/20 text-amber-600' :
                      'bg-muted/50 text-muted-foreground'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="w-28 font-medium truncate">{s.username}</div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>掌握 {data?.mastered_words || 0}/{data?.total_words || 0}</span>
                        <span>{masteryPercent}%</span>
                      </div>
                      <Progress value={masteryPercent} variant="success" className="h-1.5" />
                    </div>
                    <div className="text-center min-w-[48px]">
                      <div className="text-xs font-bold">{data?.accuracy || 0}%</div>
                      <div className="text-[10px] text-muted-foreground">正确率</div>
                    </div>
                    <div className="text-center min-w-[40px]">
                      <div className="text-xs font-bold">{completedLevels}</div>
                      <div className="text-[10px] text-muted-foreground">通关</div>
                    </div>
                    <div className="text-center min-w-[48px]">
                      <div className="text-xs font-bold text-primary">{s.total_xp}</div>
                      <div className="text-[10px] text-muted-foreground">XP</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
