"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { useToast } from "@/components/dashboard/toast";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";

type ChatSender = {
    id: string;
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
    role: string | null;
};

type ChatMessage = {
    id: string;
    content: string;
    attachmentUrls?: string[] | null;
    createdAt: string;
    editedAt?: string | null;
    sender: ChatSender;
};

type ChatResponse = {
    success: boolean;
    messages: ChatMessage[];
};

const MAX_ATTACHMENTS = 3;
const EDIT_WINDOW_MS = 3 * 60 * 1000;

const normalizeAttachments = (value?: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const formatTimestamp = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
};

function AttachmentUploader({
    value,
    onChange,
    disabled,
}: {
    value: string[];
    onChange: (next: string[]) => void;
    disabled?: boolean;
}) {
    const { error } = useToast();
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (file: File) => {
        if (value.length >= MAX_ATTACHMENTS) {
            error("Maksimal 3 lampiran.");
            return;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok || !data?.url) {
                throw new Error(data?.message || "Upload gagal.");
            }
            onChange([...value, data.url]);
        } catch (err) {
            err instanceof Error ? error(err.message) : error("Upload gagal.");
        } finally {
            setUploading(false);
        }
    };

    const removeAttachment = (url: string) => {
        onChange(value.filter((item) => item !== url));
    };

    return (
        <div className="space-y-2">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-box border border-dashed border-base-300 bg-base-200/40 px-4 py-3 transition-all hover:border-primary/40 hover:bg-base-200/70">
                <span className="text-sm text-base-content/55">{uploading ? "Mengunggah file..." : "Tambah lampiran"}</span>
                <span className="btn btn-primary btn-xs rounded-box">Upload</span>
                <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) handleUpload(file);
                        event.currentTarget.value = "";
                    }}
                    disabled={disabled || uploading || value.length >= MAX_ATTACHMENTS}
                />
            </label>
            {value.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {value.map((url) => (
                        <div key={url} className="rounded-box border border-base-300 bg-base-100/70 p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={normalizeAssetUrl(url) || url} alt="Lampiran chat" className="h-24 w-full rounded-box object-cover" />
                            <button type="button" className="mt-2 text-xs text-error" onClick={() => removeAttachment(url)}>
                                Hapus
                            </button>
                        </div>
                    ))}
                </div>
            ) : null}
            <div className="text-xs text-base-content/50">Maksimal {MAX_ATTACHMENTS} lampiran.</div>
        </div>
    );
}

