import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { getServerDictionary } from "@/lib/i18n/server";

export default async function LeaderboardInfoPage() {
    const { t } = await getServerDictionary();
    const docs = t.leaderboard.docs;

    return (
        <main className="min-h-screen bg-transparent text-base-content">
            <Navbar />
            <section className="border-b border-base-300 pt-28">
                <div className="mx-auto max-w-[1200px] px-4 pb-12 sm:px-6 lg:px-8">
                    <p className="mb-3 text-sm font-bold uppercase tracking-[0.34em] text-primary">{docs.badge}</p>
                    <h1 className="max-w-3xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                        {docs.title}
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-base-content/65 sm:text-base">
                        {docs.subtitle}
                    </p>
                </div>
            </section>

            <section className="mx-auto max-w-[1200px] space-y-6 px-4 py-10 sm:px-6 lg:px-8">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6">
                    <div className="text-sm font-semibold text-base-content/60">{docs.formulaTitle}</div>
                    <div className="mt-3 rounded-box border border-base-300 bg-base-200/50 px-4 py-3 font-mono text-xs text-base-content">
                        {docs.formulaBody}
                    </div>
                    <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-base-content/70">
                        {docs.formulaNotes.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {docs.sections.map((section) => (
                        <div key={section.title} className="rounded-2xl border border-base-300 bg-base-100 p-6">
                            <div className="text-base font-bold text-base-content">{section.title}</div>
                            <p className="mt-2 text-sm text-base-content/70">{section.body}</p>
                        </div>
                    ))}
                </div>

                <div className="rounded-2xl border border-base-300 bg-base-100 p-6">
                    <div className="text-base font-bold text-base-content">{docs.tiersTitle}</div>
                    <p className="mt-2 text-sm text-base-content/70">{docs.tiersBody}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {docs.tiers.map((tier) => (
                            <span key={tier} className="badge badge-outline">
                                {tier}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
