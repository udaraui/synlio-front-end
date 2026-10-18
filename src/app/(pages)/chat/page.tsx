"use client";

import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopilotChatView } from "@/components/common/CopilotChatView";

export default function ChatPage() {
  const router = useRouter();
  const canAccessChat = usePrivilegeGuard("120");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (mounted && !canAccessChat) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] w-full text-muted-foreground p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          You are not authorized to use Synlio Co-Pilot. Please contact your organization administrator if you need access.
        </p>
        <Button variant="outline" onClick={() => router.push("/home")} className="cursor-pointer">
          Return to Home
        </Button>
      </div>
    );
  }

  return <CopilotChatView mode="full" />;
}
