"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { Menu, X, CreditCard, OctagonAlert, TrendingUp } from "lucide-react";
import {
	HomeIcon,
	ReportIcon,
	UserIcon,
	FeedbackIcon,
	SettingsIcon,
} from "@/icons";

const SIDEBAR_ID = "artisan-sidebar";

export default function Sidebar() {
	const pathname = usePathname();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const sidebarRef = useRef<HTMLElement>(null);
	const toggleButtonRef = useRef<HTMLButtonElement>(null);

	const artisanLinks = [
		{
			href: "/artisan/dashboard",
			label: "Dashboard",
			icon: HomeIcon,
		},
		{
			href: "/artisan/jobs",
			label: "Jobs",
			icon: ReportIcon,
		},
		{
			href: "/artisan/earnings",
			label: "Earnings",
			icon: TrendingUp,
		},
		{
			href: "/artisan/profile",
			label: "Profile",
			icon: UserIcon,
		},
		{
			href: "/artisan/feedback",
			label: "Feedback",
			icon: FeedbackIcon,
		},
	];

	const accountLinks = [
		{
			href: "/artisan/settings",
			label: "Account Settings",
			icon: SettingsIcon,
		},
		{
			href: "/artisan/help",
			label: "Help",
			icon: UserIcon,
		},
	];

	const isActive = (href: string) => pathname === href;

	const closeMobileMenu = useCallback(() => {
		setIsMobileMenuOpen(false);
	}, []);

	// Close on Escape key
	useEffect(() => {
		if (!isMobileMenuOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				closeMobileMenu();
				toggleButtonRef.current?.focus();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isMobileMenuOpen, closeMobileMenu]);

	// Focus trap: keep focus inside sidebar when open on mobile
	useEffect(() => {
		if (!isMobileMenuOpen) return;

		const sidebar = sidebarRef.current;
		if (!sidebar) return;

		const focusableSelectors =
			'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

		const getFocusable = () =>
			Array.from<HTMLElement>(sidebar.querySelectorAll(focusableSelectors));

		// Move focus into the sidebar
		const firstFocusable = getFocusable()[0];
		firstFocusable?.focus();

		const handleTabKey = (e: KeyboardEvent) => {
			if (e.key !== "Tab") return;

			const focusable = getFocusable();
			const first = focusable[0];
			const last = focusable[focusable.length - 1];

			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last?.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first?.focus();
				}
			}
		};

		document.addEventListener("keydown", handleTabKey);
		return () => document.removeEventListener("keydown", handleTabKey);
	}, [isMobileMenuOpen]);

	// Return focus to toggle button when sidebar closes
	useEffect(() => {
		if (!isMobileMenuOpen) {
			// Only refocus if the sidebar itself held focus before closing
			if (sidebarRef.current?.contains(document.activeElement)) {
				toggleButtonRef.current?.focus();
			}
		}
	}, [isMobileMenuOpen]);

	return (
		<>
			{/* Mobile Menu Toggle Button */}
			<button
				ref={toggleButtonRef}
				onClick={() => setIsMobileMenuOpen((prev) => !prev)}
				className='lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#605DEC]'
				aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
				aria-expanded={isMobileMenuOpen}
				aria-controls={SIDEBAR_ID}>
				{isMobileMenuOpen ? (
					<X className='w-6 h-6 text-gray-700' aria-hidden='true' />
				) : (
					<Menu className='w-6 h-6 text-gray-700' aria-hidden='true' />
				)}
			</button>

			{/* Mobile Overlay */}
			<div
				className={`lg:hidden fixed inset-0 bg-black/30 z-40 transition-opacity duration-200 ${
					isMobileMenuOpen
						? "opacity-100 pointer-events-auto"
						: "opacity-0 pointer-events-none"
				}`}
				onClick={closeMobileMenu}
				aria-hidden='true'
			/>

			{/* Sidebar */}
			<aside
				id={SIDEBAR_ID}
				ref={sidebarRef}
				className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-gray-50 border-r border-gray-300
          transform transition-transform duration-200 ease-in-out
          flex flex-col
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
				aria-label='Artisan navigation'>
				{/* Navigation - Scrollable */}
				<div className='flex-1 overflow-y-auto'>
					{/* ARTISAN Section */}
					<div className='p-6'>
						<h3 className='text-sm font-semibold text-gray-600 uppercase tracking-tight mb-4'>
							ARTISAN
						</h3>
						<nav className='space-y-1' aria-label='Main'>
							{artisanLinks.map((link) => {
								const Icon = link.icon;
								const active = isActive(link.href);

								return (
									<Link
										key={link.href}
										href={link.href}
										onClick={closeMobileMenu}
										aria-current={active ? "page" : undefined}
										className={`
                      flex items-center gap-3 px-3 py-3 rounded-lg
                      transition-colors duration-150 text-sm
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-[#605DEC]
                      ${
									active
										? "bg-[#F4F3FE] text-[#605DEC] font-medium"
										: "text-gray-700 hover:bg-gray-100"
								}
                    `}>
										<Icon className='w-5 h-5' aria-hidden='true' />
										<span>{link.label}</span>
									</Link>
								);
							})}
						</nav>
					</div>

					{/* ACCOUNT Section */}
					<div className='px-6 pb-6'>
						<h3 className='text-sm font-semibold text-gray-600 uppercase tracking-tight mb-4'>
							ACCOUNT
						</h3>
						<nav className='space-y-1' aria-label='Account'>
							{accountLinks.map((link) => {
								const Icon = link.icon;
								const active = isActive(link.href);

								return (
									<Link
										key={link.href}
										href={link.href}
										onClick={closeMobileMenu}
										aria-current={active ? "page" : undefined}
										className={`
                      flex items-center gap-3 px-3 py-3 rounded-lg
                      transition-colors duration-150 text-sm
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-[#605DEC]
                      ${
								active
									? "bg-[#F4F3FE] text-[#605DEC] font-medium"
									: "text-gray-700 hover:bg-gray-100"
							}
                    `}>
										<Icon className='w-5 h-5' aria-hidden='true' />
										<span>{link.label}</span>
									</Link>
								);
							})}
						</nav>
					</div>
				</div>

				{/* Current Plan Widget - Fixed at Bottom */}
				<div className='p-3 border rounded-lg border-gray-200 bg-white mx-3 mb-3'>
					<div className='mb-3'>
						<div className='flex items-center justify-between mb-1'>
							<span className='text-sm font-semibold text-gray-900'>
								Current Plan
							</span>
							<span className='text-xs font-semibold text-gray-600 bg-white border border-gray-300 px-2 py-1 rounded-xl'>
								Free
							</span>
						</div>
					</div>

					<div className='mb-5 p-3 bg-[#F4F3FE] border rounded-lg'>
						<div>
							<div className='flex items-center gap-2 mb-2'>
								<OctagonAlert className='text-[#D97706] size-4' aria-hidden='true' />
								<p className='text-sm font-medium text-[#D97706]'>
									Free Plan Limitations
								</p>
							</div>

							<p className='text-sm text-gray-600'>
								Upgrade to premium to verify artisans and access
								additional features
							</p>
						</div>
					</div>

					<button className='w-full bg-[#605DEC] text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#605DEC]'>
						<CreditCard className='w-4 h-4' aria-hidden='true' />
						Upgrade
					</button>
				</div>
			</aside>
		</>
	);
}
