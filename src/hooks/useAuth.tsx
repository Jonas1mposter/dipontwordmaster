import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  username: string;
  grade: number;
  level: number;
  xp: number;
  xp_to_next_level: number;
  coins: number;
  energy: number;
  max_energy: number;
  streak: number;
  rank_tier: string;
  rank_stars: number;
  rank_points: number;
  wins: number;
  losses: number;
  avatar_url: string | null;
  class: string | null;
  elo_rating: number;
  elo_free: number;
  free_match_wins: number;
  free_match_losses: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, userEmail?: string) => {
    console.log("[Auth] Fetching profile for user:", userId);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[Auth] Error fetching profile:", error);
      return null;
    }
    
    console.log("[Auth] Profile data:", data);
    
    // If profile doesn't exist, create one
    if (!data && userEmail) {
      console.log("[Auth] Creating new profile for:", userEmail);
      const username = userEmail.split('@')[0];
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert({
          user_id: userId,
          username: username,
          grade: 7
        })
        .select()
        .single();
      
      if (createError) {
        console.error("[Auth] Error creating profile:", createError);
        return null;
      }
      console.log("[Auth] Created new profile:", newProfile);
      return newProfile as Profile;
    }
    
    return data as Profile;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // 先从本地缓存读取会话，立即显示 UI
    const cachedSession = localStorage.getItem('sb-session');
    if (cachedSession) {
      try {
        const parsed = JSON.parse(cachedSession);
        // 检查 token 是否过期
        const tokenExp = parsed?.expires_at;
        const isExpired = tokenExp && tokenExp * 1000 < Date.now();
        
        if (!isExpired && parsed?.user) {
          setSession(parsed);
          setUser(parsed.user);
          // 不等待 profile，先让 UI 渲染
          setLoading(false);
          fetchProfile(parsed.user.id, parsed.user.email).then((p) => {
            if (isMounted) setProfile(p);
          });
        } else {
          // 缓存已过期，清除
          localStorage.removeItem('sb-session');
        }
      } catch {
        // 缓存无效，继续正常流程
        localStorage.removeItem('sb-session');
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // 缓存会话到本地
        if (session) {
          localStorage.setItem('sb-session', JSON.stringify(session));
        } else {
          localStorage.removeItem('sb-session');
          setProfile(null);
        }
        
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id, session.user.email).then((p) => {
              if (isMounted) setProfile(p);
            });
          }, 0);
        }
        setLoading(false);
      }
    );

    // 后台验证会话有效性
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session) {
        localStorage.setItem('sb-session', JSON.stringify(session));
        fetchProfile(session.user.id, session.user.email).then((p) => {
          if (isMounted) setProfile(p);
        });
      } else {
        localStorage.removeItem('sb-session');
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
