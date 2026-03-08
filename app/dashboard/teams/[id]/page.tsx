import { TeamDetailClient } from "@/components/dashboard/team-detail-client";

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <TeamDetailClient teamId={id} />;
}