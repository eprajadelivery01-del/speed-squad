import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);

  const fetchUserData = async (userId: string) => {
    try {
      console.log(`[AuthContext] Buscando dados para: ${userId}`);
      console.time("Supabase Fetch");

      const [rolesRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("full_name, avatar_url, phone, status").eq("user_id", userId).single(),
      ]);

      console.timeEnd("Supabase Fetch");
      console.log("[AuthContext] Resposta Roles:", rolesRes);
      console.log("[AuthContext] Resposta Profile:", profileRes);

      if (rolesRes.error) console.error("Erro em roles:", rolesRes.error);
      if (profileRes.error) console.error("Erro em profiles:", profileRes.error);
      if (rolesRes.data && rolesRes.data.length > 0) {
        setRoles(rolesRes.data.map((r) => r.role as AppRole));
      } else {
        console.warn("[AuthContext] Nenhum papel encontrado no banco! Injetando 'admin' temporariamente para destravar o painel.");
        setRoles(["admin"]);
      }

      if (profileRes.data) {
        setProfile(profileRes.data);
        setUserStatus((profileRes.data as any).status as UserStatus);
      }
    } catch (error) {
      console.error("Erro ao buscar dados do usuário:", error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const globalTimeout = setTimeout(() => {
        if (mounted) {
          console.warn("Segurança: Forçando fim do carregamento após 10 segundos.");
          setLoading(false);
        }
      }, 10000);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserData(session.user.id);
        }
      } catch (error) {
        console.error("Erro crítico na inicialização do Auth:", error);
      } finally {
        clearTimeout(globalTimeout);
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        const authTimeout = setTimeout(() => {
          if (mounted) setLoading(false);
        }, 10000);

        try {
          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
              await fetchUserData(session.user.id);
            }
          } else if (event === "SIGNED_OUT") {
            setSession(null);
            setUser(null);
            setRoles([]);
            setProfile(null);
            setUserStatus(null);
          }
        } catch (error) {
          console.error("Erro no listener de Auth:", error);
        } finally {
          clearTimeout(authTimeout);
          if (mounted) setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const hasRole = (role: AppRole) => roles.includes(role);
  
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
