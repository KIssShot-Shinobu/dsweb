"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/hooks/use-locale";

type DistributionItem = {
    id: string;
    username: string;
    province: string | null;
    city: string | null;
    country?: string | null;
    latitude: number;
    longitude: number;
    memberCount?: number;
};

type DistributionStats = {
    totalMembers: number;
    topCities: Array<{ name: string; count: number }>;
    topProvince: { name: string; count: number } | null;
};

type ApiResponse = {
    success: boolean;
    data: DistributionItem[];
    stats: DistributionStats;
};

const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION = "&copy; OpenStreetMap contributors | &copy; CARTO";
const DEFAULT_CENTER: [number, number] = [-2.5, 118.0];
const DEFAULT_ZOOM = 4;

function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function buildDisplayName(item: DistributionItem) {
    if (!item.memberCount || item.memberCount <= 1) return item.username;
    const remaining = Math.max(item.memberCount - 1, 0);
    return remaining > 0 ? `${item.username} +${remaining}` : item.username;
}

function buildPopupContent(
    item: DistributionItem,
    labels: { members: string; member: string; international: string }
) {
    const displayName = escapeHtml(buildDisplayName(item));
    const countLabel = escapeHtml(item.memberCount && item.memberCount > 1 ? `${item.memberCount} ${labels.members}` : `1 ${labels.member}`);
    const location = escapeHtml(item.city || item.province || item.country || labels.international);
    return `
        <div class="ds-member-popup-content">
            <div class="ds-member-popup-name">${displayName}</div>
            <div class="ds-member-popup-location">${location}</div>
            <div class="ds-member-popup-count">${countLabel}</div>
        </div>
    `;
}

function buildTooltipContent(
    item: DistributionItem,
    labels: { members: string; member: string; international: string }
) {
    const location = item.city || item.province || item.country || labels.international;
    return `${buildDisplayName(item)} | ${location}`;
}

