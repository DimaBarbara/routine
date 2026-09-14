import { Preferences } from '@/components/preferences';
import { Card } from '@/components/ui/card';

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <Preferences className="justify-end p-4" />
      <main className="flex flex-1 items-center justify-center p-4 pb-16">
        <div className="w-full max-w-sm">
          <p className="mb-6 text-center text-2xl font-semibold tracking-tight">routine</p>
          <Card>
            <h1 className="mb-1 text-lg font-semibold">{title}</h1>
            {children}
          </Card>
        </div>
      </main>
    </div>
  );
}
