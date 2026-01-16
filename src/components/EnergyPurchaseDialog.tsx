import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EnergyPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEnergy: number;
  maxEnergy: number;
  coins: number;
  profileId: string;
  onPurchaseSuccess: () => void;
}

// Energy purchase options
const ENERGY_OPTIONS = [
  { energy: 1, cost: 10, label: "+1 能量" },
  { energy: 3, cost: 25, label: "+3 能量" },
  { energy: 5, cost: 40, label: "+5 能量" },
  { energy: 10, cost: 70, label: "+10 能量" },
];

const EnergyPurchaseDialog = ({
  open,
  onOpenChange,
  currentEnergy,
  maxEnergy,
  coins,
  profileId,
  onPurchaseSuccess,
}: EnergyPurchaseDialogProps) => {
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async (energyAmount: number, cost: number) => {
    // Check if user has enough coins
    if (coins < cost) {
      toast.error("狄邦豆不足", {
        description: `需要 ${cost} 狄邦豆，你只有 ${coins} 狄邦豆`,
      });
      return;
    }

    // Check if energy would exceed max
    const newEnergy = Math.min(currentEnergy + energyAmount, maxEnergy + energyAmount);
    
    setPurchasing(true);
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          energy: newEnergy,
          coins: coins - cost,
        })
        .eq("id", profileId);

      if (error) throw error;

      toast.success("购买成功！", {
        description: `获得 ${energyAmount} 点能量`,
      });
      
      onPurchaseSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error purchasing energy:", error);
      toast.error("购买失败，请重试");
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-neon-cyan" />
            购买能量
          </DialogTitle>
          <DialogDescription>
            使用狄邦豆购买额外能量，继续学习和对战
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current status */}
          <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-neon-cyan" />
              <span className="text-sm">当前能量</span>
            </div>
            <span className="font-gaming text-neon-cyan">{currentEnergy} / {maxEnergy}</span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-accent" />
              <span className="text-sm">狄邦豆余额</span>
            </div>
            <span className="font-gaming text-accent">{coins.toLocaleString()}</span>
          </div>

          {/* Purchase options */}
          <div className="grid grid-cols-2 gap-3">
            {ENERGY_OPTIONS.map((option) => {
              const canAfford = coins >= option.cost;
              
              return (
                <Button
                  key={option.energy}
                  variant={canAfford ? "outline" : "ghost"}
                  className={`h-auto py-4 flex flex-col gap-1 ${
                    canAfford 
                      ? "border-neon-cyan/30 hover:bg-neon-cyan/10 hover:border-neon-cyan" 
                      : "opacity-50 cursor-not-allowed"
                  }`}
                  disabled={!canAfford || purchasing}
                  onClick={() => handlePurchase(option.energy, option.cost)}
                >
                  <div className="flex items-center gap-1 text-neon-cyan font-gaming">
                    <Zap className="w-4 h-4" />
                    {option.label}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-background">豆</span>
                    </div>
                    {option.cost}
                  </div>
                </Button>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            购买的能量可以超过每日上限
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnergyPurchaseDialog;
