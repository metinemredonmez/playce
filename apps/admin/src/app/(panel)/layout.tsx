import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sidebar } from '@/components/sidebar';
import { api } from '@/lib/api';
import { getMe } from '@/lib/me';
import { NAV } from '@/lib/nav';
import { hasRole, ROLE_LABEL } from '@/lib/roles';
import type { Queues } from '@/lib/types';
import { logout } from './actions';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!hasRole(me.role, 'EDITOR')) {
    return (
      <main className="grid min-h-dvh place-items-center p-4 text-center">
        <div className="grid gap-3">
          <p className="font-medium">Bu panel için yetkin yok.</p>
          <p className="text-sm text-muted-foreground">En az Editör rolü gerekir. Rolün: {ROLE_LABEL[me.role]}.</p>
          <form action={logout}>
            <Button variant="outline">Çıkış yap</Button>
          </form>
        </div>
      </main>
    );
  }

  const queues = await api<Queues>('/admin/queues');
  // Rol süzmesi sunucuda: yetkisi olmayan menü öğesini hiç görmez
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => hasRole(me.role, i.min)) })).filter((g) => g.items.length);

  return (
    <div className="grid min-h-dvh md:grid-cols-[240px_1fr]">
      <aside className="flex flex-col gap-4 border-b bg-muted/30 p-4 md:border-r md:border-b-0">
        <div className="px-3">
          <p className="font-semibold">Playce Admin</p>
          <p className="truncate text-xs text-muted-foreground">
            {me.email ?? me.name} · {ROLE_LABEL[me.role]}
          </p>
        </div>
        <Separator />
        <Sidebar groups={groups} queues={queues} />
        <form action={logout} className="mt-auto">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground">
            <LogOut className="size-4" /> Çıkış yap
          </Button>
        </form>
      </aside>
      <main className="min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
