import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="platform-shell">
      <Sidebar />
      <div className="platform-main">
        {children}
      </div>
    </div>
  );
}
