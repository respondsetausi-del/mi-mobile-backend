import './globals.css'

export const metadata = {
  title: 'MI Mobile Indicator - Dashboard',
  description: 'Admin & Mentor Management Portal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}
