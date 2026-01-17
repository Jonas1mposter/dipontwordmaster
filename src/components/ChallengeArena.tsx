import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Users, 
  GraduationCap, 
  Crown, 
  Medal, 
  Award,
  Coins,
  TrendingUp,
  Target,
  BookOpen,
  Sparkles,
  Gift,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClassChallengeData {
  id: string;
  class_name: string;
  total_xp: number;
  total_correct: number;
  total_answered: number;
  total_levels_completed: number;
  member_count: number;
  composite_score: number;
  rank_position: number | null;
}

interface GradeChallengeData {
  id: string;
  grade: number;
  total_xp: number;
  total_correct: number;
  total_answered: number;
  total_levels_completed: number;
  member_count: number;
  composite_score: number;
  rank_position: number | null;
}

interface SeasonData {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface ChallengeReward {
  id: string;
  reward_type: string;
  reward_value: number;
  challenge_type: string;
  rank_achieved: number | null;
  claimed: boolean;
}

interface ChallengeArenaProps {
  grade: number;
  currentClass?: string | null;
  profileId?: string;
}

const ChallengeArena = ({ grade, currentClass, profileId }: ChallengeArenaProps) => {
  const [activeTab, setActiveTab] = useState("class");
  const [classChallenges, setClassChallenges] = useState<ClassChallengeData[]>([]);
  const [gradeChallenges, setGradeChallenges] = useState<GradeChallengeData[]>([]);
  const [activeSeason, setActiveSeason] = useState<SeasonData | null>(null);
  const [rewards, setRewards] = useState<ChallengeReward[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChallengeData();
  }, [grade, profileId]);

