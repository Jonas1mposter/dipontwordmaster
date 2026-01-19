import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Users, Crown, Trophy, Plus, Search, LogOut, 
  Shield, Star, Coins, Zap, Target, Gift,
  ChevronLeft, Loader2, UserPlus, Medal, Swords,
  TrendingUp, Award, Sparkles
} from "lucide-react";

interface Team {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  leader_id: string | null;
  member_count: number;
  total_xp: number;
  total_wins: number;
  rank_position: number | null;
}

interface TeamMember {
  id: string;
  profile_id: string;
  role: string;
  joined_at: string;
  contributed_xp: number;
  contributed_wins: number;
  profile: {
    username: string;
    avatar_url: string | null;
    level: number;
  };
}

interface TeamMilestone {
  id: string;
  name: string;
  description: string | null;
  target_type: string;
  target_value: number;
  reward_type: string;
  reward_value: number;
  display_order: number;
}

interface TeamSeasonStats {
  total_xp: number;
  total_wins: number;
  total_battles: number;
  accuracy_rate: number;
  rank_position: number | null;
}

interface TeamBattle {
  id: string;
  team1_id: string;
  team2_id: string;
  team1_score: number;
  team2_score: number;
  team1_wins: number;
  team2_wins: number;
  status: string;
  winner_team_id: string | null;
  created_at: string;
  team1?: Team;
  team2?: Team;
}

interface TeamPanelProps {
  onBack: () => void;
}

const CREATE_TEAM_COST = 1000;

