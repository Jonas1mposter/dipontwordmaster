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
  last_energy_restore: string | null;
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

  // Check if energy should be restored (new day)
  const checkAndRestoreEnergy = async (profileData: Profile) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const lastRestore = profileData.last_energy_restore;
    
    // If last restore was before today, restore energy to max
    if (!lastRestore || lastRestore < today) {
      console.log("[Auth] New day detected, restoring energy to max");
      const { error } = await supabase
        .from("profiles")
        .update({
          energy: profileData.max_energy,
          last_energy_restore: today
        })
        .eq("id", profileData.id);
      
      if (error) {
        console.error("[Auth] Error restoring energy:", error);
        return profileData;
      }
      
      return {
        ...profileData,
        energy: profileData.max_energy,
        last_energy_restore: today
      };
    }
    
    return profileData;
  };

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
    
    // Check and restore energy if new day
    if (data) {
      return await checkAndRestoreEnergy(data as Profile);
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
    let profileFetchId = 0; // Dedup: only the latest fetch wins

    const loadProfile = (userId: string, email?: string) => {
      const currentFetchId = ++profileFetchId;
      fetchProfile(userId, email).then((p) => {
        if (isMounted && currentFetchId === profileFetchId) {
          setProfile(p);
        }
      });
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session) {
          localStorage.setItem('sb-session', JSON.stringify(session));
        } else {
          localStorage.removeItem('sb-session');
          setProfile(null);
        }
        
        if (session?.user) {
          setTimeout(() => loadProfile(session.user.id, session.user.email), 0);
        }
        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session) {
        localStorage.setItem('sb-session', JSON.stringify(session));
        loadProfile(session.user.id, session.user.email);
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
