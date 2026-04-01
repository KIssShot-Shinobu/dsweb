import type { Metadata } from "next";
import { Footer } from "@/components/ui/footer";
import { Navbar } from "@/components/ui/navbar";
import { getServerLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = {
    alternates: {
        canonical: "/terms",
    },
};


export default async function TermsPage() {
    const locale = await getServerLocale();
    const t = getDictionary(locale);
    return (
        <main className="min-h-screen bg-transparent text-base-content">
            <Navbar />
            <section className="border-b border-base-300 pt-28">
                <div className="mx-auto max-w-[1200px] px-4 pb-14 sm:px-6 lg:px-8">
                    <p className="mb-4 text-xs font-bold uppercase tracking-[0.32em] text-primary sm:text-sm">{t.legal.terms.badge}</p>
                    <h1 className="text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">{t.legal.terms.title}</h1>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-base-content/70 sm:text-base">{t.legal.terms.subtitle}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.24em] text-base-content/45">{t.legal.terms.updatedAt}: 24 Maret 2026</p>
                </div>
            </section>

            <section className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8">
                <div className="space-y-8">
                    <div className="card border border-base-300 bg-base-100 shadow-lg">
                        <div className="card-body space-y-3">
                            <h2 className="text-lg font-bold">{t.legal.terms.accountTitle}</h2>
                            <p className="text-sm text-base-content/70">{t.legal.terms.accountBody}</p>
                        </div>
                    </div>

                    <div className="card border border-base-300 bg-base-100 shadow-lg">
                        <div className="card-body space-y-3">
                            <h2 className="text-lg font-bold">{t.legal.terms.conductTitle}</h2>
                            <ul className="list-disc space-y-2 pl-5 text-sm text-base-content/70">
                                {t.legal.terms.conductItems.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="card border border-base-300 bg-base-100 shadow-lg">
                        <div className="card-body space-y-3">
                            <h2 className="text-lg font-bold">{t.legal.terms.tournamentTitle}</h2>
                            <p className="text-sm text-base-content/70">{t.legal.terms.tournamentBody}</p>
                        </div>
                    </div>

                    <div className="card border border-base-300 bg-base-100 shadow-lg">
                        <div className="card-body space-y-3">
                            <h2 className="text-lg font-bold">{t.legal.terms.ipTitle}</h2>
                            <p className="text-sm text-base-content/70">{t.legal.terms.ipBody}</p>
                        </div>
                    </div>

                    <div className="card border border-base-300 bg-base-100 shadow-lg">
                        <div className="card-body space-y-3">
                            <h2 className="text-lg font-bold">{t.legal.terms.liabilityTitle}</h2>
                            <p className="text-sm text-base-content/70">{t.legal.terms.liabilityBody}</p>
                        </div>
                    </div>

                    <div className="card border border-base-300 bg-base-100 shadow-lg">
                        <div className="card-body space-y-3">
                            <h2 className="text-lg font-bold">{t.legal.terms.changeTitle}</h2>
                            <p className="text-sm text-base-content/70">{t.legal.terms.changeBody}</p>
                        </div>
                    </div>

                    <div className="card border border-base-300 bg-base-100 shadow-lg">
                        <div className="card-body space-y-3">
                            <h2 className="text-lg font-bold">{t.legal.terms.contactTitle}</h2>
                            <p className="text-sm text-base-content/70">{t.legal.terms.contactBody}</p>
                            <a href="mailto:contact@duelstandby.com" className="btn btn-primary w-fit rounded-box">
                                contact@duelstandby.com
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