export function TeamPanel({ onBack }: TeamPanelProps) {
  const { profile, refreshProfile } = useAuth();
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [seasonStats, setSeasonStats] = useState<TeamSeasonStats | null>(null);
  const [milestones, setMilestones] = useState<TeamMilestone[]>([]);
  const [claimedMilestones, setClaimedMilestones] = useState<string[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [teamBattles, setTeamBattles] = useState<TeamBattle[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("team");
  const [hasChampionCard, setHasChampionCard] = useState(false);
  
  // Create team dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  // Join team dialog
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  
  // Challenge team dialog
  const [showChallengeDialog, setShowChallengeDialog] = useState(false);
  const [challengeTeam, setChallengeTeam] = useState<Team | null>(null);
  const [isChallenging, setIsChallenging] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    setIsLoading(true);
    
    try {
      // Check if user is in a team
      const { data: memberData } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("profile_id", profile.id)
        .single();
      
      if (memberData?.team_id) {
        // Fetch team details
        const { data: teamData } = await supabase
          .from("teams")
          .select("*")
          .eq("id", memberData.team_id)
          .single();
        
        if (teamData) {
          setMyTeam(teamData);
          
          // Fetch team members with contributions
          const { data: members } = await supabase
            .from("team_members")
            .select(`
              id, profile_id, role, joined_at, contributed_xp, contributed_wins,
              profile:profiles(username, avatar_url, level)
            `)
            .eq("team_id", teamData.id)
            .order("role", { ascending: true })
            .order("contributed_xp", { ascending: false });
          
          if (members) {
            setTeamMembers(members as any);
          }
          
          // Check if team is rank 1 and user has champion card
          if (teamData.rank_position === 1) {
            const { data: championCard } = await supabase
              .from("name_cards")
              .select("id")
              .eq("name", "冠军战队")
              .single();
            
            if (championCard) {
              const { data: userCard } = await supabase
                .from("user_name_cards")
                .select("id")
                .eq("profile_id", profile.id)
                .eq("name_card_id", championCard.id)
                .single();
              
              setHasChampionCard(!!userCard);
            }
          }
          
          // Fetch season stats
          const { data: activeSeason } = await supabase
            .from("seasons")
            .select("id")
            .eq("is_active", true)
            .single();
          
          if (activeSeason) {
            const { data: stats } = await supabase
              .from("team_season_stats")
              .select("*")
              .eq("team_id", teamData.id)
              .eq("season_id", activeSeason.id)
              .single();
            
            if (stats) {
              setSeasonStats(stats);
            }
            
            // Fetch milestones
            const { data: milestonesData } = await supabase
              .from("team_milestones")
              .select("*")
              .eq("season_id", activeSeason.id)
              .order("display_order");
            
            if (milestonesData) {
              setMilestones(milestonesData);
            }
            
            // Fetch claimed milestones
            const { data: claims } = await supabase
              .from("team_milestone_claims")
              .select("milestone_id")
              .eq("team_id", teamData.id);
            
            if (claims) {
              setClaimedMilestones(claims.map(c => c.milestone_id));
            }
            
            // Fetch team battles
            const { data: battles } = await supabase
              .from("team_battles")
              .select("*")
              .or(`team1_id.eq.${teamData.id},team2_id.eq.${teamData.id}`)
              .eq("season_id", activeSeason.id)
              .order("created_at", { ascending: false })
              .limit(20);
            
            if (battles) {
              setTeamBattles(battles);
            }
          }
        }
      }
      
      // Fetch all teams for browsing
      const { data: teamsData } = await supabase
        .from("teams")
        .select("*")
        .order("rank_position", { ascending: true, nullsFirst: false })
        .order("total_xp", { ascending: false })
        .limit(50);
      
      if (teamsData) {
        setAllTeams(teamsData);
      }
    } catch (error) {
      console.error("Error fetching team data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!profile || !newTeamName.trim()) return;
    
    if ((profile.coins || 0) < CREATE_TEAM_COST) {
      toast.error(`创建战队需要 ${CREATE_TEAM_COST} 狄邦豆`);
      return;
    }
    
    setIsCreating(true);
    try {
      // Create team first
      const { data: newTeam, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: newTeamName.trim(),
          description: newTeamDescription.trim() || null,
          leader_id: profile.id,
          member_count: 1
        })
        .select()
        .single();
      
      if (teamError) throw teamError;
      
      // Add self as leader
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: newTeam.id,
          profile_id: profile.id,
          role: "leader"
        });
      
      if (memberError) {
        // Rollback team creation
        await supabase.from("teams").delete().eq("id", newTeam.id);
        throw memberError;
      }
      
      // Deduct coins after successful creation
      const { error: coinsError } = await supabase
        .from("profiles")
        .update({ coins: (profile.coins || 0) - CREATE_TEAM_COST })
        .eq("id", profile.id);
      
      if (coinsError) {
        console.error("Failed to deduct coins:", coinsError);
      }
      
      toast.success("战队创建成功！");
      setShowCreateDialog(false);
      setNewTeamName("");
      setNewTeamDescription("");
      refreshProfile();
      fetchData();
    } catch (error: any) {
      console.error("Error creating team:", error);
      if (error.code === "23505") {
        toast.error("战队名称已存在");
      } else {
        toast.error("创建战队失败");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!profile || !selectedTeam) return;
    
    setIsJoining(true);
    try {
      const { error } = await supabase
        .from("team_members")
        .insert({
          team_id: selectedTeam.id,
          profile_id: profile.id,
          role: "member"
        });
      
      if (error) throw error;
      
      toast.success(`成功加入 ${selectedTeam.name}！`);
      setShowJoinDialog(false);
      setSelectedTeam(null);
      fetchData();
    } catch (error: any) {
      console.error("Error joining team:", error);
      if (error.code === "23505") {
        toast.error("你已经在其他战队中");
      } else {
        toast.error("加入战队失败");
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (!profile || !myTeam) return;
    
    // Check if user is leader
    if (myTeam.leader_id === profile.id && teamMembers.length > 1) {
      toast.error("队长离队前需要转让队长职位");
      return;
    }
    
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("profile_id", profile.id);
      
      if (error) throw error;
      
      // If only member, delete team
      if (teamMembers.length === 1) {
        await supabase.from("teams").delete().eq("id", myTeam.id);
      }
      
      toast.success("已离开战队");
      setMyTeam(null);
      setTeamMembers([]);
      fetchData();
    } catch (error) {
      console.error("Error leaving team:", error);
      toast.error("离开战队失败");
    }
  };

  const handleClaimMilestone = async (milestone: TeamMilestone) => {
    if (!profile || !myTeam) return;
    
    try {
      // Insert claim record
      const { error: claimError } = await supabase
        .from("team_milestone_claims")
        .insert({
          team_id: myTeam.id,
          milestone_id: milestone.id,
          claimed_by: profile.id
        });
      
      if (claimError) throw claimError;
      
      // Award reward to all team members
      if (milestone.reward_type === "coins") {
        const memberIds = teamMembers.map(m => m.profile_id);
        for (const memberId of memberIds) {
          const { data: memberProfile } = await supabase
            .from("profiles")
            .select("coins")
            .eq("id", memberId)
            .single();
          
          if (memberProfile) {
            await supabase
              .from("profiles")
              .update({ coins: (memberProfile.coins || 0) + milestone.reward_value })
              .eq("id", memberId);
          }
        }
      } else if (milestone.reward_type === "xp") {
        const memberIds = teamMembers.map(m => m.profile_id);
        for (const memberId of memberIds) {
          const { data: memberProfile } = await supabase
            .from("profiles")
            .select("xp")
            .eq("id", memberId)
            .single();
          
          if (memberProfile) {
            await supabase
              .from("profiles")
              .update({ xp: (memberProfile.xp || 0) + milestone.reward_value })
              .eq("id", memberId);
          }
        }
      }
      
      toast.success(`领取成功！全队获得 ${milestone.reward_value} ${milestone.reward_type === "coins" ? "狄邦豆" : "经验值"}`);
      setClaimedMilestones(prev => [...prev, milestone.id]);
      refreshProfile();
    } catch (error: any) {
      console.error("Error claiming milestone:", error);
      if (error.code === "23505") {
        toast.error("该奖励已被领取");
      } else {
        toast.error("领取失败");
      }
    }
  };

  const handleChallengeTeam = async () => {
    if (!profile || !myTeam || !challengeTeam) return;
    
    // Check if user is leader
    if (myTeam.leader_id !== profile.id) {
      toast.error("只有队长可以发起战队挑战");
      return;
    }
    
    setIsChallenging(true);
    try {
      const { data: activeSeason } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_active", true)
        .single();
      
      if (!activeSeason) {
        toast.error("当前没有活跃赛季");
        return;
      }
      
      const { error } = await supabase
        .from("team_battles")
        .insert({
          season_id: activeSeason.id,
          team1_id: myTeam.id,
          team2_id: challengeTeam.id,
          status: "pending"
        });
      
      if (error) throw error;
      
      toast.success(`已向「${challengeTeam.name}」发起挑战！`);
      setShowChallengeDialog(false);
      setChallengeTeam(null);
      fetchData();
    } catch (error) {
      console.error("Error challenging team:", error);
      toast.error("发起挑战失败");
    } finally {
      setIsChallenging(false);
    }
  };

  const handleClaimChampionCard = async () => {
    if (!profile || !myTeam || myTeam.rank_position !== 1) return;
    
    try {
      const { data: championCard } = await supabase
        .from("name_cards")
        .select("id")
        .eq("name", "冠军战队")
        .single();
      
      if (!championCard) {
        toast.error("名片不存在");
        return;
      }
      
      const { error } = await supabase
        .from("user_name_cards")
        .insert({
          profile_id: profile.id,
          name_card_id: championCard.id,
          rank_position: 1
        });
      
      if (error) {
        if (error.code === "23505") {
          toast.error("你已经拥有此名片");
        } else {
          throw error;
        }
        return;
      }
      
      toast.success("恭喜获得「冠军战队」专属名片！");
      setHasChampionCard(true);
    } catch (error) {
      console.error("Error claiming champion card:", error);
      toast.error("领取名片失败");
    }
  };

  const getMilestoneProgress = (milestone: TeamMilestone): number => {
    if (!seasonStats) return 0;
    
    let current = 0;
    switch (milestone.target_type) {
      case "xp":
        current = seasonStats.total_xp;
        break;
      case "wins":
        current = seasonStats.total_wins;
        break;
      case "battles":
        current = seasonStats.total_battles;
        break;
      case "accuracy":
        current = seasonStats.accuracy_rate;
        break;
    }
    
    return Math.min((current / milestone.target_value) * 100, 100);
  };

  const filteredTeams = allTeams.filter(team => 
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort members by contributions for leaderboard
  const sortedByXP = [...teamMembers].sort((a, b) => b.contributed_xp - a.contributed_xp);
  const sortedByWins = [...teamMembers].sort((a, b) => b.contributed_wins - a.contributed_wins);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // No team - show join/create options
  if (!myTeam) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-gaming text-2xl">战队系统</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="gaming-card cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setShowCreateDialog(true)}>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-gaming text-lg mb-2">创建战队</h3>
              <p className="text-sm text-muted-foreground mb-4">花费 {CREATE_TEAM_COST} 狄邦豆创建你的战队</p>
              <Badge variant="coin" className="gap-1">
                <Coins className="w-3 h-3" />
                {CREATE_TEAM_COST}
              </Badge>
            </CardContent>
          </Card>
          
          <Card className="gaming-card">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-neon-cyan/20 flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-neon-cyan" />
              </div>
              <h3 className="font-gaming text-lg mb-2">加入战队</h3>
              <p className="text-sm text-muted-foreground">搜索并加入现有战队</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Team List */}
        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              战队排行榜
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索战队..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredTeams.map((team, index) => (
                  <div
                    key={team.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedTeam(team);
                      setShowJoinDialog(true);
                    }}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-white">
                      {team.rank_position || index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{team.name}</span>
                        {team.rank_position === 1 && (
                          <Crown className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {team.member_count}人
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {team.total_xp.toLocaleString()} XP
                        </span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      加入
                    </Button>
                  </div>
                ))}
                {filteredTeams.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    未找到战队
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* Create Team Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建战队</DialogTitle>
              <DialogDescription>
                花费 {CREATE_TEAM_COST} 狄邦豆创建你的战队
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">战队名称</label>
                <Input
                  placeholder="输入战队名称"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  maxLength={20}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">战队简介（可选）</label>
                <Textarea
                  placeholder="介绍你的战队..."
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  maxLength={100}
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm">创建费用</span>
                <Badge variant="coin" className="gap-1">
                  <Coins className="w-3 h-3" />
                  {CREATE_TEAM_COST}
                </Badge>
              </div>
              {(profile?.coins || 0) < CREATE_TEAM_COST && (
                <p className="text-sm text-destructive">
                  狄邦豆不足，当前：{profile?.coins || 0}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                取消
              </Button>
              <Button 
                onClick={handleCreateTeam} 
                disabled={!newTeamName.trim() || (profile?.coins || 0) < CREATE_TEAM_COST || isCreating}
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                创建战队
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Join Team Dialog */}
        <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>加入战队</DialogTitle>
              <DialogDescription>
                确定要加入「{selectedTeam?.name}」吗？
              </DialogDescription>
            </DialogHeader>
            {selectedTeam && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted">
                  <h4 className="font-medium mb-2">{selectedTeam.name}</h4>
                  {selectedTeam.description && (
                    <p className="text-sm text-muted-foreground mb-3">{selectedTeam.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {selectedTeam.member_count}人
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="w-4 h-4" />
                      {selectedTeam.total_xp.toLocaleString()} XP
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="w-4 h-4" />
                      {selectedTeam.total_wins}胜
                    </span>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
                取消
              </Button>
              <Button onClick={handleJoinTeam} disabled={isJoining}>
                {isJoining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                确认加入
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Has team - show team details
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-gaming text-2xl">{myTeam.name}</h2>
            {myTeam.rank_position === 1 && (
              <Badge variant="champion" className="gap-1">
                <Crown className="w-3 h-3" />
                第一战队
              </Badge>
            )}
          </div>
          {myTeam.description && (
            <p className="text-sm text-muted-foreground">{myTeam.description}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleLeaveTeam}>
          <LogOut className="w-4 h-4 mr-2" />
          离队
        </Button>
      </div>
      
      {/* Champion Card Claim Banner */}
      {myTeam.rank_position === 1 && !hasChampionCard && (
        <Card className="gaming-card bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-gaming text-lg">🏆 恭喜！你的战队排名第一</h4>
                <p className="text-sm text-muted-foreground">领取专属「冠军战队」名片</p>
              </div>
            </div>
            <Button onClick={handleClaimChampionCard} className="bg-gradient-to-r from-yellow-500 to-orange-500">
              <Sparkles className="w-4 h-4 mr-2" />
              领取名片
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Team Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="gaming-card">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{myTeam.member_count}</p>
            <p className="text-xs text-muted-foreground">成员</p>
          </CardContent>
        </Card>
        <Card className="gaming-card">
          <CardContent className="p-4 text-center">
            <Zap className="w-6 h-6 mx-auto mb-2 text-accent" />
            <p className="text-2xl font-bold">{myTeam.total_xp.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">总经验</p>
          </CardContent>
        </Card>
        <Card className="gaming-card">
          <CardContent className="p-4 text-center">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{myTeam.total_wins}</p>
            <p className="text-xs text-muted-foreground">胜场</p>
          </CardContent>
        </Card>
        <Card className="gaming-card">
          <CardContent className="p-4 text-center">
            <Medal className="w-6 h-6 mx-auto mb-2 text-neon-cyan" />
            <p className="text-2xl font-bold">#{myTeam.rank_position || "-"}</p>
            <p className="text-xs text-muted-foreground">排名</p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="team" className="flex-1">成员</TabsTrigger>
          <TabsTrigger value="contributions" className="flex-1">贡献榜</TabsTrigger>
          <TabsTrigger value="battles" className="flex-1">战队战</TabsTrigger>
          <TabsTrigger value="milestones" className="flex-1">目标</TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex-1">排行</TabsTrigger>
        </TabsList>
        
        <TabsContent value="team" className="mt-4">
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                战队成员 ({teamMembers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-background/50"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.profile?.username?.slice(0, 2) || "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{member.profile?.username}</span>
                          {member.role === "leader" && (
                            <Badge variant="champion" className="gap-1 text-xs">
                              <Crown className="w-3 h-3" />
                              队长
                            </Badge>
                          )}
                          {member.role === "officer" && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Shield className="w-3 h-3" />
                              副队长
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Lv.{member.profile?.level}</span>
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {member.contributed_xp.toLocaleString()} XP
                          </span>
                          <span className="flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            {member.contributed_wins}胜
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Contribution Leaderboard Tab */}
        <TabsContent value="contributions" className="mt-4 space-y-4">
          {/* XP Contribution Leaderboard */}
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                经验贡献榜
              </CardTitle>
              <CardDescription>成员对战队经验的贡献排名</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sortedByXP.slice(0, 10).map((member, index) => (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      index === 0 
                        ? "bg-yellow-500/20 border border-yellow-500/30" 
                        : index === 1 
                          ? "bg-gray-400/20 border border-gray-400/30"
                          : index === 2
                            ? "bg-amber-600/20 border border-amber-600/30"
                            : "bg-background/50"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 
                        ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white" 
                        : index === 1 
                          ? "bg-gradient-to-br from-gray-300 to-gray-500 text-white"
                          : index === 2
                            ? "bg-gradient-to-br from-amber-500 to-amber-700 text-white"
                            : "bg-muted text-muted-foreground"
                    }`}>
                      {index + 1}
                    </div>
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback>{member.profile?.username?.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate">{member.profile?.username}</span>
                    </div>
                    <Badge variant="outline" className="gap-1">
                      <Zap className="w-3 h-3 text-accent" />
                      {member.contributed_xp.toLocaleString()}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Wins Contribution Leaderboard */}
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                胜场贡献榜
              </CardTitle>
              <CardDescription>成员对战队胜场的贡献排名</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sortedByWins.slice(0, 10).map((member, index) => (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      index === 0 
                        ? "bg-yellow-500/20 border border-yellow-500/30" 
                        : index === 1 
                          ? "bg-gray-400/20 border border-gray-400/30"
                          : index === 2
                            ? "bg-amber-600/20 border border-amber-600/30"
                            : "bg-background/50"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 
                        ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white" 
                        : index === 1 
                          ? "bg-gradient-to-br from-gray-300 to-gray-500 text-white"
                          : index === 2
                            ? "bg-gradient-to-br from-amber-500 to-amber-700 text-white"
                            : "bg-muted text-muted-foreground"
                    }`}>
                      {index + 1}
                    </div>
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback>{member.profile?.username?.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate">{member.profile?.username}</span>
                    </div>
                    <Badge variant="outline" className="gap-1">
                      <Trophy className="w-3 h-3 text-yellow-500" />
                      {member.contributed_wins}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Team Battles Tab */}
        <TabsContent value="battles" className="mt-4 space-y-4">
          {myTeam.leader_id === profile?.id && (
            <Card className="gaming-card bg-gradient-to-r from-primary/20 to-accent/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Swords className="w-8 h-8 text-primary" />
                    <div>
                      <h4 className="font-gaming">发起战队挑战</h4>
                      <p className="text-sm text-muted-foreground">选择一个战队进行团队赛</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => {
                      const otherTeams = allTeams.filter(t => t.id !== myTeam.id);
                      if (otherTeams.length > 0) {
                        setChallengeTeam(otherTeams[0]);
                        setShowChallengeDialog(true);
                      } else {
                        toast.error("没有其他战队可以挑战");
                      }
                    }}
                  >
                    <Swords className="w-4 h-4 mr-2" />
                    发起挑战
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords className="w-5 h-5" />
                战队对战记录
              </CardTitle>
              <CardDescription>团队赛记录，所有成员战绩累计计入战队积分</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {teamBattles.length > 0 ? (
                  <div className="space-y-3">
                    {teamBattles.map((battle) => {
                      const isTeam1 = battle.team1_id === myTeam.id;
                      const opponentId = isTeam1 ? battle.team2_id : battle.team1_id;
                      const opponent = allTeams.find(t => t.id === opponentId);
                      const myScore = isTeam1 ? battle.team1_score : battle.team2_score;
                      const opponentScore = isTeam1 ? battle.team2_score : battle.team1_score;
                      const isWinner = battle.winner_team_id === myTeam.id;
                      
                      return (
                        <div
                          key={battle.id}
                          className={`p-4 rounded-lg border ${
                            battle.status === "completed"
                              ? isWinner
                                ? "bg-green-500/10 border-green-500/30"
                                : "bg-red-500/10 border-red-500/30"
                              : "bg-muted border-border"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-center">
                                <p className="font-gaming text-lg">{myTeam.name}</p>
                                <p className="text-2xl font-bold text-primary">{myScore}</p>
                              </div>
                              <div className="px-4">
                                <span className="text-muted-foreground font-gaming">VS</span>
                              </div>
                              <div className="text-center">
                                <p className="font-gaming text-lg">{opponent?.name || "未知战队"}</p>
                                <p className="text-2xl font-bold text-muted-foreground">{opponentScore}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              {battle.status === "pending" && (
                                <Badge variant="secondary">等待接受</Badge>
                              )}
                              {battle.status === "in_progress" && (
                                <Badge variant="outline" className="animate-pulse">进行中</Badge>
                              )}
                              {battle.status === "completed" && (
                                <Badge variant={isWinner ? "default" : "destructive"}>
                                  {isWinner ? "胜利" : "失败"}
                                </Badge>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(battle.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Swords className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">暂无战队对战记录</p>
                    <p className="text-sm text-muted-foreground">队长可以发起战队挑战</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="milestones" className="mt-4">
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                赛季目标
              </CardTitle>
              <CardDescription>
                完成目标后全队成员都可获得奖励
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {milestones.map((milestone) => {
                    const progress = getMilestoneProgress(milestone);
                    const isClaimed = claimedMilestones.includes(milestone.id);
                    const canClaim = progress >= 100 && !isClaimed;
                    
                    return (
                      <div
                        key={milestone.id}
                        className={`p-4 rounded-lg border ${
                          isClaimed 
                            ? "bg-primary/10 border-primary/30" 
                            : canClaim 
                              ? "bg-accent/10 border-accent/30 animate-pulse" 
                              : "bg-background/50 border-border/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{milestone.name}</span>
                              {isClaimed && (
                                <Badge variant="outline" className="text-xs">已领取</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {milestone.description}
                            </p>
                            <Progress value={progress} className="h-2 mb-2" />
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                进度: {Math.floor(progress)}%
                              </span>
                              <Badge variant="coin" className="gap-1">
                                {milestone.reward_type === "coins" ? (
                                  <Coins className="w-3 h-3" />
                                ) : (
                                  <Zap className="w-3 h-3" />
                                )}
                                +{milestone.reward_value}
                              </Badge>
                            </div>
                          </div>
                          {canClaim && (
                            <Button 
                              size="sm" 
                              onClick={() => handleClaimMilestone(milestone)}
                            >
                              <Gift className="w-4 h-4 mr-1" />
                              领取
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {milestones.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      本赛季暂无目标
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="leaderboard" className="mt-4">
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-accent" />
                战队排行榜
              </CardTitle>
              <CardDescription>
                排名第一的战队成员将获得专属名片
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {allTeams.map((team, index) => {
                    const isMyTeam = team.id === myTeam.id;
                    const rank = team.rank_position || index + 1;
                    
                    return (
                      <div
                        key={team.id}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          isMyTeam 
                            ? "bg-primary/20 border border-primary/30" 
                            : "bg-background/50"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          rank === 1 
                            ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white" 
                            : rank === 2 
                              ? "bg-gradient-to-br from-gray-300 to-gray-500 text-white"
                              : rank === 3
                                ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white"
                                : "bg-muted text-muted-foreground"
                        }`}>
                          {rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{team.name}</span>
                            {rank === 1 && (
                              <Crown className="w-4 h-4 text-yellow-500" />
                            )}
                            {isMyTeam && (
                              <Badge variant="secondary" className="text-xs">我的战队</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {team.member_count}人
                            </span>
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              {team.total_xp.toLocaleString()} XP
                            </span>
                            <span className="flex items-center gap-1">
                              <Trophy className="w-3 h-3" />
                              {team.total_wins}胜
                            </span>
                          </div>
                        </div>
                        {!isMyTeam && myTeam.leader_id === profile?.id && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setChallengeTeam(team);
                              setShowChallengeDialog(true);
                            }}
                          >
                            <Swords className="w-3 h-3 mr-1" />
                            挑战
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Challenge Team Dialog */}
      <Dialog open={showChallengeDialog} onOpenChange={setShowChallengeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Swords className="w-5 h-5" />
              发起战队挑战
            </DialogTitle>
            <DialogDescription>
              向其他战队发起团队赛挑战，所有成员的战绩将累计计入战队积分
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">选择对手战队</label>
              <ScrollArea className="h-[200px] border rounded-lg p-2">
                <div className="space-y-2">
                  {allTeams.filter(t => t.id !== myTeam.id).map((team) => (
                    <div
                      key={team.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        challengeTeam?.id === team.id 
                          ? "bg-primary/20 border border-primary" 
                          : "bg-background/50 hover:bg-background/80"
                      }`}
                      onClick={() => setChallengeTeam(team)}
                    >
                      <div className="flex-1">
                        <span className="font-medium">{team.name}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{team.member_count}人</span>
                          <span>{team.total_xp.toLocaleString()} XP</span>
                        </div>
                      </div>
                      {challengeTeam?.id === team.id && (
                        <Award className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            {challengeTeam && (
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-gaming">{myTeam.name}</p>
                    <p className="text-sm text-muted-foreground">{myTeam.member_count}人</p>
                  </div>
                  <div className="px-4">
                    <Swords className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-right">
                    <p className="font-gaming">{challengeTeam.name}</p>
                    <p className="text-sm text-muted-foreground">{challengeTeam.member_count}人</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChallengeDialog(false)}>
              取消
            </Button>
            <Button onClick={handleChallengeTeam} disabled={!challengeTeam || isChallenging}>
              {isChallenging ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              发起挑战
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
