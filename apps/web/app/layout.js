import "./globals.css";

export const metadata = {
  title: "Sign Se Pehle — Before you sign",
  description:
    "Upload a builder-buyer agreement and see which clauses to question before you sign, in plain Hindi or English.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
