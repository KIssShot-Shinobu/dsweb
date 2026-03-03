"use client";

import { ThemeToggle } from "./theme-toggle";

export function Header() {
    return (
        <header className="dashboard-header">
            <div className="header-search">
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                </svg>
                <input type="text" placeholder="Search..." />
            </div>

            <div className="header-actions">
                <ThemeToggle />
                <button className="header-icon-btn" title="Messages">
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                </button>
                <button className="header-icon-btn" title="Notifications">
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                </button>
                <div className="header-user">
                    <div className="header-user-avatar">A</div>
                    <div className="header-user-info">
                        <span className="header-user-name">Admin</span>
                        <span className="header-user-email">admin@duelstandby.com</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