export function MemberDistributionMap() {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const clusterRef = useRef<any>(null);
    const leafletRef = useRef<any>(null);
    const mapMountedRef = useRef(false);
    const [items, setItems] = useState<DistributionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const { t } = useLocale();

    const loadDistribution = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/public/members/distribution", { cache: "no-store", signal });
            const json = (await response.json()) as ApiResponse;
            if (!response.ok || !json.success) {
                throw new Error(t.map.error);
            }
            setItems(json.data || []);
        } catch (err: unknown) {
            // Ignore abort errors from unmount/refresh cancellation.
            if (err instanceof DOMException && err.name === "AbortError") return;
            setError(err instanceof Error ? err.message : t.map.error);
        } finally {
            setLoading(false);
        }
    }, [t.map.error]);

    useEffect(() => {
        const controller = new AbortController();
        void loadDistribution(controller.signal);

        const intervalId = window.setInterval(() => {
            void loadDistribution();
        }, 15000);

        const handleFocus = () => {
            void loadDistribution();
        };
        window.addEventListener("focus", handleFocus);

        return () => {
            controller.abort();
            window.clearInterval(intervalId);
            window.removeEventListener("focus", handleFocus);
        };
    }, [loadDistribution]);

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;
        let mounted = true;

        (async () => {
            const leafletImport = await import("leaflet");
            const L = (leafletImport as any).default ?? leafletImport;
            await import("leaflet.markercluster");

            if (!mounted) return;

            leafletRef.current = L;
            const map = L.map(mapContainerRef.current, {
                zoomControl: false,
                attributionControl: true,
            }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

            L.tileLayer(TILE_URL, { maxZoom: 18, attribution: TILE_ATTRIBUTION }).addTo(map);
            map.attributionControl.setPrefix("");
            L.control.zoom({ position: "bottomright" }).addTo(map);

            const clusterGroup = (L as any).markerClusterGroup({
                showCoverageOnHover: false,
                spiderfyOnMaxZoom: true,
                maxClusterRadius: 40,
                iconCreateFunction: (cluster: { getChildCount: () => number }) => {
                    const count = cluster.getChildCount();
                    return L.divIcon({
                        html: `<div class="cluster-marker"><span>${count}</span></div>`,
                        className: "cluster-wrapper",
                        iconSize: [40, 40],
                    });
                },
            });

            clusterGroup.addTo(map);
            mapRef.current = map;
            clusterRef.current = clusterGroup;
            mapMountedRef.current = true;
            setMapReady(true);
        })();

        return () => {
            mounted = false;
            mapMountedRef.current = false;
            if (clusterRef.current) {
                try {
                    clusterRef.current.clearLayers();
                    clusterRef.current.remove();
                } catch {
                    // ignore cleanup errors
                }
                clusterRef.current = null;
            }
            if (mapRef.current) {
                try {
                    mapRef.current.remove();
                } catch {
                    // ignore cleanup errors
                }
                mapRef.current = null;
            }
            leafletRef.current = null;
            setMapReady(false);
        };
    }, []);

    useEffect(() => {
        if (!mapReady || !mapMountedRef.current || !mapRef.current || !clusterRef.current || !leafletRef.current) return;

        const L = leafletRef.current;
        const clusterGroup = clusterRef.current;
        clusterGroup.clearLayers();

        items.forEach((item) => {
            const icon = L.divIcon({
                className: "ds-member-marker",
                html: '<div class="ds-marker-dot"></div>',
                iconSize: [12, 12],
                iconAnchor: [6, 6],
            });

            const marker = L.marker([item.latitude, item.longitude], { icon });
            marker.bindTooltip(
                buildTooltipContent(item, {
                    members: t.map.membersLabel,
                    member: t.map.memberLabel,
                    international: t.map.locationFallback,
                }),
                { direction: "top", opacity: 1, offset: [0, -8], className: "ds-map-tooltip" }
            );
            marker.bindPopup(
                buildPopupContent(item, {
                    members: t.map.membersLabel,
                    member: t.map.memberLabel,
                    international: t.map.locationFallback,
                }),
                { closeButton: false, maxWidth: 240, className: "ds-map-popup" }
            );
            marker.on("click", () => {
                const nextZoom = Math.min(mapRef.current.getZoom() + 2, 8);
                mapRef.current.setView([item.latitude, item.longitude], nextZoom, { animate: true });
            });

            clusterGroup.addLayer(marker);
        });

        if (items.length === 1) {
            mapRef.current.setView([items[0].latitude, items[0].longitude], 5.5, { animate: true });
            return;
        }

        if (items.length > 1) {
            const bounds = clusterGroup.getBounds();
            mapRef.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 6.5 });
        }
    }, [items, mapReady, t.map.membersLabel, t.map.memberLabel, t.map.locationFallback]);

    if (error) {
        return (
            <div className="flex h-full w-full items-center justify-center rounded-box border border-base-300 bg-base-200/40 px-6 text-center text-sm text-error">
                {error}
            </div>
        );
    }

    return (
        <div className="relative isolate z-0 h-full w-full">
            {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-box bg-base-200/70 text-sm text-base-content/70">
                    {t.map.loading}
                </div>
            )}
            <div ref={mapContainerRef} className="h-full w-full rounded-box overflow-hidden" />
            <style jsx global>{`
                .ds-marker-dot {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: #00ffff;
                    box-shadow: 0 0 8px #00ffff, 0 0 16px #00ffff, 0 0 24px #00ffff;
                    animation: pulse 2s infinite;
                }

                .cluster-wrapper {
                    background: transparent !important;
                }

                .cluster-marker {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: rgba(0, 255, 255, 0.18);
                    border: 2px solid rgba(0, 255, 255, 0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #e5feff;
                    font-weight: 700;
                    box-shadow: 0 0 18px rgba(0, 255, 255, 0.45);
                }

                .leaflet-control-attribution {
                    font-size: 10px;
                    opacity: 0.55;
                    padding: 2px 6px;
                    margin: 0 6px 6px 0;
                    border-radius: 999px;
                    background: rgba(10, 12, 16, 0.65);
                }

                .leaflet-tooltip.ds-map-tooltip {
                    background: rgba(8, 16, 26, 0.95);
                    border: 1px solid rgba(0, 255, 255, 0.35);
                    color: #e5feff;
                    font-size: 11px;
                    font-weight: 600;
                    border-radius: 10px;
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
                }

                .leaflet-tooltip.ds-map-tooltip:before {
                    border-top-color: rgba(8, 16, 26, 0.95);
                }

                .ds-map-popup .leaflet-popup-content-wrapper {
                    background: rgba(8, 16, 26, 0.97);
                    color: #e5feff;
                    border: 1px solid rgba(0, 255, 255, 0.35);
                    border-radius: 12px;
                    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
                }

                .ds-map-popup .leaflet-popup-content {
                    margin: 10px 12px;
                }

                .ds-map-popup .leaflet-popup-tip {
                    background: rgba(8, 16, 26, 0.97);
                    border: 1px solid rgba(0, 255, 255, 0.35);
                    box-shadow: none;
                }

                .ds-member-popup-content {
                    min-width: 150px;
                    font-size: 12px;
                    line-height: 1.35;
                }

                .ds-member-popup-name {
                    font-weight: 700;
                    color: #e5feff;
                    margin-bottom: 4px;
                }

                .ds-member-popup-location {
                    color: rgba(229, 254, 255, 0.78);
                    margin-bottom: 2px;
                }

                .ds-member-popup-count {
                    color: rgba(255, 252, 210, 0.88);
                    font-weight: 600;
                    font-size: 11px;
                }

                .leaflet-container {
                    z-index: 0;
                }

                .leaflet-pane,
                .leaflet-top,
                .leaflet-bottom {
                    z-index: 1;
                }

                .leaflet-control {
                    z-index: 2;
                }

                @keyframes pulse {
                    0% {
                        transform: scale(1);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.5);
                        opacity: 0.6;
                    }
                    100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
}
