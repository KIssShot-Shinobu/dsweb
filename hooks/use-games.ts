"use client";

import { useCallback, useEffect, useState } from "react";

export type GameOption = {
    id: string;
    code: string;
    name: string;
    type?: string | null;
    isOnline?: boolean;
    createdAt?: string | Date;
    updatedAt?: string | Date;
};

type UseGamesOptions = {
    scope?: "public" | "admin";
};

export function useGames({ scope = "public" }: UseGamesOptions = {}) {
    const [games, setGames] = useState<GameOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchGames = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const endpoint = scope === "admin" ? "/api/admin/games" : "/api/games";
            const res = await fetch(endpoint);
            const data = await res.json();
            if (!res.ok || !data?.success) {
                throw new Error(data?.message || "Failed to load games");
            }
            setGames(data.data || []);
        } catch (err) {
            setGames([]);
            setError(err instanceof Error ? err.message : "Failed to load games");
        } finally {
            setLoading(false);
        }
    }, [scope]);

    useEffect(() => {
        fetchGames();
    }, [fetchGames]);

    return { games, loading, error, refresh: fetchGames };
}
