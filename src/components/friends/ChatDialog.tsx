import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Send, Loader2, MoreVertical, Flag, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Friend } from "./FriendList";
import { format } from "date-fns";
import { ReportDialog } from "@/components/ReportDialog";
import { toast } from "sonner";

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friend: Friend | null;
  currentProfileId: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

export const ChatDialog = ({
  open,
  onOpenChange,
  friend,
  currentProfileId,
}: ChatDialogProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleBlockUser = async () => {
    if (!friend) return;
    
    try {
      const { error } = await supabase.from("blocked_users").insert({
        blocker_id: currentProfileId,
        blocked_id: friend.id,
      });

      if (error) {
        if (error.code === "23505") {
          toast.info("你已经屏蔽了该用户");
        } else {
          throw error;
        }
      } else {
        toast.success("已屏蔽该用户");
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error("Block error:", error);
      toast.error("屏蔽失败");
    }
  };

  const fetchMessages = async () => {
    if (!friend) return;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentProfileId},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${currentProfileId})`
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Fetch messages error:", error);
      return;
    }

    setMessages(data || []);

    // Mark received messages as read
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("sender_id", friend.id)
      .eq("receiver_id", currentProfileId)
      .is("read_at", null);
  };

  useEffect(() => {
    if (open && friend) {
      fetchMessages();

      // Subscribe to new messages
      const channel = supabase
        .channel(`chat-${currentProfileId}-${friend.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          (payload) => {
            const newMsg = payload.new as Message;
            if (
              (newMsg.sender_id === currentProfileId &&
                newMsg.receiver_id === friend.id) ||
              (newMsg.sender_id === friend.id &&
                newMsg.receiver_id === currentProfileId)
            ) {
              setMessages((prev) => [...prev, newMsg]);
              // Mark as read if received
              if (newMsg.sender_id === friend.id) {
                supabase
                  .from("messages")
                  .update({ read_at: new Date().toISOString() })
                  .eq("id", newMsg.id);
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, friend, currentProfileId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !friend) return;

    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: currentProfileId,
        receiver_id: friend.id,
        content: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage("");
    } catch (error) {
      console.error("Send message error:", error);
    } finally {
      setSending(false);
    }
  };

  if (!friend) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                  {friend.avatar_url ? (
                    <img
                      src={friend.avatar_url}
                      alt={friend.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    friend.username.charAt(0).toUpperCase()
                  )}
                </div>
                {friend.username}
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border-border">
                  <DropdownMenuItem onClick={() => setReportOpen(true)} className="text-amber-500">
                    <Flag className="w-4 h-4 mr-2" />
                    举报用户
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBlockUser} className="text-destructive">
                    <UserX className="w-4 h-4 mr-2" />
                    屏蔽用户
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </DialogTitle>
          </DialogHeader>

        <ScrollArea className="h-80 pr-4" ref={scrollRef}>
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                开始聊天吧！
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === currentProfileId;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-lg ${
                        isMine
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div className="text-sm break-words">{msg.content}</div>
                      <div
                        className={`text-xs mt-1 ${
                          isMine
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {format(new Date(msg.created_at), "HH:mm")}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            placeholder="输入消息..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            disabled={sending}
          />
          <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <ReportDialog
      open={reportOpen}
      onOpenChange={setReportOpen}
      reportedUserId={friend.id}
      reportedUsername={friend.username}
      reportType="chat"
    />
  </>
  );
};
