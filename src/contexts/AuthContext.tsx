import { createContext, useCallback, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { safeRpc } from "@/lib/safeRpc";

type AppRole = "admin" | "company" | "driver" | "customer";
type UserStatus = "pending" | "active" | "rejected";
type ProfileData = { id?: string; full_name: string; avatar_url: string | null; phone: string | null };

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  userStatus: UserStatus | null;
  profile: ProfileData | null;
  hasRole: (role: AppRole) => boolean;
  syncProfile: (nextProfile: Partial<ProfileData>) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  dataLoaded: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


const normalizeName = (value: unknown) => typeof value === "string" ? value.trim() : "";

const buildProfile = (
  profileData?: Partial<ProfileData> | null,
  authUser?: User | null,
): ProfileData | null => {
  const id = profileData?.id ?? null;
  const full_name = normalizeName(profileData?.full_name) || normalizeName(authUser?.user_metadata?.full_name);
  const avatar_url = profileData?.avatar_url ?? null;
  const phone = profileData?.phone ?? null;

  if (!full_name && !avatar_url && !phone) return null;

  return { id, full_name, avatar_url, phone };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const fetchingRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const currentUserIdRef = useRef<string | null>(null);

  const clearUserState = useCallback(() => {
    fetchingRef.current = null;
    setRoles([]);
    setProfile(null);
    setUserStatus(null);
    setDataLoaded(false);
  }, []);

  const applySession = useCallback((nextSession: Session | null) => {
    const nextUser = nextSession?.user ?? null;
    currentUserIdRef.current = nextUser?.id ?? null;
    setSession(nextSession);
    setUser(nextUser);
  }, []);

  const syncProfile = useCallback((nextProfile: Partial<ProfileData>) => {
    setProfile((currentProfile) => {
      const merged = {
        id: currentProfile?.id ?? null,
        full_name: nextProfile.full_name ?? currentProfile?.full_name ?? null,
        avatar_url: nextProfile.avatar_url ?? currentProfile?.avatar_url ?? null,
        phone: nextProfile.phone ?? currentProfile?.phone ?? null,
      };
      return buildProfile(merged, user);
    });
  }, [user]);

  const fetchUserData = useCallback(async (authUser: User) => {
    const userId = authUser.id;
    if (fetchingRef.current === userId) return;
    fetchingRef.current = userId;
    setDataLoaded(false);
    
    try {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 10000)
      );

      // Usando seleção específica de colunas para contornar erro de Schema
      const rolesFetch = supabase.from("user_roles").select("role").eq("user_id", userId);
      const profileFetch = supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone, status") 
        .eq("user_id", userId)
        .maybeSingle();

      const results = await Promise.race([
        Promise.all([rolesFetch, profileFetch]),
        timeout
      ]) as any;

      const [rolesRes, profileRes] = results;

      if (!mountedRef.current) return;

      let finalRoles: AppRole[] = [];
      if (rolesRes?.data) {
        finalRoles = rolesRes.data.map((r: any) => r.role as AppRole);
      }

      // AUTO-REPAIR: If roles are empty, try to repair them using the fallback RPC
      if (finalRoles.length === 0) {
        try {
          // safeRpc never throws and always returns a Promise — safe in minified builds
          const { data: repairData } = await safeRpc('fix_user_permissions');
          if (repairData?.success) {
            const retryRoles = await supabase.from("user_roles").select("role").eq("user_id", userId);
            if (retryRoles.data && retryRoles.data.length > 0) {
              finalRoles = retryRoles.data.map((r: any) => r.role as AppRole);
            }
          }
        } catch {
          // Silent catch — function may not exist in the database
        }
      }

      // Removidos os hardcodes de override de email que forçavam sessão de admin/company/driver
      // independente do usuário que fizesse login.

      setRoles(finalRoles);

      const nextProfile = buildProfile(profileRes?.data ?? null, authUser);
      setProfile(nextProfile);
      setUserStatus((profileRes?.data?.status as UserStatus | null) ?? (nextProfile ? "active" : null));
    } catch (error: any) {
      if (!mountedRef.current) return;
      setProfile(buildProfile(null, authUser));
      setRoles([]);
      setUserStatus(null);
    } finally {
      fetchingRef.current = null;
      setDataLoaded(true);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!mountedRef.current) return;
        
        applySession(session);
        
        if (session?.user) {
          await fetchUserData(session.user);
        } else {
          clearUserState();
        }
      } catch (error) {
        if (mountedRef.current) {
          clearUserState();
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const authListener = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mountedRef.current) return;

      const nextUser = nextSession?.user ?? null;
      const nextUserId = nextUser?.id ?? null;
      const previousUserId = currentUserIdRef.current;

      if (event === "SIGNED_OUT") {
        // Only clear state if it was an explicit manual logout.
        // This completely prevents the gotrue multi-tab focus flicker bug.
        if (!(window as any).isManualLogout) {
          return;
        }
        applySession(null);
        clearUserState();
        setLoading(false);
        return;
      }

      if (!nextSession && event !== "INITIAL_SESSION") {
        // Prevent logout on transient null sessions during refresh
        return;
      }

      applySession(nextSession);

      if (event === "TOKEN_REFRESHED") {
        return;
      }

      if (event === "SIGNED_IN") {
        if (previousUserId === nextUserId) {
          return;
        }

        setLoading(true);
        // Defer load of user data to allow gotrue-js to release auth locks first, preventing deadlock
        setTimeout(() => {
          if (!mountedRef.current) return;
          void fetchUserData(nextUser).finally(() => {
            if (mountedRef.current) {
              setLoading(false);
            }
          });
        }, 0);
        return;
      }

      if (event === "USER_UPDATED") {
        setTimeout(() => {
          if (!mountedRef.current) return;
          void fetchUserData(nextUser);
        }, 0);
      }
    });

    return () => {
      mountedRef.current = false;
      if (authListener?.data?.subscription) {
        authListener.data.subscription.unsubscribe();
      }
    };
  }, [applySession, clearUserState, fetchUserData]);

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

  const signOut = async () => { 
    (window as any).isManualLogout = true;
    await supabase.auth.signOut(); 
  };

  const deleteAccount = async () => {
    if (!user) return;
    try {
      const { error } = await safeRpc("delete_my_account");
      if (error) throw new Error(error);
      await signOut();
    } catch (error) {
      if (import.meta.env.DEV) console.error("Erro ao deletar conta:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, session, loading, roles, userStatus, profile, hasRole, syncProfile, signIn, signUp, signOut, deleteAccount, dataLoaded 
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


