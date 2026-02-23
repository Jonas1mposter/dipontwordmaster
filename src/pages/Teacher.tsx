import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTeacherRole } from '@/hooks/useTeacherRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  ArrowLeft, Users, BookOpen, Trophy, BarChart3, Shield,
  GraduationCap, Target, Calendar, Plus, Trash2, Eye
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  assignment_type: string;
  target_data: Record<string, unknown>;
  due_date: string | null;
  is_active: boolean;
  created_at: string;
  class_name: string;
  grade: number;
}

interface Competition {
  id: string;
  title: string;
  description: string | null;
  competition_type: string;
  start_time: string;
  end_time: string;
  reward_coins: number;
  is_active: boolean;
  class_name: string;
  grade: number;
}

const CLASS_OPTIONS: Record<number, string[]> = {
  7: ['7A1', '7A2', '7B', '7C', '7D', '7E'],
  8: ['8A1', '8A2', '8A3', '8B', '8C', '8D', '8E', '8F'],
};

export default function Teacher() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isTeacher, loading: roleLoading } = useTeacherRole();

  const [selectedGrade, setSelectedGrade] = useState<string>('7');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [learningData, setLearningData] = useState<Map<string, StudentLearningData>>(new Map());
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Assignments state
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', type: 'levels', targetUnit: '1' });
  const [creatingAssignment, setCreatingAssignment] = useState(false);

  // Competitions state
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [newCompetition, setNewCompetition] = useState({
    title: '', description: '', type: 'xp', rewardCoins: '100',
    startTime: '', endTime: ''
  });
  const [creatingCompetition, setCreatingCompetition] = useState(false);

  // Teacher classes
  const [teacherClasses, setTeacherClasses] = useState<{ class_name: string; grade: number }[]>([]);

  const loading = authLoading || roleLoading;

  const availableClasses = useMemo(() => {
    return CLASS_OPTIONS[parseInt(selectedGrade)] || [];
  }, [selectedGrade]);

  // Fetch teacher's assigned classes
  useEffect(() => {
    if (!user || !isTeacher) return;
    const fetchTeacherClasses = async () => {
      const { data } = await supabase
        .from('teacher_classes')
        .select('class_name, grade')
        .eq('teacher_id', user.id);
      if (data) {
        setTeacherClasses(data);
        if (data.length > 0 && !selectedClass) {
          setSelectedGrade(String(data[0].grade));
          setSelectedClass(data[0].class_name);
        }
      }
    };
    fetchTeacherClasses();
  }, [user, isTeacher]);

  // Fetch students when class changes
  useEffect(() => {
    if (selectedClass && selectedGrade) {
      fetchStudents();
      fetchAssignments();
      fetchCompetitions();
    }
  }, [selectedClass, selectedGrade]);

  const fetchStudents = async () => {
    if (!selectedClass) return;
    setLoadingStudents(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, level, grade, class, total_xp, coins, wins, losses, streak')
        .eq('grade', parseInt(selectedGrade))
        .eq('class', selectedClass)
        .order('total_xp', { ascending: false });

      if (error) throw error;
      setStudents(data || []);

      // Fetch learning data for these students
      if (data && data.length > 0) {
        const profileIds = data.map(s => s.id);
        const { data: progressData } = await supabase
          .from('learning_progress')
          .select('profile_id, mastery_level, correct_count, incorrect_count')
          .in('profile_id', profileIds);

        if (progressData) {
          const dataMap = new Map<string, StudentLearningData>();
          for (const pid of profileIds) {
            const records = progressData.filter(p => p.profile_id === pid);
            const total = records.length;
            const mastered = records.filter(r => r.mastery_level >= 3).length;
            const totalCorrect = records.reduce((s, r) => s + (r.correct_count || 0), 0);
            const totalAnswered = records.reduce((s, r) => s + (r.correct_count || 0) + (r.incorrect_count || 0), 0);
            dataMap.set(pid, {
              profile_id: pid,
              total_words: total,
              mastered_words: mastered,
              accuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
            });
          }
          setLearningData(dataMap);
        }
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      toast.error('获取学生列表失败');
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchAssignments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('class_assignments')
      .select('*')
      .eq('teacher_id', user.id)
      .eq('class_name', selectedClass)
      .eq('grade', parseInt(selectedGrade))
      .order('created_at', { ascending: false });
    setAssignments((data as Assignment[]) || []);
  };

  const fetchCompetitions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('class_competitions')
      .select('*')
      .eq('teacher_id', user.id)
      .eq('class_name', selectedClass)
      .eq('grade', parseInt(selectedGrade))
      .order('created_at', { ascending: false });
    setCompetitions((data as Competition[]) || []);
  };

  const createAssignment = async () => {
    if (!user || !selectedClass || !newAssignment.title) {
      toast.error('请填写任务标题');
      return;
    }
    setCreatingAssignment(true);
    try {
      const { error } = await supabase
        .from('class_assignments')
        .insert({
          teacher_id: user.id,
          class_name: selectedClass,
          grade: parseInt(selectedGrade),
          title: newAssignment.title,
          description: newAssignment.description || null,
          assignment_type: newAssignment.type,
          target_data: { unit: parseInt(newAssignment.targetUnit) },
        });
      if (error) throw error;
      toast.success('任务创建成功');
      setNewAssignment({ title: '', description: '', type: 'levels', targetUnit: '1' });
      fetchAssignments();
    } catch (err) {
      console.error('Error creating assignment:', err);
      toast.error('创建失败');
    } finally {
      setCreatingAssignment(false);
    }
  };

  const deleteAssignment = async (id: string) => {
    const { error } = await supabase.from('class_assignments').delete().eq('id', id);
    if (error) {
      toast.error('删除失败');
    } else {
      toast.success('任务已删除');
      fetchAssignments();
    }
  };

  const createCompetition = async () => {
    if (!user || !selectedClass || !newCompetition.title || !newCompetition.startTime || !newCompetition.endTime) {
      toast.error('请填写完整信息');
      return;
    }
    setCreatingCompetition(true);
    try {
      const { error } = await supabase
        .from('class_competitions')
        .insert({
          teacher_id: user.id,
          class_name: selectedClass,
          grade: parseInt(selectedGrade),
          title: newCompetition.title,
          description: newCompetition.description || null,
          competition_type: newCompetition.type,
          start_time: newCompetition.startTime,
          end_time: newCompetition.endTime,
          reward_coins: parseInt(newCompetition.rewardCoins) || 0,
        });
      if (error) throw error;
      toast.success('比赛创建成功');
      setNewCompetition({ title: '', description: '', type: 'xp', rewardCoins: '100', startTime: '', endTime: '' });
      fetchCompetitions();
    } catch (err) {
      console.error('Error creating competition:', err);
      toast.error('创建失败');
    } finally {
      setCreatingCompetition(false);
    }
  };

  const deleteCompetition = async (id: string) => {
    const { error } = await supabase.from('class_competitions').delete().eq('id', id);
    if (error) {
      toast.error('删除失败');
    } else {
      toast.success('比赛已删除');
      fetchCompetitions();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">请先登录</p>
            <Button onClick={() => navigate('/auth')}>去登录</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isTeacher) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 mx-auto text-destructive mb-4" />
            <p className="text-muted-foreground mb-4">您没有教师权限</p>
            <Button variant="outline" onClick={() => navigate('/')}>返回首页</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-gaming text-glow-purple flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-primary" />
              教师管理后台
            </h1>
            <p className="text-muted-foreground text-sm">班级管理 · 学习数据 · 任务布置 · 竞赛管理</p>
          </div>
        </div>

        {/* Class Selector */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">年级:</span>
                <Select value={selectedGrade} onValueChange={(v) => { setSelectedGrade(v); setSelectedClass(''); }}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7年级</SelectItem>
                    <SelectItem value="8">8年级</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">班级:</span>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="选择班级" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {teacherClasses.length > 0 && (
                <div className="flex gap-1 ml-auto">
                  <span className="text-xs text-muted-foreground">我的班级:</span>
                  {teacherClasses.map(tc => (
                    <Badge
                      key={`${tc.grade}-${tc.class_name}`}
                      variant={tc.class_name === selectedClass ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => { setSelectedGrade(String(tc.grade)); setSelectedClass(tc.class_name); }}
                    >
                      {tc.class_name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {!selectedClass ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              请选择一个班级开始管理
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="students" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 max-w-2xl">
              <TabsTrigger value="students" className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                学生列表
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4" />
                学习数据
              </TabsTrigger>
              <TabsTrigger value="assignments" className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                布置任务
              </TabsTrigger>
              <TabsTrigger value="competitions" className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4" />
                班级竞赛
              </TabsTrigger>
            </TabsList>

            {/* Students Tab */}
            <TabsContent value="students">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {selectedClass} 班学生 ({students.length}人)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingStudents ? (
                    <div className="py-8 text-center text-muted-foreground">加载中...</div>
                  ) : students.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">该班级暂无学生</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-3">#</th>
                            <th className="text-left py-2 px-3">用户名</th>
                            <th className="text-center py-2 px-3">等级</th>
                            <th className="text-center py-2 px-3">总XP</th>
                            <th className="text-center py-2 px-3">胜/负</th>
                            <th className="text-center py-2 px-3">连胜</th>
                            <th className="text-center py-2 px-3">狄邦豆</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((s, i) => (
                            <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                              <td className="py-2 px-3 font-medium">{s.username}</td>
                              <td className="py-2 px-3 text-center">Lv.{s.level}</td>
                              <td className="py-2 px-3 text-center">{s.total_xp}</td>
                              <td className="py-2 px-3 text-center">
                                <span className="text-emerald-500">{s.wins}</span>
                                <span className="text-muted-foreground">/</span>
                                <span className="text-destructive">{s.losses}</span>
                              </td>
                              <td className="py-2 px-3 text-center">{s.streak}</td>
                              <td className="py-2 px-3 text-center">{s.coins}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Learning Data Tab */}
            <TabsContent value="data">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    学习数据概览
                  </CardTitle>
                  <CardDescription>
                    {selectedClass} 班英语词汇学习数据
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {students.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">暂无数据</div>
                  ) : (
                    <div className="space-y-3">
                      {students.map((s) => {
                        const data = learningData.get(s.id);
                        const masteryPercent = data && data.total_words > 0
                          ? Math.round((data.mastered_words / data.total_words) * 100)
                          : 0;
                        return (
                          <div key={s.id} className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/30">
                            <div className="w-24 font-medium truncate">{s.username}</div>
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>掌握进度: {data?.mastered_words || 0}/{data?.total_words || 0} 词</span>
                                <span>{masteryPercent}%</span>
                              </div>
                              <Progress value={masteryPercent} className="h-2" />
                            </div>
                            <div className="text-center min-w-[60px]">
                              <div className="text-sm font-bold">{data?.accuracy || 0}%</div>
                              <div className="text-xs text-muted-foreground">正确率</div>
                            </div>
                            <div className="text-center min-w-[50px]">
                              <div className="text-sm font-bold">{s.total_xp}</div>
                              <div className="text-xs text-muted-foreground">XP</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Assignments Tab */}
            <TabsContent value="assignments">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      创建新任务
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      placeholder="任务标题 (如: 完成Unit 3关卡)"
                      value={newAssignment.title}
                      onChange={e => setNewAssignment(prev => ({ ...prev, title: e.target.value }))}
                    />
                    <Textarea
                      placeholder="任务描述 (可选)"
                      value={newAssignment.description}
                      onChange={e => setNewAssignment(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                    />
                    <div className="flex gap-4">
                      <Select value={newAssignment.type} onValueChange={v => setNewAssignment(prev => ({ ...prev, type: v }))}>
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="levels">闯关任务</SelectItem>
                          <SelectItem value="words">词汇学习</SelectItem>
                          <SelectItem value="review">复习巩固</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="目标单元"
                        type="number"
                        value={newAssignment.targetUnit}
                        onChange={e => setNewAssignment(prev => ({ ...prev, targetUnit: e.target.value }))}
                        className="w-24"
                      />
                      <Button onClick={createAssignment} disabled={creatingAssignment}>
                        <Plus className="w-4 h-4 mr-1" />
                        {creatingAssignment ? '创建中...' : '创建'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">已布置的任务</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {assignments.length === 0 ? (
                      <div className="py-6 text-center text-muted-foreground">暂无任务</div>
                    ) : (
                      <div className="space-y-3">
                        {assignments.map(a => (
                          <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                            <div className="flex-1">
                              <div className="font-medium">{a.title}</div>
                              {a.description && <div className="text-xs text-muted-foreground mt-1">{a.description}</div>}
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {a.assignment_type === 'levels' ? '闯关' : a.assignment_type === 'words' ? '词汇' : '复习'}
                                </Badge>
                                <Badge variant={a.is_active ? 'default' : 'secondary'} className="text-xs">
                                  {a.is_active ? '进行中' : '已结束'}
                                </Badge>
                              </div>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                                  <AlertDialogDescription>确认删除任务 "{a.title}"？</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteAssignment(a.id)}>删除</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Competitions Tab */}
            <TabsContent value="competitions">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      创建班级竞赛
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      placeholder="竞赛标题 (如: 本周词汇挑战赛)"
                      value={newCompetition.title}
                      onChange={e => setNewCompetition(prev => ({ ...prev, title: e.target.value }))}
                    />
                    <Textarea
                      placeholder="竞赛描述 (可选)"
                      value={newCompetition.description}
                      onChange={e => setNewCompetition(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                    />
                    <div className="flex gap-4 flex-wrap">
                      <Select value={newCompetition.type} onValueChange={v => setNewCompetition(prev => ({ ...prev, type: v }))}>
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="xp">XP排名</SelectItem>
                          <SelectItem value="accuracy">正确率</SelectItem>
                          <SelectItem value="words">词汇量</SelectItem>
                          <SelectItem value="battles">对战胜场</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="奖励狄邦豆"
                        value={newCompetition.rewardCoins}
                        onChange={e => setNewCompetition(prev => ({ ...prev, rewardCoins: e.target.value }))}
                        className="w-32"
                      />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground mb-1 block">开始时间</label>
                        <Input
                          type="datetime-local"
                          value={newCompetition.startTime}
                          onChange={e => setNewCompetition(prev => ({ ...prev, startTime: e.target.value }))}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground mb-1 block">结束时间</label>
                        <Input
                          type="datetime-local"
                          value={newCompetition.endTime}
                          onChange={e => setNewCompetition(prev => ({ ...prev, endTime: e.target.value }))}
                        />
                      </div>
                    </div>
                    <Button onClick={createCompetition} disabled={creatingCompetition}>
                      <Plus className="w-4 h-4 mr-1" />
                      {creatingCompetition ? '创建中...' : '创建竞赛'}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">已创建的竞赛</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {competitions.length === 0 ? (
                      <div className="py-6 text-center text-muted-foreground">暂无竞赛</div>
                    ) : (
                      <div className="space-y-3">
                        {competitions.map(c => {
                          const now = new Date();
                          const isOngoing = new Date(c.start_time) <= now && now <= new Date(c.end_time);
                          const isUpcoming = new Date(c.start_time) > now;
                          return (
                            <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                              <Trophy className="w-5 h-5 text-accent shrink-0" />
                              <div className="flex-1">
                                <div className="font-medium">{c.title}</div>
                                {c.description && <div className="text-xs text-muted-foreground mt-1">{c.description}</div>}
                                <div className="flex gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {c.competition_type === 'xp' ? 'XP排名' : c.competition_type === 'accuracy' ? '正确率' : c.competition_type === 'words' ? '词汇量' : '对战'}
                                  </Badge>
                                  <Badge variant={isOngoing ? 'default' : isUpcoming ? 'secondary' : 'outline'} className="text-xs">
                                    {isOngoing ? '进行中' : isUpcoming ? '未开始' : '已结束'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">🪙 {c.reward_coins}</Badge>
                                </div>
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>确认删除</AlertDialogTitle>
                                    <AlertDialogDescription>确认删除竞赛 "{c.title}"？</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteCompetition(c.id)}>删除</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
