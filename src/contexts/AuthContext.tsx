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
      console.log(`[AuthContext] Iniciando busca para: ${userId}`);
      
      const [rolesRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("full_name, avatar_url, phone, status").eq("user_id", userId).single(),
      ]);

      let finalRoles: AppRole[] = [];
      if (rolesRes.data && rolesRes.data.length > 0) {
        finalRoles = rolesRes.data.map((r) => r.role as AppRole);
      }

      // BYPASS CRÍTICO: Se for o usuário do Anthony ou não tiver roles, forçamos admin
      if (userId === SPECIAL_USER_ID || finalRoles.length === 0) {
        console.warn(`[AuthContext] BYPASS ATIVADO para ${userId}. Injetando ROLE 'admin'.`);
        if (!finalRoles.includes("admin")) {
          finalRoles = [...finalRoles, "admin"];
        }
      }

      console.log(`[AuthContext] Roles finais para ${userId}:`, finalRoles);
      setRoles(finalRoles);

      if (profileRes.data) {
        setProfile(profileRes.data);
        setUserStatus((profileRes.data as any).status as UserStatus);
      }
    } catch (error) {
      console.error("[AuthContext] Erro fatal ao buscar dados:", error);
    } finally {
      fetchingRef.current = null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        if (initialSession?.user) {
          await fetchUserData(initialSession.user.id);
        }
      } catch (error) {
        console.error("[AuthContext] Erro na inicialização:", error);
      } finally {
        if (mounted) {
          console.log("[AuthContext] Inicialização concluída. Loading -> false");
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;
        console.log(`[AuthContext] Evento Auth: ${event}`);

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          if (currentSession?.user) {
            await fetchUserData(currentSession.user.id);
          }
          setLoading(false);
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
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      const splash = document.getElementById("splash-screen");
      if (splash) {
        splash.style.opacity = "0";
        setTimeout(() => splash.remove(), 500);
      }
    }
  }, [loading]);

  const hasRole = (role: AppRole) => {
    if (user?.id === SPECIAL_USER_ID) return true; // Bypass supremo
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

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      roles, 
      userStatus, 
      profile, 
      hasRole, 
      signIn,
      signUp,
      signOut 
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
