import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CheckCheck } from "lucide-react";

interface WhatsAppBubbleProps {
  content: string;
  timestamp: string;
  isMe: boolean;
  showTail?: boolean;
}

export function WhatsAppBubble({ content, timestamp, isMe, showTail = true }: WhatsAppBubbleProps) {
  return (
    <div className={cn(
      "flex w-full mb-1",
      isMe ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "relative max-w-[85%] px-3 py-1.5 shadow-sm min-w-[80px]",
        isMe 
          ? "bg-[#dcf8c6] dark:bg-[#005c4b] text-foreground rounded-2xl rounded-tr-none" 
          : "bg-white dark:bg-[#202c33] text-foreground rounded-2xl rounded-tl-none",
        showTail && isMe && "after:content-[''] after:absolute after:top-0 after:-right-2 after:border-[10px] after:border-t-[#dcf8c6] dark:after:border-t-[#005c4b] after:border-r-transparent after:border-b-transparent after:border-l-transparent",
        showTail && !isMe && "before:content-[''] before:absolute before:top-0 before:-left-2 before:border-[10px] before:border-t-white dark:before:border-t-[#202c33] after:border-r-transparent after:border-b-transparent after:border-l-transparent"
      )}>
        <p className="text-[0.9rem] leading-snug whitespace-pre-wrap pb-1 pr-12">{content}</p>
        
        <div className="absolute bottom-1 right-2 flex items-center gap-1">
          <span className="text-[0.65rem] opacity-50 font-medium">
            {format(new Date(timestamp), "HH:mm")}
          </span>
          {isMe && (
            <CheckCheck className="h-3 w-3 text-sky-500" />
          )}
        </div>
      </div>
    </div>
  );
}
