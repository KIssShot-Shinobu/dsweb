export function Footer() {
    return (
        <footer className="bg-black py-12 border-t border-zinc-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
                <p className="text-zinc-500 text-sm mb-4">
                    &copy; {new Date().getFullYear()} DuelStandby. All rights reserved.
                </p>
                <div className="flex gap-6">
                    <a href="#" className="text-zinc-500 hover:text-white transition-colors">Privacy Policy</a>
                    <a href="#" className="text-zinc-500 hover:text-white transition-colors">Terms of Service</a>
                    <a href="#" className="text-zinc-500 hover:text-white transition-colors">Contact</a>
                </div>
            </div>
        </footer>
    );
}
