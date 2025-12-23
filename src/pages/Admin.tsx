import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminRole } from '@/hooks/useAdminRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Upload, FileText, Trash2, Shield } from 'lucide-react';

interface ParsedWord {
  word: string;
  meaning: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole();
  
  const [rawText, setRawText] = useState('');
  const [grade, setGrade] = useState('8');
  const [unit, setUnit] = useState('1');
  const [difficulty, setDifficulty] = useState('1');
  const [parsedWords, setParsedWords] = useState<ParsedWord[]>([]);
  const [importing, setImporting] = useState(false);

  const loading = authLoading || roleLoading;

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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-gaming text-glow-purple">管理员后台</h1>
            <p className="text-muted-foreground text-sm">批量导入词汇数据</p>
          </div>
        </div>

        {/* Import Section */}
        <Card className="card-glow mb-6">
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
          <Card className="card-glow">
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
      </div>
    </div>
  );
}
