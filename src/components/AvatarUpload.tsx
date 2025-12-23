import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  username: string;
  size?: "sm" | "md" | "lg";
  onUploadSuccess?: (url: string) => void;
}

const AvatarUpload = ({ 
  currentAvatarUrl, 
  username, 
  size = "md",
  onUploadSuccess 
}: AvatarUploadProps) => {
  const { user, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-20 w-20",
    lg: "h-32 w-32",
  };

  const buttonSizeClasses = {
    sm: "h-6 w-6 -bottom-1 -right-1",
    md: "h-8 w-8 -bottom-1 -right-1",
    lg: "h-10 w-10 -bottom-2 -right-2",
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user) {
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    if (!fileExt || !allowedExts.includes(fileExt)) {
      toast.error("请上传 JPG、PNG、GIF 或 WebP 格式的图片");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("图片大小不能超过 2MB");
      return;
    }

    setUploading(true);

    try {
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Delete old avatar if exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const newAvatarUrl = urlData.publicUrl;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      await refreshProfile();
      onUploadSuccess?.(newAvatarUrl);
      toast.success("头像上传成功！");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error("上传失败，请重试");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <Avatar className={cn(sizeClasses[size], "border-2 border-primary/20")}>
        <AvatarImage src={avatarUrl || undefined} alt={username} />
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary font-bold">
          {username.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleUpload}
        className="hidden"
        disabled={uploading}
      />
      
      <Button
        size="icon"
        variant="secondary"
        className={cn(
          buttonSizeClasses[size],
          "absolute rounded-full shadow-lg hover:scale-110 transition-transform"
        )}
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};

export default AvatarUpload;
