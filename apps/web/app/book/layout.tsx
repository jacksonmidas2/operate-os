export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-brand-50 dark:from-gray-950 dark:to-gray-900">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="text-lg font-semibold tracking-tight">
            OperateHQ <span className="text-brand-600">Cleaning</span>
          </a>
          <nav className="flex items-center gap-4 text-sm">
            <a href="/book" className="hover:text-brand-600">Book</a>
            <a href="/book/account" className="hover:text-brand-600">My account</a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">{children}</main>
    </div>
  );
}
