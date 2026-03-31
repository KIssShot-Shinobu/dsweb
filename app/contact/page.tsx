import type { Metadata } from "next";
import { Footer } from "@/components/ui/footer";
import { Navbar } from "@/components/ui/navbar";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
    alternates: {
        canonical: "/contact",
    },
};

export default async function ContactPage() {
    const locale = await getServerLocale();
    const t = getDictionary(locale);

    return (
        <main className="min-h-screen bg-transparent text-base-content">
            <Navbar />
            <section className="border-b border-base-300 pt-28">
                <div className="mx-auto max-w-[1200px] px-4 pb-12 sm:px-6 lg:px-8">
                    <p className="mb-4 text-xs font-bold uppercase tracking-[0.32em] text-primary sm:text-sm">{t.legal.contact.badge}</p>
                    <h1 className="text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">{t.legal.contact.title}</h1>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-base-content/70 sm:text-base">{t.legal.contact.subtitle}</p>
                </div>
            </section>

            <section className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8">
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="card border border-base-300 bg-base-100 shadow-lg">
                        <div className="card-body space-y-4">
                            <h2 className="text-lg font-bold">{t.legal.contact.channelsTitle}</h2>
                            <p className="text-sm text-base-content/70">{t.legal.contact.channelsBody}</p>
                            <div className="flex flex-col gap-3">
                                <a href="mailto:contact@duelstandby.com" className="btn btn-primary w-fit rounded-box">
                                    Email: contact@duelstandby.com
                                </a>
                                <p className="text-sm text-base-content/60">{t.legal.contact.channelsNote}</p>
                            </div>
                        </div>
                    </div>

                    <div className="card border border-base-300 bg-base-100 shadow-lg">
                        <div className="card-body space-y-4">
                            <h2 className="text-lg font-bold">{t.legal.contact.hoursTitle}</h2>
                            <ul className="space-y-2 text-sm text-base-content/70">
                                {t.legal.contact.hoursItems.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                            <div className="rounded-box border border-base-300 bg-base-200/60 px-4 py-3 text-sm text-base-content/65">
                                {t.legal.contact.hoursNote}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}


