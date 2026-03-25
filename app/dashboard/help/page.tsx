import { dashboardStackCls } from "@/components/dashboard/form-styles";
import { DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { getServerDictionary } from "@/lib/i18n/server";

export default async function DashboardHelpPage() {
    const { t } = await getServerDictionary();
    const help = t.dashboard.help;

    return (
        <DashboardPageShell>
            <div className={dashboardStackCls}>
                <DashboardPageHeader
                    kicker={help.kicker}
                    title={help.title}
                    description={help.description}
                />

                <div className="grid gap-6 lg:grid-cols-2">
                    <DashboardPanel title={help.quickSteps.title} description={help.quickSteps.description}>
                        <div className="space-y-3 text-sm text-base-content/70">
                            {help.quickSteps.items.map((item, index) => (
                                <div key={`help-quick-${index}`} className="rounded-box border border-base-300 bg-base-200/40 px-4 py-3">
                                    {item}
                                </div>
                            ))}
                        </div>
                    </DashboardPanel>

                    <DashboardPanel title={help.faq.title} description={help.faq.description}>
                        <div className="space-y-3 text-sm text-base-content/70">
                            {help.faq.items.map((item, index) => (
                                <div key={`help-faq-${index}`} className="rounded-box border border-base-300 bg-base-200/40 px-4 py-3">
                                    <div className="font-semibold text-base-content">{item.question}</div>
                                    <div className="mt-1 text-sm text-base-content/60">{item.answer}</div>
                                </div>
                            ))}
                        </div>
                    </DashboardPanel>
                </div>
            </div>
        </DashboardPageShell>
    );
}
