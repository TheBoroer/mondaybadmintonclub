import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | Monday Badminton Club",
  description: "Admin panel for Monday Badminton Club",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
