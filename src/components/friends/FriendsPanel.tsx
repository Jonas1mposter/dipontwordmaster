import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Search, UserPlus } from "lucide-react";
import { FriendSearch } from "./FriendSearch";
import { FriendRequests } from "./FriendRequests";
import { FriendList, Friend } from "./FriendList";
import { ChatDialog } from "./ChatDialog";
import { BattleInviteDialog, BattleInviteReceiver } from "./BattleInviteDialog";

interface FriendsPanelProps {
  currentProfileId: string;
  currentGrade: number;
  onBattleStart: (matchId: string) => void;
  onSpectate?: (matchId: string) => void;
}

export const FriendsPanel = ({
  currentProfileId,
  currentGrade,
  onBattleStart,
  onSpectate,
}: FriendsPanelProps) => {
  const [chatFriend, setChatFriend] = useState<Friend | null>(null);
  const [challengeFriend, setChallengeFriend] = useState<Friend | null>(null);

  return (
    <div className="space-y-4">
      {/* Battle invite receiver (always active) */}
      <BattleInviteReceiver
        currentProfileId={currentProfileId}
        currentGrade={currentGrade}
        onBattleStart={onBattleStart}
      />

      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="friends" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            好友
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-1">
            <Search className="h-4 w-4" />
            搜索
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-1">
            <UserPlus className="h-4 w-4" />
            请求
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="mt-4">
          <FriendList
            currentProfileId={currentProfileId}
            onOpenChat={(friend) => setChatFriend(friend)}
            onChallenge={(friend) => setChallengeFriend(friend)}
            onSpectate={onSpectate}
          />
        </TabsContent>

        <TabsContent value="search" className="mt-4">
          <FriendSearch currentProfileId={currentProfileId} />
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <FriendRequests currentProfileId={currentProfileId} />
        </TabsContent>
      </Tabs>

      {/* Chat Dialog */}
      <ChatDialog
        open={chatFriend !== null}
        onOpenChange={(open) => !open && setChatFriend(null)}
        friend={chatFriend}
        currentProfileId={currentProfileId}
      />

      {/* Battle Invite Dialog */}
      <BattleInviteDialog
        open={challengeFriend !== null}
        onOpenChange={(open) => !open && setChallengeFriend(null)}
        friend={challengeFriend}
        currentProfileId={currentProfileId}
        currentGrade={currentGrade}
        onBattleStart={onBattleStart}
      />
    </div>
  );
};
