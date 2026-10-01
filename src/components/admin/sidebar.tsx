"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Menu,
  X,
  ShieldCheck,
  MessageSquare,
  BarChart3,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";

export const adminLinks = [
  {
    href: "/admin/curator-verifications",
    label: "Verifications",
    icon: ShieldCheck,
    description: "Curator applications",
  },
  {
    href: "/admin/reviews",
    label: "Review Moderation",
    icon: MessageSquare,
    description: "Queue & abuse reports",
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: BarChart3,
    description: "Platform metrics",
  },
];

const SIDEBAR_ID = "admin-sidebar";

export default function AdminSidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  const isActive = (href: string) => {
    if (href === "/admin/reviews") {
      return pathname.startsWith("/admin/reviews");
    }
    return pathname === href;
  };

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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md border border-gray-200 text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#605DEC]"
        aria-label={isMobileMenuOpen ? "Close admin navigation menu" : "Open admin navigation menu"}
        aria-expanded={isMobileMenuOpen}
        aria-controls={SIDEBAR_ID}
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-gray-700" aria-hidden="true" />
        ) : (
          <Menu className="w-6 h-6 text-gray-700" aria-hidden="true" />
        )}
      </button>

      {/* Mobile Overlay */}
      <div
        className={`lg:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity duration-200 ${
          isMobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        id={SIDEBAR_ID}
        ref={sidebarRef}
        className={`
          fixed lg:sticky top-0 inset-y-0 left-0 z-40
          w-64 h-screen bg-white border-r border-gray-200
          transform transition-transform duration-200 ease-in-out
          flex flex-col shadow-xs lg:shadow-none
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        aria-label="Admin navigation"
      >
        <div className="flex-1 overflow-y-auto flex flex-col justify-between">
          <div className="p-6">
            {/* Header Brand */}
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-100">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#F4F3FE] text-[#605DEC]">
                <ShieldAlert className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 leading-tight">
                  Artisyn Admin
                </h2>
                <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5">
                  Moderator
                </span>
              </div>
            </div>

            <div className="mb-3 px-1">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Management
              </h3>
            </div>

            <nav className="space-y-1.5" aria-label="Admin Navigation">
              {adminLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobileMenu}
                    aria-current={active ? "page" : undefined}
                    className={`
                      group flex items-center gap-3 px-3.5 py-3 rounded-lg
                      transition-all duration-150 text-sm font-medium
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-[#605DEC]
                      ${
                        active
                          ? "bg-[#F4F3FE] text-[#605DEC] shadow-2xs font-semibold"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }
                    `}
                  >
                    <Icon
                      className={`w-5 h-5 transition-colors ${
                        active
                          ? "text-[#605DEC]"
                          : "text-gray-400 group-hover:text-gray-600"
                      }`}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{link.label}</div>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Footer Back Link */}
          <div className="p-6 border-t border-gray-100">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors p-2 rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#605DEC]"
            >
              <ArrowLeft className="w-4 h-4 text-gray-400" aria-hidden="true" />
              <span>Back to Marketplace</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
