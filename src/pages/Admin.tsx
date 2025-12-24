import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminRole } from '@/hooks/useAdminRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Upload, FileText, Trash2, Shield, Users, Crown, User, BookOpen, Award, RefreshCw } from 'lucide-react';

interface ParsedWord {
  word: string;
  meaning: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  level: number;
  grade: number;
  rank_tier: string;
  created_at: string;
  isAdmin?: boolean;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole();
  
  // Import state
  const [rawText, setRawText] = useState('');
  const [grade, setGrade] = useState('8');
  const [unit, setUnit] = useState('1');
  const [difficulty, setDifficulty] = useState('1');
  const [parsedWords, setParsedWords] = useState<ParsedWord[]>([]);
  const [importing, setImporting] = useState(false);

  // User management state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Word stats
  const [wordStats, setWordStats] = useState<{grade: number, count: number}[]>([]);
  const [awardingCards, setAwardingCards] = useState(false);

  const loading = authLoading || roleLoading;

  // Fetch users and their roles
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get all admin roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const adminUserIds = new Set(roles?.filter(r => r.role === 'admin').map(r => r.user_id) || []);

      const usersWithRoles = profiles?.map(p => ({
        ...p,
        isAdmin: adminUserIds.has(p.user_id)
      })) || [];

      setUsers(usersWithRoles);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('获取用户列表失败');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch word stats
  const fetchWordStats = async () => {
    const { data, error } = await supabase
      .from('words')
      .select('grade');
    
    if (data) {
      const stats: Record<number, number> = {};
      data.forEach(w => {
        stats[w.grade] = (stats[w.grade] || 0) + 1;
      });
      setWordStats(Object.entries(stats).map(([g, c]) => ({ grade: parseInt(g), count: c })));
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchWordStats();
    }
  }, [isAdmin]);

  // Toggle admin role
  const toggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    try {
      if (currentIsAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');
        
        if (error) throw error;
        toast.success('已移除管理员权限');
      } else {
        // Add admin role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });
        
        if (error) throw error;
        toast.success('已授予管理员权限');
      }
      fetchUsers();
    } catch (err) {
      console.error('Error toggling admin:', err);
      toast.error('操作失败');
    }
  };

  // Update user grade
  const updateUserGrade = async (profileId: string, newGrade: number) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ grade: newGrade })
        .eq('id', profileId);
      
      if (error) throw error;
      toast.success(`已更新年级为${newGrade}年级`);
      fetchUsers();
    } catch (err) {
      console.error('Error updating grade:', err);
      toast.error('更新年级失败');
    }
  };

  // 解析文本格式: "word - meaning" 每行一个
  const parseText = () => {
    const lines = rawText.split('\n').filter(line => line.trim());
    const words: ParsedWord[] = [];
    
    for (const line of lines) {
      // 支持多种分隔符: " - ", " – ", " — ", "\t"
      const match = line.match(/^(.+?)\s*[-–—]\s*(.+)$/) || line.split('\t');
      
      if (Array.isArray(match) && match.length >= 2) {
        const word = typeof match === 'object' && 'groups' in match ? match[1] : match[0];
        const meaning = typeof match === 'object' && 'groups' in match ? match[2] : match[1];
        
        if (word && meaning) {
          words.push({
            word: word.trim(),
            meaning: meaning.trim()
          });
        }
      } else if (line.includes('-')) {
        const parts = line.split('-');
        if (parts.length >= 2) {
          words.push({
            word: parts[0].trim(),
            meaning: parts.slice(1).join('-').trim()
          });
        }
      }
    }
    
    setParsedWords(words);
    if (words.length > 0) {
      toast.success(`成功解析 ${words.length} 个单词`);
    } else {
      toast.error('未能解析任何单词，请检查格式');
    }
  };

  const importWords = async () => {
    if (parsedWords.length === 0) {
      toast.error('请先解析单词');
      return;
    }

    setImporting(true);
    try {
      const wordsToInsert = parsedWords.map(w => ({
        word: w.word,
        meaning: w.meaning,
        grade: parseInt(grade),
        unit: parseInt(unit),
        difficulty: parseInt(difficulty)
      }));

      // 分批插入，每批100个
      const batchSize = 100;
      let successCount = 0;
      
      for (let i = 0; i < wordsToInsert.length; i += batchSize) {
        const batch = wordsToInsert.slice(i, i + batchSize);
        const { error } = await supabase.from('words').insert(batch);
        
        if (error) {
          console.error('Batch insert error:', error);
          toast.error(`批次 ${Math.floor(i / batchSize) + 1} 导入失败: ${error.message}`);
        } else {
          successCount += batch.length;
        }
      }

      toast.success(`成功导入 ${successCount} 个单词`);
      setRawText('');
      setParsedWords([]);
      fetchWordStats();
    } catch (err) {
      console.error('Import error:', err);
      toast.error('导入失败');
    } finally {
      setImporting(false);
    }
  };

  const clearParsed = () => {
    setParsedWords([]);
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 mx-auto text-destructive mb-4" />
            <p className="text-muted-foreground mb-4">您没有管理员权限</p>
            <Button variant="outline" onClick={() => navigate('/')}>
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-gaming text-glow-purple flex items-center gap-2">
              <Crown className="w-6 h-6 text-accent" />
              超级管理员后台
            </h1>
            <p className="text-muted-foreground text-sm">管理用户和词汇数据</p>
          </div>
          <div className="flex gap-2">
            {wordStats.map(stat => (
              <Badge key={stat.grade} variant="outline">
                {stat.grade}年级: {stat.count}词
              </Badge>
            ))}
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              用户管理
            </TabsTrigger>
            <TabsTrigger value="words" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              词汇导入
            </TabsTrigger>
            <TabsTrigger value="rewards" className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              奖励发放
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  用户列表
                </CardTitle>
                <CardDescription>
                  共 {users.length} 个注册用户
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="text-center py-8 text-muted-foreground">加载中...</div>
                ) : (
                  <div className="space-y-2">
                    {users.map((u) => (
                      <div 
                        key={u.id}
                        className="flex items-center justify-between py-3 px-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            {u.isAdmin ? (
                              <Crown className="w-5 h-5 text-accent" />
                            ) : (
                              <User className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{u.username}</span>
                              {u.isAdmin && (
                                <Badge className="bg-accent text-accent-foreground">管理员</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Lv.{u.level} · {u.rank_tier}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Grade Selector */}
                          <Select 
                            value={u.grade.toString()} 
                            onValueChange={(value) => updateUserGrade(u.id, parseInt(value))}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="7">7年级</SelectItem>
                              <SelectItem value="8">8年级</SelectItem>
                              <SelectItem value="9">9年级</SelectItem>
                            </SelectContent>
                          </Select>
                          {u.user_id !== user?.id && (
                            <Button
                              variant={u.isAdmin ? "destructive" : "outline"}
                              size="sm"
                              onClick={() => toggleAdmin(u.user_id, !!u.isAdmin)}
                            >
                              {u.isAdmin ? '移除管理员' : '设为管理员'}
                            </Button>
                          )}
                          {u.user_id === user?.id && (
                            <Badge variant="outline">当前用户</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Words Tab */}
          <TabsContent value="words">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  批量导入单词
                </CardTitle>
                <CardDescription>
                  每行一个单词，格式：word - 释义
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Settings */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">年级</label>
                    <Select value={grade} onValueChange={setGrade}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7年级</SelectItem>
                        <SelectItem value="8">8年级</SelectItem>
                        <SelectItem value="9">9年级</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">单元</label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="20"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">难度</label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">简单</SelectItem>
                        <SelectItem value="2">中等</SelectItem>
                        <SelectItem value="3">困难</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Text Input */}
                <Textarea
                  placeholder={`粘贴单词列表，每行一个，格式如下：
ability - 能力
above - 在……上方
abstract - 抽象的`}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button onClick={parseText} disabled={!rawText.trim()}>
                    <FileText className="w-4 h-4 mr-2" />
                    解析文本
                  </Button>
                  {parsedWords.length > 0 && (
                    <>
                      <Button 
                        variant="default" 
                        onClick={importWords}
                        disabled={importing}
                        className="bg-success hover:bg-success/90"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {importing ? '导入中...' : `导入 ${parsedWords.length} 个单词`}
                      </Button>
                      <Button variant="outline" onClick={clearParsed}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        清空
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            {parsedWords.length > 0 && (
              <Card className="card-glow mt-6">
                <CardHeader>
                  <CardTitle>预览 ({parsedWords.length} 个单词)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[400px] overflow-y-auto space-y-1">
                    {parsedWords.map((word, index) => (
                      <div 
                        key={index}
                        className="flex justify-between items-center py-2 px-3 rounded-lg bg-secondary/50 hover:bg-secondary"
                      >
                        <span className="font-medium text-foreground">{word.word}</span>
                        <span className="text-muted-foreground">{word.meaning}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-accent" />
                  排行榜名片发放
                </CardTitle>
                <CardDescription>
                  自动给各排行榜前10名发放专属名片
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-white">
                    <CardContent className="p-4">
                      <div className="font-gaming text-lg">狄邦财富大亨</div>
                      <div className="text-sm opacity-80">狄邦豆排行榜前10名</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 text-white">
                    <CardContent className="p-4">
                      <div className="font-gaming text-lg">狄邦排位大师</div>
                      <div className="text-sm opacity-80">排位胜利排行榜前10名</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-white">
                    <CardContent className="p-4">
                      <div className="font-gaming text-lg">狄邦至高巅峰</div>
                      <div className="text-sm opacity-80">经验值排行榜前10名</div>
                    </CardContent>
                  </Card>
                </div>
                
                <Button 
                  onClick={async () => {
                    setAwardingCards(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('award-leaderboard-cards');
                      if (error) throw error;
                      toast.success(data.message || '名片发放成功');
                    } catch (err) {
                      console.error('Award cards error:', err);
                      toast.error('发放失败');
                    } finally {
                      setAwardingCards(false);
                    }
                  }}
                  disabled={awardingCards}
                  className="w-full"
                  size="lg"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${awardingCards ? 'animate-spin' : ''}`} />
                  {awardingCards ? '发放中...' : '立即发放排行榜名片'}
                </Button>
                
                <p className="text-sm text-muted-foreground text-center">
                  点击后将自动给7年级和8年级各排行榜前10名发放对应名片
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
