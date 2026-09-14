export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center text-2xl font-semibold tracking-tight">routine</p>
        {children}
      </div>
    </main>
  );
}
