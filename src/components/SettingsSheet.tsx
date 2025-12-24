import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Volume2, VolumeX, Music, Bell, Moon, Sun, Vibrate, Gamepad2, Info, Shield, LogOut, Lock, School, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
  notificationsEnabled: boolean;
  vibrationEnabled: boolean;
  darkMode: boolean;
  autoSubmit: boolean;
}
const defaultSettings: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  soundVolume: 80,
  musicVolume: 60,
  notificationsEnabled: true,
  vibrationEnabled: true,
  darkMode: true,
  autoSubmit: false
};
const STORAGE_KEY = "game-settings";

// Class options by grade
const classOptions: Record<number, string[]> = {
  7: ["7A1", "7A2", "7B", "7C", "7D", "7E"],
  8: ["8A1", "8A2", "8A3", "8B", "8C", "8D", "8E", "8F"]
};
export const SettingsSheet = () => {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);
  const {
    user,
    profile,
    signOut,
    refreshProfile
  } = useAuth();

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Class selection state
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [classLoading, setClassLoading] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({
          ...defaultSettings,
          ...parsed
        });
      } catch (e) {
        console.error("Failed to parse settings:", e);
      }
    }
  }, []);

  // Load user's class from profile
  useEffect(() => {
    if (profile?.class) {
      setSelectedClass(profile.class);
    }
  }, [profile]);

  // Save settings to localStorage whenever they change
  const updateSettings = (key: keyof GameSettings, value: boolean | number) => {
    const newSettings = {
      ...settings,
      [key]: value
    };
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));

    // Play a subtle feedback sound if sound is enabled
    if (key !== "soundEnabled" && settings.soundEnabled) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        gain.gain.setValueAtTime(0.05 * (settings.soundVolume / 100), ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } catch (e) {
        // Ignore audio errors
      }
    }
  };
  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("请填写所有密码字段");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("密码至少需要6个字符");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }
    setPasswordLoading(true);
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      toast.success("密码修改成功！");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordChange(false);
    } catch (error: any) {
      toast.error(error.message || "密码修改失败");
    } finally {
      setPasswordLoading(false);
    }
  };
  const handleClassChange = async (value: string) => {
    if (!profile?.id) return;
    setClassLoading(true);
    try {
      const {
        error
      } = await supabase.from("profiles").update({
        class: value
      }).eq("id", profile.id);
      if (error) throw error;
      setSelectedClass(value);
      await refreshProfile();
      toast.success(`班级已更新为 ${value}`);
    } catch (error: any) {
      toast.error(error.message || "班级更新失败");
    } finally {
      setClassLoading(false);
    }
  };
  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("已退出登录");
      setOpen(false);
    } catch (error: any) {
      toast.error("退出登录失败");
    }
  };
  const availableClasses = profile?.grade ? classOptions[profile.grade] || [] : [];
  return <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-primary/10">
          <Settings className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[320px] sm:w-[400px] overflow-y-auto bg-card border-border">
        <SheetHeader>
          <SheetTitle className="font-gaming text-xl flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            游戏设置
          </SheetTitle>
          <SheetDescription>
            自定义你的游戏体验
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Account Security Section */}
          {user && <>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  账号安全
                </div>
                
                <div className="space-y-4 pl-2">
                  {/* User Info */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <User className="w-5 h-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{profile?.username || "用户"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Class Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <School className="w-4 h-4 text-primary" />
                      <Label>班级设置</Label>
                    </div>
                    <Select value={selectedClass || ""} onValueChange={handleClassChange} disabled={classLoading || availableClasses.length === 0}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={availableClasses.length === 0 ? "无可用班级" : "选择班级"} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {availableClasses.map(cls => <SelectItem key={cls} value={cls}>
                            {cls}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                    {profile?.grade && <p className="text-xs text-muted-foreground">
                        当前年级: {profile.grade}年级
                      </p>}
                  </div>

                  {/* Password Change */}
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" onClick={() => setShowPasswordChange(!showPasswordChange)}>
                      <Lock className="w-4 h-4 mr-2" />
                      修改密码
                    </Button>
                    
                    {showPasswordChange && <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border">
                        <div className="space-y-2">
                          <Label htmlFor="new-password" className="text-xs">新密码</Label>
                          <Input id="new-password" type="password" placeholder="输入新密码（至少6位）" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-password" className="text-xs">确认密码</Label>
                          <Input id="confirm-password" type="password" placeholder="再次输入新密码" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handlePasswordChange} disabled={passwordLoading} className="flex-1">
                            {passwordLoading ? "修改中..." : "确认修改"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => {
                      setShowPasswordChange(false);
                      setNewPassword("");
                      setConfirmPassword("");
                    }}>
                            取消
                          </Button>
                        </div>
                      </div>}
                  </div>

                  {/* Logout Button */}
                  <Button variant="destructive" className="w-full" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    退出登录
                  </Button>
                </div>
              </div>

              <Separator />
            </>}

          {/* Sound Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Volume2 className="w-4 h-4" />
              音效设置
            </div>
            
            <div className="space-y-4 pl-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
                  <Label htmlFor="sound-enabled" className="cursor-pointer">
                    游戏音效
                  </Label>
                </div>
                <Switch id="sound-enabled" checked={settings.soundEnabled} onCheckedChange={checked => updateSettings("soundEnabled", checked)} />
              </div>

              {settings.soundEnabled && <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>音效音量</span>
                    <span>{settings.soundVolume}%</span>
                  </div>
                  <Slider value={[settings.soundVolume]} onValueChange={([value]) => updateSettings("soundVolume", value)} max={100} step={5} className="cursor-pointer" />
                </div>}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Music className="w-4 h-4 text-primary" />
                  <Label htmlFor="music-enabled" className="cursor-pointer">
                    背景音乐
                  </Label>
                </div>
                <Switch id="music-enabled" checked={settings.musicEnabled} onCheckedChange={checked => updateSettings("musicEnabled", checked)} />
              </div>

              {settings.musicEnabled && <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>音乐音量</span>
                    <span>{settings.musicVolume}%</span>
                  </div>
                  <Slider value={[settings.musicVolume]} onValueChange={([value]) => updateSettings("musicVolume", value)} max={100} step={5} className="cursor-pointer" />
                </div>}
            </div>
          </div>

          <Separator />

          {/* Notification Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Bell className="w-4 h-4" />
              通知设置
            </div>
            
            <div className="space-y-4 pl-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-primary" />
                  <Label htmlFor="notifications-enabled" className="cursor-pointer">
                    推送通知
                  </Label>
                </div>
                <Switch id="notifications-enabled" checked={settings.notificationsEnabled} onCheckedChange={checked => updateSettings("notificationsEnabled", checked)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Vibrate className="w-4 h-4 text-primary" />
                  <Label htmlFor="vibration-enabled" className="cursor-pointer">
                    振动反馈
                  </Label>
                </div>
                <Switch id="vibration-enabled" checked={settings.vibrationEnabled} onCheckedChange={checked => updateSettings("vibrationEnabled", checked)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Game Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Gamepad2 className="w-4 h-4" />
              游戏选项
            </div>
            
            <div className="space-y-4 pl-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {settings.darkMode ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-accent" />}
                  <div>
                    <Label htmlFor="dark-mode" className="cursor-pointer">
                      深色模式
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      护眼暗色主题
                    </p>
                  </div>
                </div>
                <Switch id="dark-mode" checked={settings.darkMode} onCheckedChange={checked => {
                updateSettings("darkMode", checked);
                toast.info(checked ? "已切换到深色模式" : "浅色模式暂未开放");
                if (!checked) {
                  // Revert to dark mode since light mode isn't implemented
                  setTimeout(() => updateSettings("darkMode", true), 100);
                }
              }} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-primary" />
                  <div>
                    <Label htmlFor="auto-submit" className="cursor-pointer">
                      自动提交答案
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      选择后自动提交，无需点击确认
                    </p>
                  </div>
                </div>
                <Switch id="auto-submit" checked={settings.autoSubmit} onCheckedChange={checked => updateSettings("autoSubmit", checked)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* About */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Info className="w-4 h-4" />
              关于
            </div>
            
            <div className="pl-2 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">版本</span>
                <span className="font-mono">v1.0.0</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">开发者</span>
                <span>Jonas Zhang</span>
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="pt-4">
            <Button variant="outline" className="w-full" onClick={() => {
            setSettings(defaultSettings);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
            toast.success("设置已重置为默认值");
          }}>
              重置为默认设置
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>;
};

// Hook to access settings from other components
export const useGameSettings = () => {
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);
  useEffect(() => {
    const loadSettings = () => {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings({
            ...defaultSettings,
            ...parsed
          });
        } catch (e) {
          console.error("Failed to parse settings:", e);
        }
      }
    };
    loadSettings();

    // Listen for storage changes from other tabs/components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadSettings();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);
  return settings;
};
export default SettingsSheet;