  const fetchChallengeData = async () => {
    setLoading(true);
    try {
      // Fetch active season
      const { data: seasonData } = await supabase
        .from("seasons")
        .select("*")
        .eq("grade", grade)
        .eq("is_active", true)
        .maybeSingle();

      if (seasonData) {
        setActiveSeason(seasonData);

        // Fetch class challenges
        const { data: classData } = await supabase
          .from("class_challenges")
          .select("*")
          .eq("season_id", seasonData.id)
          .eq("grade", grade)
          .order("composite_score", { ascending: false });

        if (classData) {
          setClassChallenges(classData);
        }

        // Fetch grade challenges
        const { data: gradeData } = await supabase
          .from("grade_challenges")
          .select("*")
          .eq("season_id", seasonData.id)
          .order("composite_score", { ascending: false });

        if (gradeData) {
          setGradeChallenges(gradeData);
        }

        // Fetch user rewards
        if (profileId) {
          const { data: rewardData } = await supabase
            .from("challenge_rewards")
            .select("*")
            .eq("season_id", seasonData.id)
            .eq("profile_id", profileId);

          if (rewardData) {
            setRewards(rewardData);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching challenge data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStats = async () => {
    setRefreshing(true);
    try {
      const response = await supabase.functions.invoke('update-challenge-stats');
      
      if (response.error) {
        throw response.error;
      }
      
      toast.success("排名数据已更新！");
      await fetchChallengeData();
    } catch (error) {
      console.error("Error refreshing stats:", error);
      toast.error("更新排名失败，请稍后重试");
    } finally {
      setRefreshing(false);
    }
  };

  const claimReward = async (rewardId: string) => {
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward || !profileId) return;

    try {
      // Mark as claimed
      await supabase
        .from("challenge_rewards")
        .update({ claimed: true })
        .eq("id", rewardId);

      // Apply reward based on type
      if (reward.reward_type === "coins") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("coins")
          .eq("id", profileId)
          .single();

        if (profile) {
          await supabase
            .from("profiles")
            .update({ coins: profile.coins + reward.reward_value })
            .eq("id", profileId);
        }
      }

      toast.success(`成功领取 ${reward.reward_value} ${reward.reward_type === 'coins' ? '狄邦豆' : '点奖励'}！`);
      fetchChallengeData();
    } catch (error) {
      console.error("Error claiming reward:", error);
      toast.error("领取奖励失败");
    }
  };

  const getRankIcon = (rank: number | null) => {
    if (!rank) return null;
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankStyle = (rank: number | null) => {
    if (!rank) return "";
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-yellow-500/20 border-yellow-500/50";
      case 2:
        return "bg-gradient-to-r from-gray-400/20 via-gray-300/10 to-gray-400/20 border-gray-400/50";
      case 3:
        return "bg-gradient-to-r from-amber-600/20 via-orange-500/10 to-amber-600/20 border-amber-600/50";
      default:
        return "";
    }
  };

  const getAccuracyPercent = (correct: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  };

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + "万";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "千";
    }
    return num.toString();
  };

  const getSeasonProgress = () => {
    if (!activeSeason) return 0;
    const start = new Date(activeSeason.start_date).getTime();
    const end = new Date(activeSeason.end_date).getTime();
    const now = Date.now();
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  };

  const getDaysRemaining = () => {
    if (!activeSeason) return 0;
    const end = new Date(activeSeason.end_date).getTime();
    const now = Date.now();
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  };

  const renderClassChallenge = () => {
    const myClass = classChallenges.find(c => c.class_name === currentClass);

    return (
      <div className="space-y-4">
        {/* My Class Card */}
        {myClass && (
          <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">我的班级 - {currentClass}班</CardTitle>
                </div>
                {getRankIcon(myClass.rank_position)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <TrendingUp className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                  <p className="text-xl font-bold">{formatNumber(myClass.total_xp)}</p>
                  <p className="text-xs text-muted-foreground">总经验值</p>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <Target className="w-5 h-5 mx-auto mb-1 text-green-500" />
                  <p className="text-xl font-bold">{getAccuracyPercent(myClass.total_correct, myClass.total_answered)}%</p>
                  <p className="text-xs text-muted-foreground">正确率</p>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <BookOpen className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                  <p className="text-xl font-bold">{myClass.total_levels_completed}</p>
                  <p className="text-xs text-muted-foreground">完成关卡</p>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <Sparkles className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                  <p className="text-xl font-bold">{myClass.composite_score.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">综合积分</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Class Rankings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              班级排行榜
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {classChallenges.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">暂无挑战赛数据</p>
            ) : (
              classChallenges.map((classItem, index) => (
                <div
                  key={classItem.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                    classItem.class_name === currentClass && "ring-2 ring-primary",
                    getRankStyle(index + 1)
                  )}
                >
                  <div className="w-10 flex justify-center">
                    {getRankIcon(index + 1)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{classItem.class_name}班</span>
                      <Badge variant="secondary" className="text-xs">
                        {classItem.member_count}人
                      </Badge>
                      {classItem.class_name === currentClass && (
                        <Badge variant="default" className="text-xs">我的班级</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span>XP: {formatNumber(classItem.total_xp)}</span>
                      <span>正确率: {getAccuracyPercent(classItem.total_correct, classItem.total_answered)}%</span>
                      <span>关卡: {classItem.total_levels_completed}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{classItem.composite_score.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">综合积分</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderGradeChallenge = () => {
    const myGrade = gradeChallenges.find(g => g.grade === grade);

    return (
      <div className="space-y-4">
        {/* My Grade Card */}
        {myGrade && (
          <Card className="border-2 border-secondary/50 bg-gradient-to-br from-secondary/10 to-secondary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-secondary-foreground" />
                  <CardTitle className="text-lg">
                    {grade === 7 ? "七年级" : "八年级"}专区
                  </CardTitle>
                </div>
                {getRankIcon(myGrade.rank_position)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <TrendingUp className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                  <p className="text-xl font-bold">{formatNumber(myGrade.total_xp)}</p>
                  <p className="text-xs text-muted-foreground">总经验值</p>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <Target className="w-5 h-5 mx-auto mb-1 text-green-500" />
                  <p className="text-xl font-bold">{getAccuracyPercent(myGrade.total_correct, myGrade.total_answered)}%</p>
                  <p className="text-xs text-muted-foreground">正确率</p>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <BookOpen className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                  <p className="text-xl font-bold">{myGrade.total_levels_completed}</p>
                  <p className="text-xs text-muted-foreground">完成关卡</p>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <Users className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                  <p className="text-xl font-bold">{myGrade.member_count}</p>
                  <p className="text-xs text-muted-foreground">参与人数</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grade Rankings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              年级排行榜
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {gradeChallenges.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">暂无挑战赛数据</p>
            ) : (
              gradeChallenges.map((gradeItem, index) => (
                <div
                  key={gradeItem.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                    gradeItem.grade === grade && "ring-2 ring-primary",
                    getRankStyle(index + 1)
                  )}
                >
                  <div className="w-10 flex justify-center">
                    {getRankIcon(index + 1)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {gradeItem.grade === 7 ? "七年级" : "八年级"}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {gradeItem.member_count}人
                      </Badge>
                      {gradeItem.grade === grade && (
                        <Badge variant="default" className="text-xs">我的年级</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span>XP: {formatNumber(gradeItem.total_xp)}</span>
                      <span>正确率: {getAccuracyPercent(gradeItem.total_correct, gradeItem.total_answered)}%</span>
                      <span>关卡: {gradeItem.total_levels_completed}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{gradeItem.composite_score.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">综合积分</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderRewards = () => {
    const unclaimedRewards = rewards.filter(r => !r.claimed);
    const claimedRewards = rewards.filter(r => r.claimed);

    return (
      <div className="space-y-4">
        {/* Unclaimed Rewards */}
        {unclaimedRewards.length > 0 && (
          <Card className="border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-500" />
                待领取奖励
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {unclaimedRewards.map(reward => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between p-3 bg-background/50 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {reward.reward_type === "coins" && <Coins className="w-6 h-6 text-yellow-500" />}
                    {reward.reward_type === "xp_boost" && <TrendingUp className="w-6 h-6 text-blue-500" />}
                    {reward.reward_type === "badge" && <Award className="w-6 h-6 text-purple-500" />}
                    <div>
                      <p className="font-semibold">
                        {reward.challenge_type === "class" ? "班级挑战赛" : "年级挑战赛"}
                        {reward.rank_achieved && ` 第${reward.rank_achieved}名`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {reward.reward_type === "coins" && `${reward.reward_value} 狄邦豆`}
                        {reward.reward_type === "xp_boost" && `${reward.reward_value}% 经验加成`}
                        {reward.reward_type === "badge" && "专属徽章"}
                      </p>
                    </div>
                  </div>
                  <Button onClick={() => claimReward(reward.id)} size="sm">
                    领取
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Claimed Rewards */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              已获得奖励
            </CardTitle>
          </CardHeader>
          <CardContent>
            {claimedRewards.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                暂无已领取的奖励，参与挑战赛赢取丰厚奖励！
              </p>
            ) : (
              <div className="space-y-2">
                {claimedRewards.map(reward => (
                  <div
                    key={reward.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    {reward.reward_type === "coins" && <Coins className="w-5 h-5 text-yellow-500" />}
                    {reward.reward_type === "xp_boost" && <TrendingUp className="w-5 h-5 text-blue-500" />}
                    {reward.reward_type === "badge" && <Award className="w-5 h-5 text-purple-500" />}
                    <div className="flex-1">
                      <p className="text-sm">
                        {reward.challenge_type === "class" ? "班级挑战赛" : "年级挑战赛"}
                        {reward.rank_achieved && ` 第${reward.rank_achieved}名`}
                      </p>
                    </div>
                    <Badge variant="outline">已领取</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Season Info */}
      {activeSeason && (
        <Card className="bg-gradient-to-r from-primary/10 via-background to-secondary/10">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                <span className="font-semibold">{activeSeason.name}</span>
              </div>
              <Badge variant="secondary">{getDaysRemaining()}天后结束</Badge>
            </div>
            <Progress value={getSeasonProgress()} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1 text-center">
              赛季进度 {getSeasonProgress().toFixed(0)}%
            </p>
          </CardContent>
        </Card>
      )}

      {/* Challenge Tabs */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" />
              挑战赛
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshStats}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              {refreshing ? "更新中..." : "刷新排名"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="class" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">班级挑战</span>
              </TabsTrigger>
              <TabsTrigger value="grade" className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                <span className="hidden sm:inline">年级挑战</span>
              </TabsTrigger>
              <TabsTrigger value="rewards" className="flex items-center gap-2">
                <Gift className="w-4 h-4" />
                <span className="hidden sm:inline">我的奖励</span>
                {rewards.filter(r => !r.claimed).length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {rewards.filter(r => !r.claimed).length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="class">
              {renderClassChallenge()}
            </TabsContent>

            <TabsContent value="grade">
              {renderGradeChallenge()}
            </TabsContent>

            <TabsContent value="rewards">
              {renderRewards()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChallengeArena;
