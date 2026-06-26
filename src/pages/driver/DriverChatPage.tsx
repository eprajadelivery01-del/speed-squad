import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, User, Loader2, Send, Paperclip, Smile, Search, ArrowLeft, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useMessages, useSendMessage, getDirectConversation, getAdminId } from "@/services/chat";
import { useAuth } from "@/hooks/useAuth";
import { WhatsAppBubble } from "@/components/chat/WhatsAppBubble";
import { useNavigate } from "react-router-dom";

export default function DriverChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [autoOpened, setAutoOpened] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Fetch profiles for participants
  const { data: profiles } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name, avatar_url");
      return data?.reduce((acc: any, p) => ({ ...acc, [p.user_id]: p }), {}) || {};
    }
  });

  const { data: conversations, isLoading: loadingConvs } = useQuery({
    queryKey: ["driver-conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("conversations")
        .select("*, messages(content, created_at)")
        .contains("participants", [user.id])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch Admin ID
  const { data: adminId } = useQuery({
    queryKey: ["admin-id"],
    queryFn: getAdminId
  });

  // Auto-open admin chat on mount
  useEffect(() => {
    if (autoOpened || !user?.id || !adminId) return;
    setAutoOpened(true);
    getDirectConversation(user.id, adminId).then((conv) => {
      setSelectedConv(conv);
      qc.invalidateQueries({ queryKey: ["driver-conversations", user.id] });
    }).catch(console.error);
  }, [user?.id, adminId, autoOpened, qc]);

  const handleStartAdminChat = async () => {
    if (!user?.id || !adminId) return;
    try {
      const conv = await getDirectConversation(user.id, adminId);
      qc.invalidateQueries({ queryKey: ["driver-conversations", user.id] });
      setSelectedConv(conv);
    } catch (err) {
      console.error(err);
    }
  };

  const { data: messages, isLoading: loadingMessages } = useMessages(selectedConv?.id);
  const sendMessageMutation = useSendMessage();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !selectedConv) return;
    try {
      await sendMessageMutation.mutateAsync({
        conversationId: selectedConv.id,
        content: message.trim()
      });
      setMessage("");
    } catch (err) {
      console.error(err);
    }
  };

  const getConvTitle = (conv: any) => {
    if (conv.order_id) return `Entrega #${conv.order_id.slice(0, 8)}`;
    
    // Tenta extrair o Assunto da primeira mensagem caso seja um chat de suporte
    let extractedTopic = null;
    if (conv.messages && conv.messages.length > 0) {
      const firstMsg = [...conv.messages].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
      if (firstMsg?.content?.startsWith('[Assunto:')) {
        extractedTopic = firstMsg.content.replace('[Assunto:', '').replace(']', '').trim();
      }
    }

    const otherParticipant = conv.participants.find((p: string) => p !== user?.id);
    const profile = profiles?.[otherParticipant];
    if (profile?.full_name) {
      return extractedTopic ? `${profile.full_name} (${extractedTopic})` : profile.full_name;
    }
    
    if (otherParticipant) {
      return extractedTopic || `Usuário #${otherParticipant.slice(0, 6).toUpperCase()}`;
    }

    return extractedTopic || "Suporte NexusPro";
  };

  const getTargetProfile = () => {
    if (!selectedConv) return null;
    const otherParticipant = selectedConv.participants.find((p: string) => p !== user?.id);
    return profiles?.[otherParticipant];
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-[#f0f2f5] dark:bg-[#0b141a] overflow-hidden pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      {/* Sidebar - Mobile Responsive */}
      <div className={cn(
        "w-full md:w-96 border-r border-border flex flex-col bg-card shrink-0 transition-all",
        selectedConv && "hidden md:flex"
      )}>
        <div className="p-4 bg-[#f0f2f5] dark:bg-[#202c33] flex items-center justify-between border-b border-border/10">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-2 items-center">
            <button 
              onClick={handleStartAdminChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[0.65rem] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              Falar com Admin
            </button>
            <div className="flex gap-4 text-muted-foreground ml-2">
              <MessageSquare className="h-5 w-5 cursor-pointer" />
              <MoreVertical className="h-5 w-5 cursor-pointer" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loadingConvs ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : conversations?.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground italic">Nenhuma conversa ativa</div>
          ) : conversations?.map((conv) => {
            const profile = profiles?.[conv.participants.find((p: string) => p !== user?.id)];
            return (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={cn(
                  "w-full p-3 flex items-center gap-3 hover:bg-[#f5f6f6] dark:hover:bg-[#2a3942] transition-colors border-b border-border/5 text-left",
                  selectedConv?.id === conv.id && "bg-[#ebebeb] dark:bg-[#2a3942]"
                )}
              >
                <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[0.95rem] font-semibold text-foreground truncate">{getConvTitle(conv)}</span>
                    <span className="text-[0.65rem] text-muted-foreground whitespace-nowrap">
                      {conv.messages?.[0] ? format(new Date(conv.messages[0].created_at), "HH:mm") : ""}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate leading-snug">
                    {conv.messages?.[0]?.content || "Inicie a conversa"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat window */}
      <div className={cn(
        "flex-1 flex flex-col relative",
        !selectedConv && "hidden md:flex"
      )}>
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="p-3 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-border/10 flex items-center gap-3 z-10 shadow-sm">
              <button className="md:hidden" onClick={() => setSelectedConv(null)}>
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-muted overflow-hidden border border-border shrink-0">
                {getTargetProfile()?.avatar_url ? (
                  <img src={getTargetProfile()?.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><User className="h-5 w-5 opacity-50" /></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-foreground leading-tight truncate">{getConvTitle(selectedConv)}</h3>
                <p className="text-[0.65rem] text-primary font-bold uppercase tracking-wider">Suporte Online</p>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 md:px-8 space-y-1 relative scroll-smooth"
              style={{ 
                backgroundImage: `url('/whatsapp_chat_pattern.png')`,
                backgroundSize: '400px',
                backgroundColor: 'rgba(230,221,212,0.6)' 
              }}
            >
              <div className="absolute inset-0 bg-[#e5ddd5]/40 dark:bg-[#0b141a]/95 pointer-events-none" />
              
              <div className="relative z-10 flex flex-col gap-2 pb-4">
                {messages?.map((msg, i) => (
                  <WhatsAppBubble 
                    key={msg.id} 
                    content={msg.content} 
                    timestamp={msg.created_at} 
                    isMe={msg.sender_id === user?.id}
                    showTail={i === 0 || messages[i-1].sender_id !== msg.sender_id}
                  />
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="px-4 py-3 bg-[#f0f2f5] dark:bg-[#202c33] flex items-center gap-4 z-10">
              <div className="flex gap-4 text-muted-foreground shrink-0">
                <Smile className="h-6 w-6 cursor-pointer" />
                <Paperclip className="h-6 w-6 cursor-pointer" />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Mensagem"
                  className="w-full bg-card dark:bg-[#2a3942] border-none rounded-xl px-4 py-2 text-sm outline-none placeholder:text-muted-foreground/50"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!message.trim() || sendMessageMutation.isPending}
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-[#222e35]">
            <MessageSquare className="h-16 w-16 text-primary opacity-20 mb-4" />
            <h2 className="text-lg font-bold text-foreground">Suporte Nexus</h2>
            <p className="text-xs text-muted-foreground max-w-xs text-center px-4">
              Clique em uma conversa para falar com a central ou tirar dúvidas sobre suas entregas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
