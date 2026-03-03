"use client";

import { useEffect, useState } from "react";

interface Tournament {
    id: string;
    title: string;
    gameType: string;
    status: string;
    startDate: string;
    prizePool: number;
}

export function TournamentList() {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/tournaments")
            .then((res) => res.json())
            .then((data) => {
                setTournaments(data.slice(0, 5));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const getStatusClass = (status: string) => {
        switch (status.toUpperCase()) {
            case "ONGOING":
                return "ongoing";
            case "COMPLETED":
                return "completed";
            default:
                return "upcoming";
        }
    };

    const getGameIcon = (gameType: string) => {
        return gameType.toLowerCase().includes("master") ? "🎴" : "📱";
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const formatPrize = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="card">
                <div className="card-header">
                    <span className="card-title">Tournaments</span>
                </div>
                <div className="card-body">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="tournament-item">
                            <div className="skeleton" style={{ width: 42, height: 42, borderRadius: 10 }} />
                            <div style={{ flex: 1 }}>
                                <div className="skeleton" style={{ width: "70%", height: 16, marginBottom: 8 }} />
                                <div className="skeleton" style={{ width: "50%", height: 12 }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">Tournaments</span>
                <a href="/dashboard/tournaments" className="btn btn-outline" style={{ padding: "0.5rem 1rem", fontSize: "0.75rem" }}>
                    + New
                </a>
            </div>
            <div className="card-body">
                {tournaments.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🏆</div>
                        <div className="empty-state-title">No tournaments</div>
                        <p>Create your first tournament</p>
                    </div>
                ) : (
                    tournaments.map((tournament) => (
                        <div key={tournament.id} className="tournament-item">
                            <div
                                className={`tournament-icon ${tournament.gameType.toLowerCase().includes("master") ? "master-duel" : "duel-links"}`}
                            >
                                {getGameIcon(tournament.gameType)}
                            </div>
                            <div className="tournament-info">
                                <div className="tournament-title">{tournament.title}</div>
                                <div className="tournament-meta">
                                    {formatDate(tournament.startDate)} • {formatPrize(tournament.prizePool)}
                                </div>
                            </div>
                            <span className={`tournament-status ${getStatusClass(tournament.status)}`}>
                                {tournament.status}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
