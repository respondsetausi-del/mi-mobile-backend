export const metadata = {
  title: 'MI Mobile Indicator Dashboard',
  description: 'Admin & Mentor Portal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
