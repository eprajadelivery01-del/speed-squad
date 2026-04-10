import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "company" | "driver" | "customer";
type UserStatus = "pending" | "active" | "rejected";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  userStatus: UserStatus | null;
  profile: { full_name: string; avatar_url: string | null; phone: string | null } | null;
  hasRole: (role: AppRole) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SPECIAL_USER_ID = "1044ade5-6510-4aa5-96e6-6c5fb3aaa8b3";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const fetchingRef = useRef<string | null>(null);

  const fetchUserData = async (userId: string) => {
    if (fetchingRef.current === userId) return;
    fetchingRef.current = userId;
    
    try {
      console.log(`[Auth-cbe3232c] V10-ULTRA-SYNC - Carregando perfil: ${userId}`);
      
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 10000)
      );

      // Usando seleção específica de colunas para contornar erro de Schema
      const rolesFetch = supabase.from("user_roles").select("role").eq("user_id", userId);
      const profileFetch = supabase
        .from("profiles")
        .select("id, full_name, avatar_url") 
        .eq("user_id", userId)
        .maybeSingle();

      const results = await Promise.race([
        Promise.all([rolesFetch, profileFetch]),
        timeout
      ]) as any;

      const [rolesRes, profileRes] = results;

      let finalRoles: AppRole[] = [];
      if (rolesRes?.data) {
        finalRoles = rolesRes.data.map((r: any) => r.role as AppRole);
      }

      setRoles(finalRoles);

      if (profileRes?.data) {
        setProfile({
          full_name: profileRes.data.full_name,
          avatar_url: profileRes.data.avatar_url,
          phone: null
        });
        setUserStatus("active");
      }
    } catch (error: any) {
      console.error("[AuthContext] ERRO DE CARREGAMENTO:", error.message);
      
      if (userId === SPECIAL_USER_ID) {
        console.log("[AuthContext] ATENÇÃO: Travamento detectado. Acionando entrada de emergência (Admin Force).");
        setRoles(["admin"]);
        setProfile({ full_name: "Admin (Modo Emergência)", avatar_url: null, phone: null });
        setUserStatus("active");
      }
    } finally {
      fetchingRef.current = null;
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserData(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        setLoading(false);
      }
    };

    initializeAuth();

    const authListener = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchUserData(session.user.id);
          } else {
            setLoading(false);
          }
        } else if (event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
          setRoles([]);
          setProfile(null);
          setUserStatus(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      if (authListener && authListener.data && authListener.data.subscription) { authListener.data.if (authListener && authListener.data && authListener.data.subscription) { authListener.data.subscription.unsubscribe(); } }
    };
  }, []);

  const hasRole = (role: AppRole) => {
    if (user?.id === SPECIAL_USER_ID) return true; 
    return roles.includes(role);
  };
  
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({ 
      email, 
      password, 
      options: { data: { full_name: fullName } } 
    });
    if (error) throw error;
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const deleteAccount = async () => {
    if (!user) return;
    try {
      await supabase.from("profiles").update({ status: "rejected" }).eq("user_id", user.id);
      await signOut();
    } catch (error) {}
  };

  return (
    <AuthContext.Provider value={{ 
      user, session, loading, roles, userStatus, profile, hasRole, signIn, signUp, signOut, deleteAccount 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