export function MatchChatThread({
    matchId,
    currentUserId,
    readOnly,
    className,
}: {
    matchId: string;
    currentUserId?: string | null;
    readOnly?: boolean;
    className?: string;
}) {
    const { success, error } = useToast();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState("");
    const [attachments, setAttachments] = useState<string[]>([]);
    const [sending, setSending] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);

    const fetchMessages = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/matches/${matchId}/messages?limit=50`);
            const data = (await res.json()) as ChatResponse & { message?: string };
            if (res.ok) {
                setMessages(data.messages || []);
            } else {
                error(data?.message || "Gagal memuat pesan.");
            }
        } catch {
            error("Kesalahan jaringan.");
        } finally {
            setLoading(false);
        }
    }, [matchId, error]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    const handleSend = async () => {
        if (readOnly) return;
        if (!content.trim()) {
            error("Pesan tidak boleh kosong.");
            return;
        }
        setSending(true);
        try {
            const res = await fetch(`/api/matches/${matchId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content,
                    ...(attachments.length ? { attachmentUrls: attachments } : {}),
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessages((prev) => [...prev, data.message]);
                setContent("");
                setAttachments([]);
            } else {
                error(data?.message || "Gagal mengirim pesan.");
            }
        } catch {
            error("Kesalahan jaringan.");
        } finally {
            setSending(false);
        }
    };

    const beginEdit = (message: ChatMessage) => {
        setEditingId(message.id);
        setEditingContent(message.content);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditingContent("");
    };

    const handleSaveEdit = async (messageId: string) => {
        if (!editingContent.trim()) {
            error("Pesan tidak boleh kosong.");
            return;
        }
        try {
            const res = await fetch(`/api/matches/${matchId}/messages/${messageId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: editingContent }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessages((prev) => prev.map((item) => (item.id === messageId ? data.message : item)));
                cancelEdit();
            } else {
                error(data?.message || "Gagal mengubah pesan.");
            }
        } catch {
            error("Kesalahan jaringan.");
        }
    };

    const handleDelete = async (messageId: string) => {
        try {
            const res = await fetch(`/api/matches/${matchId}/messages/${messageId}`, { method: "DELETE" });
            const data = await res.json();
            if (res.ok) {
                setMessages((prev) => prev.filter((item) => item.id !== messageId));
                success("Pesan dihapus.");
            } else {
                error(data?.message || "Gagal menghapus pesan.");
            }
        } catch {
            error("Kesalahan jaringan.");
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const targetId = deleteTarget.id;
        setDeleteTarget(null);
        await handleDelete(targetId);
    };

    const now = Date.now();
    const isWithinEditWindow = (createdAt: string) => {
        const createdTime = new Date(createdAt).getTime();
        return Number.isFinite(createdTime) && now - createdTime <= EDIT_WINDOW_MS;
    };

    const messageItems = useMemo(
        () =>
            messages.map((message) => {
                const attachmentsList = normalizeAttachments(message.attachmentUrls);
                const senderName = message.sender.username || message.sender.fullName || "User";
                const isOwner = currentUserId && message.sender.id === currentUserId;
                const canEdit = Boolean(isOwner && !readOnly && isWithinEditWindow(message.createdAt));

                return (
                    <div key={message.id} className="rounded-box border border-base-300 bg-base-100/60 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <span>{senderName}</span>
                                {message.sender.role ? <span className="badge badge-ghost badge-xs">{message.sender.role}</span> : null}
                            </div>
                            <div className="text-xs text-base-content/50">
                                {formatTimestamp(message.createdAt)}
                                {message.editedAt ? " - edited" : ""}
                            </div>
                        </div>
                        {editingId === message.id ? (
                            <div className="mt-3 space-y-2">
                                <textarea
                                    className={`${inputCls} min-h-[80px]`}
                                    value={editingContent}
                                    onChange={(event) => setEditingContent(event.target.value)}
                                />
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" className={`btn ${btnPrimary}`} onClick={() => handleSaveEdit(message.id)}>
                                        Simpan
                                    </button>
                                    <button type="button" className={`btn ${btnOutline}`} onClick={cancelEdit}>
                                        Batal
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="mt-2 whitespace-pre-wrap text-sm text-base-content/80">{message.content}</p>
                        )}
                        {attachmentsList.length > 0 ? (
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {attachmentsList.map((url) => (
                                    <a key={url} href={normalizeAssetUrl(url) || url} target="_blank" rel="noreferrer" className="block">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={normalizeAssetUrl(url) || url} alt="Lampiran chat" className="h-24 w-full rounded-box object-cover" />
                                    </a>
                                ))}
                            </div>
                        ) : null}
                        {canEdit ? (
                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                <button type="button" className="text-primary" onClick={() => beginEdit(message)}>
                                    Edit
                                </button>
                                <button type="button" className="text-error" onClick={() => setDeleteTarget(message)}>
                                    Hapus
                                </button>
                            </div>
                        ) : null}
                    </div>
                );
            }),
        [messages, currentUserId, readOnly, editingId, editingContent, now]
    );

    return (
        <div className={className}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <div className="text-sm font-semibold">Match Chat</div>
                    <p className="text-xs text-base-content/50">Thread singkat untuk koordinasi jadwal & hasil.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {readOnly ? <span className="badge badge-ghost">Read-only</span> : null}
                    <button type="button" className={`btn ${btnOutline}`} onClick={fetchMessages} disabled={loading}>
                        Refresh
                    </button>
                </div>
            </div>

            <div className="mt-3 space-y-3">
                {loading ? (
                    <div className="text-xs text-base-content/50">Memuat pesan...</div>
                ) : messageItems.length > 0 ? (
                    <div className="space-y-3">{messageItems}</div>
                ) : (
                    <div className="rounded-box border border-dashed border-base-300 p-4 text-center text-xs text-base-content/50">
                        Belum ada pesan.
                    </div>
                )}
            </div>

            <div className="mt-4 space-y-3">
                <label className={labelCls}>Kirim Pesan</label>
                <textarea
                    className={`${inputCls} min-h-[120px]`}
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    disabled={readOnly || sending}
                    placeholder={readOnly ? "Chat read-only (match sudah selesai)." : "Tulis pesan singkat untuk lawan/referee..."}
                />
                <AttachmentUploader value={attachments} onChange={setAttachments} disabled={readOnly || sending} />
                <button type="button" className={`btn ${btnPrimary} w-full sm:w-auto`} onClick={handleSend} disabled={readOnly || sending}>
                    {sending ? "Mengirim..." : "Kirim Pesan"}
                </button>
            </div>

            <ConfirmModal
                open={Boolean(deleteTarget)}
                title="Hapus pesan?"
                message="Pesan dan lampiran yang terkait akan dihapus permanen."
                confirmLabel="Hapus"
                cancelLabel="Batal"
                danger
                onCancel={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
            />
        </div>
    );
}
