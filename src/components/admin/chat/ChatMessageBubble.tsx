import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CheckCheck } from "lucide-react";
import type { ChatMessage } from "@/hooks/useChat";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message: msg }: ChatMessageBubbleProps) {
  const isAdmin = msg.sender_type === "admin";

  return (
    <div className={cn("flex", isAdmin ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
          isAdmin
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-white border rounded-bl-md"
        )}
      >
        {!isAdmin && (
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {msg.sender_name}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        <div className="flex items-center gap-1 mt-1">
          <span
            className={cn(
              "text-[10px]",
              isAdmin ? "text-primary-foreground/60" : "text-muted-foreground"
            )}
          >
            {format(new Date(msg.created_at), "HH:mm")}
          </span>
          {isAdmin && msg.read_at && (
            <CheckCheck className="h-3 w-3 text-primary-foreground/60" />
          )}
        </div>
      </div>
    </div>
  );
}
