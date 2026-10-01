import AdminSidebar from "@/components/admin/sidebar";

export const metadata = {
  title: "Admin Panel | Artisyn",
  description: "Artisyn administrative control and content moderation panel",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50/70">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      {/* pt-16 on mobile clears the fixed hamburger button */}
      <main className="flex-1 min-w-0 pt-16 lg:pt-0">
        <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
