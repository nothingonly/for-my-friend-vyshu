import './globals.css';

export const metadata = {
  title: 'Vyshnavi — A Friendship Day Dedication',
  description: 'An exclusive Obsidian and Gold GPGPU particle experience dedicated to Vyshnavi.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#050505] text-neutral-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
