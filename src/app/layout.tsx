import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';
import { DivisionProvider } from '@/contexts/companydivision.context';
import { PrivilegeProvider } from '@/contexts/userPrivilege.context';
import { AuthProvider } from '@/contexts/auth.context';
import { DynamicTitle } from '@/components/common/DynamicTitle';
import { ThemeProvider } from '@/components/theme-wrapper';

export const metadata: Metadata = {
  title: 'Synlio',
  // description: '',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en" suppressHydrationWarning>
    <head>
      {/* Inline script to restore color before paint */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
          (function(){try{
            var c = localStorage.getItem('primary-color');
            if (c) document.documentElement.style.setProperty('--primary', c);
          }catch(e){}})();
          `,
        }}
      />
      <title>Synlio</title>
    </head>
    <body className={`antialiased`} suppressHydrationWarning>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <main>
        <AuthProvider>
            <DynamicTitle />
            <PrivilegeProvider>
              <DivisionProvider>{children}</DivisionProvider>
            </PrivilegeProvider>
            <Toaster position="bottom-right" closeButton />
        </AuthProvider>
      </main>
    </ThemeProvider>
    </body>
    </html>
  );
}