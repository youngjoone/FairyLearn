import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useApi from '@/hooks/useApi';
import { Card, CardContent } from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Meta from '@/lib/seo';
import { useToast } from '@/components/ui/ToastProvider';

interface StoryListItem {
    id: number;
    title: string;
    ageRange: string;
    language: string;
    status: string;
    createdAt: string;
    coverImageUrl?: string | null;
}

interface StorageQuota {
    limit: number;
    used: number;
}

const StoriesList: React.FC = () => {
    const { fetchWithErrorHandler } = useApi();
    const { addToast } = useToast();
    const [stories, setStories] = useState<StoryListItem[]>([]);
    const [quota, setQuota] = useState<StorageQuota | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [selectedStories, setSelectedStories] = useState<Set<number>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [storiesData, quotaData] = await Promise.all([
                    fetchWithErrorHandler<StoryListItem[]>('/stories'),
                    fetchWithErrorHandler<StorageQuota>('/storage/me')
                ]);
                
                if (Array.isArray(storiesData)) {
                    const normalized = storiesData.map(item => ({
                        ...item,
                        coverImageUrl: (item as any).coverImageUrl ?? (item as any).cover_image_url ?? null,
                    }));
                    setStories(normalized);
                } else {
                    console.error("API response for stories is not an array:", storiesData);
                    setStories([]); // Set to empty array to prevent crash
                }

                setQuota(quotaData);
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
                addToast(`데이터 로드 실패: ${err instanceof Error ? err.message : String(err)}`, 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [fetchWithErrorHandler, addToast]);

    const selectedCount = selectedStories.size;
    const allSelected = stories.length > 0 && selectedCount === stories.length;

    const toggleStorySelection = (storyId: number) => {
        setSelectedStories(prev => {
            const next = new Set(prev);
            if (next.has(storyId)) {
                next.delete(storyId);
            } else {
                next.add(storyId);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        if (stories.length === 0) return;
        if (allSelected) {
            setSelectedStories(new Set());
        } else {
            setSelectedStories(new Set(stories.map(story => story.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedCount === 0) return;
        if (!window.confirm(`${selectedCount}개의 동화를 삭제하시겠습니까?`)) {
            return;
        }
        setIsBulkDeleting(true);
        const ids = Array.from(selectedStories);
        try {
            await fetchWithErrorHandler('/stories/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyIds: ids }),
            });
            setStories(prev => prev.filter(story => !selectedStories.has(story.id)));
            setQuota(prev => (prev ? { ...prev, used: Math.max(0, prev.used - ids.length) } : prev));
            setSelectedStories(new Set());
            addToast('선택한 동화를 삭제했습니다.', 'success');
        } catch (err) {
            addToast(`동화 삭제 실패: ${err instanceof Error ? err.message : String(err)}`, 'error');
        } finally {
            setIsBulkDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">내 동화</h1>
                <Skeleton className="h-8 w-1/4 mb-4" /> {/* Quota badge skeleton */}
                <div className="flex flex-col gap-4">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                            <CardContent>
                                <Skeleton className="h-6 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <EmptyState
                title="동화 목록을 불러오는데 실패했습니다."
                description={error}
                icon="⚠️"
            />
        );
    }

    return (
        <>
            <Meta title="내 동화 — FairyLearn" description="내가 만든 동화 목록" />
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">내 동화</h1>
                <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
                    {quota && (
                        <div className="p-2 bg-blue-100 text-blue-800 rounded-md">
                            저장 공간: {quota.used} / {quota.limit}
                        </div>
                    )}
                    {stories.length > 0 && (
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-1 text-sm text-muted-foreground">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={allSelected}
                                    onChange={handleSelectAll}
                                />
                                전체 선택
                            </label>
                            <Button
                                variant="destructive"
                                size="sm"
                                isLoading={isBulkDeleting}
                                disabled={selectedCount === 0 || isBulkDeleting}
                                onClick={handleBulkDelete}
                            >
                                선택 삭제
                            </Button>
                            {selectedCount > 0 && (
                                <span className="text-sm text-muted-foreground">
                                    {selectedCount}개 선택됨
                                </span>
                            )}
                        </div>
                    )}
                </div>
                {stories.length === 0 ? (
                    <EmptyState
                        title="저장된 동화가 없습니다."
                        description="새로운 동화를 만들어보세요!"
                        icon="📖"
                    />
                ) : (
                    <div className="flex flex-col gap-4">
                        {stories.map(story => {
                            const isSelected = selectedStories.has(story.id);
                            return (
                                <Card key={story.id}>
                                    <CardContent className="flex gap-4 items-start">
                                        <div className="pt-2">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4"
                                                checked={isSelected}
                                                onChange={() => toggleStorySelection(story.id)}
                                            />
                                        </div>
                                        <Link to={`/stories/${story.id}`} className="flex gap-4 flex-1">
                                            <div className="w-24 h-24 flex-shrink-0 rounded-md border border-gray-200 overflow-hidden bg-muted">
                                                {(() => {
                                                    const coverUrl = buildAssetUrl(story.coverImageUrl);
                                                    return coverUrl ? (
                                                        <img
                                                            src={coverUrl}
                                                            alt={`${story.title} 표지`}
                                                            className="w-full h-full object-cover"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                                                            표지 준비 중
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold">{story.title}</h3>
                                                <p className="text-muted-foreground">생성일: {new Date(story.createdAt).toLocaleString()}</p>
                                                <p className="text-muted-foreground">상태: {story.status}</p>
                                            </div>
                                        </Link>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
};

export default StoriesList;
    const buildAssetUrl = (path?: string | null): string | null => {
        if (!path) return null;
        if (/^https?:\/\//i.test(path)) {
            return path;
        }
        const backendBase = (import.meta.env.VITE_BACKEND_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:8080';
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${backendBase}${normalizedPath}`;
    };
