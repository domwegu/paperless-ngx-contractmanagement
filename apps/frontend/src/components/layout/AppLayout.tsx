import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-[240px] flex flex-col min-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
