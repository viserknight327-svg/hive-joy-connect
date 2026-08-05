import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSessionUser, type Profile } from "@/lib/hive";
import { sendMessage } from "@/lib/hive.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Chat · Hive" },
      { name: "description", content: "Send AI-moderated direct messages to the creators you follow on Hive." },
      { property: "og:title", content: "Chat · Hive" },
      { property: "og:description", content: "AI-moderated direct messages on Hive." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Chat;
});

function Chat() {
  return null;
}
