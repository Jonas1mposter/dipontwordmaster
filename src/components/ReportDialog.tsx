import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Flag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId: string;
  reportedUsername: string;
  reportType: "user" | "message" | "chat";
}

const reportReasons = [
  { value: "inappropriate_content", label: "不当内容" },
  { value: "harassment", label: "骚扰或欺凌" },
  { value: "spam", label: "垃圾信息" },
  { value: "cheating", label: "作弊行为" },
  { value: "impersonation", label: "冒充他人" },
  { value: "other", label: "其他" },
];

export const ReportDialog = ({
  open,
  onOpenChange,
  reportedUserId,
  reportedUsername,
  reportType,
}: ReportDialogProps) => {
  const { profile } = useAuth();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("请选择举报原因");
      return;
    }

    if (!profile?.id) {
      toast.error("请先登录");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: profile.id,
        reported_user_id: reportedUserId,
        report_type: reportType,
        reason,
        description: description.trim() || null,
      });

      if (error) throw error;

      toast.success("举报已提交，我们会尽快处理");
      setReason("");
      setDescription("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Report error:", error);
      toast.error("举报提交失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!profile?.id) {
      toast.error("请先登录");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("blocked_users").insert({
        blocker_id: profile.id,
        blocked_id: reportedUserId,
      });

      if (error) {
        if (error.code === "23505") {
          toast.info("你已经屏蔽了该用户");
        } else {
          throw error;
        }
      } else {
        toast.success("已屏蔽该用户");
      }
    } catch (error: any) {
      console.error("Block error:", error);
      toast.error("屏蔽失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-destructive" />
            举报用户
          </DialogTitle>
          <DialogDescription>
            举报 <span className="font-medium text-foreground">{reportedUsername}</span> 的不当行为
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>举报原因</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {reportReasons.map((r) => (
                <div key={r.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={r.value} id={r.value} />
                  <Label htmlFor={r.value} className="cursor-pointer font-normal">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">详细描述（可选）</Label>
            <Textarea
              id="description"
              placeholder="请描述具体情况..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-secondary/50 border-border/50"
              rows={3}
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              虚假举报可能会导致您的账号受到限制。请确保您的举报真实有效。
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleBlock}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            屏蔽此用户
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !reason}
            className="w-full sm:w-auto"
          >
            {loading ? "提交中..." : "提交举报"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
