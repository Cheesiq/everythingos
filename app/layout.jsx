import "./globals.css";

export const metadata = {
  title: "everythingOS — Orangopus",
  description: "A web desktop for the Orangopus ecosystem: galaxies, Mycel, tools."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
