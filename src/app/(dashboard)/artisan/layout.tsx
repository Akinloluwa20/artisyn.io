import Sidebar from "@/components/artisan/sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { RoleGuard } from "@/components/auth/role-guard";

export default function ArtisanLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<AuthGuard>
			<RoleGuard allowedRoles={["artisan"]}>
				<div className='flex min-h-screen bg-gray-50'>
					{/* Sidebar */}
					<Sidebar />

					{/* Main Content */}
					{/* pt-16 on mobile clears the fixed hamburger button (top-4 = 1rem + button ~2.5rem) */}
					<main className='flex-1 lg:ml-0 pt-16 lg:pt-0'>
						<div className='container mx-auto p-6 lg:p-8'>{children}</div>
					</main>
				</div>
			</RoleGuard>
		</AuthGuard>
	);
}
