import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useApi from '@/hooks/useApi';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/FormControls/Select';
import Meta from '@/lib/seo';
import { useToast } from '@/components/ui/ToastProvider';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import SharedStoryComments from '@/components/SharedStoryComments';

interface StoryPageData {
    id?: number;
    pageNo: number;
    text: string;
}

interface StoryDetailData {
    id: number;
    title: string;
    ageRange: string;
    topics: string[];
    language: string;
    lengthLevel?: string | null;
    status: string;
    createdAt: string;
    pages: StoryPageData[];
    quiz?: { q: string; a: string }[];
    fullAudioUrl?: string;
    shareSlug?: string;
    sharedAt?: string;
    manageable?: boolean;
    authorNickname?: string | null;
    authorId?: number | null;
}

interface SharedStoryDetailResponse {
    share_slug: string;
    title: string;
    shared_at: string;
    manageable: boolean;
    like_count: number;
    liked_by_current_user: boolean;
    comment_count: number;
    story: any;
}

const languageOptions = [
    { value: 'English', label: '영어' },
    { value: 'Korean', label: '한국어' },
    { value: 'Chinese', label: '중국어' },
    { value: 'French', label: '불어' },
    { value: 'Spanish', label: '스페인어' },
];

const StoryDetail: React.FC = () => {
    const { id, slug } = useParams<{ id?: string; slug?: string }>();
    const navigate = useNavigate();
    const { fetchWithErrorHandler } = useApi();
    const { addToast } = useToast();
    const { isLoggedIn } = useAuth();
    const [story, setStory] = useState<StoryDetailData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isTranslating, setIsTranslating] = useState<boolean>(false);
    const [isCreatingStorybook, setIsCreatingStorybook] = useState<boolean>(false);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false); // 오디오 생성 로딩 상태
    const [isSharing, setIsSharing] = useState<boolean>(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
    const [targetLanguage, setTargetLanguage] = useState<string>('English');
    const [error, setError] = useState<string>('');
    const [shareLink, setShareLink] = useState<string>('');
    const [isAudioVisible, setIsAudioVisible] = useState<boolean>(false);
    const [storyLikeCount, setStoryLikeCount] = useState<number>(0);
    const [storyLiked, setStoryLiked] = useState<boolean>(false);
    const [commentCount, setCommentCount] = useState<number>(0);
    const isSharedView = Boolean(slug);
    const canManage = story?.manageable ?? !isSharedView;
    const audioRef = useRef<HTMLAudioElement | null>(null);

    interface ShareResponse {
        shareSlug: string;
        shareUrl: string;
    }

    const normalizeStory = (raw: any): StoryDetailData => {
        if (!raw) {
            throw new Error('Story payload is empty');
        }

        const topics = raw.topics ?? raw.topics_json ?? [];
        const pages: StoryPageData[] = (raw.pages ?? []).map((page: any) => ({
            id: page.id,
            pageNo: page.pageNo ?? page.page_no ?? 0,
            text: page.text ?? '',
        }));

        return {
            id: raw.id,
            title: raw.title,
            ageRange: raw.ageRange ?? raw.age_range ?? '',
            topics: Array.isArray(topics) ? topics : String(topics ?? '').split(',').filter(Boolean),
            language: raw.language,
            lengthLevel: raw.lengthLevel ?? raw.length_level ?? null,
            status: raw.status ?? '',
            createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
            pages,
            quiz: raw.quiz,
            fullAudioUrl: raw.fullAudioUrl ?? raw.full_audio_url,
            shareSlug: raw.shareSlug ?? raw.share_slug,
            sharedAt: raw.sharedAt ?? raw.shared_at,
            manageable: raw.manageable,
            authorNickname: raw.authorNickname ?? raw.author_nickname ?? null,
            authorId: raw.authorId ?? raw.author_id ?? null,
        };
    };

    useEffect(() => {
        const fetchStory = async () => {
            if (!id && !slug) {
                setError('잘못된 링크입니다.');
                return;
            }
            setIsLoading(true);
            try {
                if (isSharedView && slug) {
                    const data = await fetchWithErrorHandler<SharedStoryDetailResponse>(
                        `/public/shared-stories/${slug}`
                    );
                    const normalized = normalizeStory(data.story);
                    normalized.shareSlug = normalized.shareSlug ?? data.share_slug;
                    normalized.sharedAt = normalized.sharedAt ?? data.shared_at;
                    normalized.manageable = data.manageable;
                    console.log('[StoryDetail] shared load success', normalized);
                    setStory(normalized);
                    setShareLink(`${window.location.origin}/shared/${data.share_slug}`);
                    setStoryLikeCount(data.like_count ?? 0);
                    setStoryLiked(data.liked_by_current_user ?? false);
                    setCommentCount(data.comment_count ?? 0);
                } else if (id) {
                    const raw = await fetchWithErrorHandler<any>(
                        `/stories/${id}`
                    );
                    const normalized = normalizeStory(raw);
                    normalized.manageable = normalized.manageable ?? true;
                    console.log('[StoryDetail] owner load success', normalized);
                    setStory(normalized);
                    if (normalized.shareSlug) {
                        setShareLink(`${window.location.origin}/shared/${normalized.shareSlug}`);
                    } else {
                        setShareLink('');
                    }
                    setStoryLikeCount(0);
                    setStoryLiked(false);
                    setCommentCount(0);
                }
            } catch (err) {
                console.error('[StoryDetail] load error', err);
                setError(err instanceof Error ? err.message : String(err));
                addToast(`동화 불러오기 실패: ${err instanceof Error ? err.message : String(err)}`, 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchStory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, slug, isSharedView, fetchWithErrorHandler, addToast]);

    useEffect(() => {
        setIsAudioVisible(false);
    }, [story?.id, story?.shareSlug]);

    useEffect(() => {
        if (isAudioVisible && story?.fullAudioUrl && audioRef.current) {
            audioRef.current.load();
        }
    }, [isAudioVisible, story?.fullAudioUrl]);

    useEffect(() => {
        // 스토리가 바뀌면 오디오 플레이어는 다시 숨김 상태로 초기화
        setIsAudioVisible(false);
    }, [story?.id, story?.shareSlug]);

    useEffect(() => {
        if (isAudioVisible && story?.fullAudioUrl && audioRef.current) {
            audioRef.current.load();
        }
    }, [isAudioVisible, story?.fullAudioUrl]);

    const handleTranslate = async () => {
        if (!story) return;
        console.log(`Translating story ${story.id} to ${targetLanguage}`);
        addToast(`'${targetLanguage}'로 번역 기능은 현재 구현 중입니다.`, 'info');
    };

    const handleCreateStorybook = async () => {
        if (!story) return;
        const sharedSlug = story.shareSlug || slug;
        const storyId = story.id;

        if (!canManage) {
            if (!sharedSlug) {
                addToast('공유 정보를 확인할 수 없습니다.', 'error');
                return;
            }
            setIsCreatingStorybook(true);
            try {
                await fetchWithErrorHandler(`/public/shared-stories/${sharedSlug}/storybook`, { method: 'POST' });
                navigate(`/shared/${sharedSlug}/storybook`);
            } catch (err) {
                addToast(`동화책 생성 실패: ${err instanceof Error ? err.message : String(err)}`, 'error');
            } finally {
                setIsCreatingStorybook(false);
            }
            return;
        }

        if (!storyId) return;
        setIsCreatingStorybook(true);
        try {
            await fetchWithErrorHandler(`/stories/${storyId}/storybook`, { method: 'POST' });
            addToast('동화책 생성을 시작합니다! 잠시 후 동화책 보기 페이지로 이동합니다.', 'success');
            if (sharedSlug) {
                navigate(`/shared/${sharedSlug}/storybook`);
            } else {
                navigate(`/storybook/${storyId}`);
            }
        } catch (err) {
            addToast(`동화책 생성 실패: ${err instanceof Error ? err.message : String(err)}`, 'error');
        } finally {
            setIsCreatingStorybook(false);
        }
    };

    const handleToggleStoryLike = async () => {
        const targetSlug = slug || story?.shareSlug;
        if (!targetSlug) {
            return;
        }
        if (!isLoggedIn) {
            addToast('좋아요를 누르려면 로그인해 주세요.', 'info');
            return;
        }
        try {
            const response = await fetchWithErrorHandler<{ likeCount: number; liked: boolean }>(
                `/public/shared-stories/${targetSlug}/likes`,
                { method: 'POST' }
            );
            const likeCount = response.likeCount ?? (response as any).like_count ?? 0;
            const liked = response.liked ?? (response as any).liked ?? false;
            setStoryLikeCount(likeCount);
            setStoryLiked(liked);
        } catch (err) {
            console.error('[StoryDetail] toggle like error', err);
            addToast('좋아요 처리에 실패했습니다.', 'error');
        }
    };

    const handleCommentCountChange = (count: number) => {
        setCommentCount(count);
    };

    const ensureShareLink = () => {
        if (shareLink) {
            return shareLink;
        }
        const slugSource = story?.shareSlug || slug;
        if (!slugSource) {
            return '';
        }
        return `${window.location.origin}/shared/${slugSource}`;
    };

    const handleShareStory = async () => {
        if (!canManage) {
            addToast('이미 공유된 동화입니다.', 'info');
            return;
        }
        if (!id) return;
        setIsSharing(true);
        try {
            const response = await fetchWithErrorHandler<ShareResponse>(`/stories/${id}/share`, { method: 'POST' });
            setStory(prev => prev ? { ...prev, shareSlug: response.shareSlug } : prev);
            setShareLink(response.shareUrl);
            addToast('공유 게시판에 등록되었어요. 링크를 복사해 공유해보세요!', 'success');
        } catch (err) {
            addToast(`공유하기 실패: ${err instanceof Error ? err.message : String(err)}`, 'error');
        } finally {
            setIsSharing(false);
        }
    };

    const handleCopyShareLink = async () => {
        const linkToCopy = ensureShareLink();
        if (!linkToCopy) {
            addToast('공유 링크를 생성한 뒤 다시 시도해주세요.', 'error');
            return;
        }
        try {
            await navigator.clipboard.writeText(linkToCopy);
            addToast('공유 링크를 복사했습니다.', 'success');
        } catch (err) {
            console.error('Failed to copy share link', err);
            addToast('클립보드 복사에 실패했어요.', 'error');
        }
    };

    const handleGenerateAudio = async () => {
        if (!story) return;
        const sharedSlug = story.shareSlug || slug;
        const storyId = story.id;

        if (!canManage) {
            if (story.fullAudioUrl) {
                setIsAudioVisible(true);
                setTimeout(() => {
                    audioRef.current?.play().catch(() => {
                        addToast('브라우저가 자동 재생을 막았어요. 플레이 버튼을 눌러주세요.', 'info');
                    });
                }, 0);
                return;
            }
            if (!sharedSlug) {
                addToast('공유 정보를 확인할 수 없습니다.', 'error');
                return;
            }
            setIsGeneratingAudio(true);
            try {
                const audioUrl = await fetchWithErrorHandler<string>(
                    `/public/shared-stories/${sharedSlug}/audio`,
                    { method: 'POST' }
                );
                setStory(prev => prev ? { ...prev, fullAudioUrl: audioUrl } : prev);
                setShareLink(`${window.location.origin}/shared/${sharedSlug}`);
                addToast('AI 음성을 생성했어요!', 'success');
                setIsAudioVisible(true);
                setTimeout(() => {
                    audioRef.current?.play().catch(() => {
                        addToast('브라우저가 자동 재생을 막았어요. 플레이 버튼을 눌러주세요.', 'info');
                    });
                }, 300);
            } catch (err) {
                addToast(`오디오 생성 실패: ${err instanceof Error ? err.message : String(err)}`, 'error');
            } finally {
                setIsGeneratingAudio(false);
            }
            return;
        }

        if (!storyId) return;
        setIsGeneratingAudio(true);
        try {
            const audioUrl = await fetchWithErrorHandler<string>(`/stories/${storyId}/audio`, { method: 'POST' });
            setStory(prevStory => prevStory ? { ...prevStory, fullAudioUrl: audioUrl } : null);
            addToast('오디오 생성에 성공했습니다!', 'success');
            setIsAudioVisible(true);
            setTimeout(() => {
                audioRef.current?.play().catch(() => {
                    addToast('브라우저가 자동 재생을 막았어요. 플레이 버튼을 눌러주세요.', 'info');
                });
            }, 300);
        } catch (err) {
            addToast(`오디오 생성 실패: ${err instanceof Error ? err.message : String(err)}`, 'error');
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const handleDelete = async () => {
        if (!canManage) return;
        if (!window.confirm('정말로 이 동화를 삭제하시겠습니까?')) {
            return;
        }
        try {
            await fetchWithErrorHandler(`/stories/${story?.id ?? id}`, {
                method: 'DELETE',
            });
            addToast('동화가 성공적으로 삭제되었습니다.', 'success');
            navigate('/stories');
        } catch (err) {
            addToast(`동화 삭제 실패: ${err instanceof Error ? err.message : String(err)}`, 'error');
        }
    };

    if (isLoading) {
        return (
            <div className="p-4">
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2 mb-2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4 mb-4" />
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <EmptyState
                title="동화를 불러오는데 실패했습니다."
                description={error}
                icon="⚠️"
            />
        );
    }

    if (!story) {
        return (
            <EmptyState
                title="동화를 찾을 수 없습니다."
                description="해당 ID의 동화가 존재하지 않습니다."
                icon="🔍"
            />
        );
    }

    // Handle both old (/audio/...) and new (/api/audio/...) URL formats
    let finalAudioUrl = story.fullAudioUrl || '';
    if (finalAudioUrl && !finalAudioUrl.startsWith('/api')) {
        finalAudioUrl = `/api${finalAudioUrl}`;
    }

    return (
        <>
            <Meta title={story.title} description={`동화: ${story.title}`} />
            <div className="p-4">
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <h1 className="text-2xl font-bold mb-2">{story.title}</h1>
                        {story.authorNickname && (
                            <p className="text-sm text-muted-foreground">
                                작성자: {story.authorNickname}
                            </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                            생성일: {new Date(story.createdAt).toLocaleString()} | 상태: {story.status}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            연령대: {story.ageRange} | 언어: {story.language} | 길이: {story.lengthLevel}
                        </p>
                        {story.topics && story.topics.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                                주제: {story.topics.join(', ')}
                            </p>
                        )}
                        {story.sharedAt && (
                            <p className="text-sm text-muted-foreground">
                                공유일: {new Date(story.sharedAt).toLocaleString()}
                            </p>
                        )}
                        {isSharedView && (
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleToggleStoryLike}
                                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${storyLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
                                >
                                    <span>{storyLiked ? '❤' : '🤍'}</span>
                                    <span>{storyLikeCount}</span>
                                </button>
                                <span className="text-sm text-muted-foreground">댓글 {commentCount}개</span>
                                <Button variant="outline" onClick={handleCopyShareLink}>
                                    공유 링크 복사
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        {isAudioVisible && story.fullAudioUrl && (
                            <div className="mb-4">
                                <audio
                                    controls
                                    className="w-full"
                                    src={finalAudioUrl}
                                    ref={audioRef}
                                    preload="none"
                                >
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                        )}
                        {story.pages && story.pages.map(page => (
                            <p key={page.pageNo} className="mb-4 whitespace-pre-wrap">
                                {page.text}
                            </p>
                        ))}
                    </CardContent>

                    {story.quiz && story.quiz.length > 0 && (
                        <div className="p-4 border-t border-border">
                            <h2 className="text-xl font-semibold mb-2">퀴즈</h2>
                            <div className="space-y-2">
                                {story.quiz.map((item, index) => (
                                    <div key={index} className="p-2 bg-gray-100 rounded-md">
                                        <p className="font-medium">Q{index + 1}: {item.q}</p>
                                        <p className="text-sm text-muted-foreground">A: {item.a}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <CardFooter className="flex flex-wrap justify-end items-center gap-2">
                        <Select 
                            options={languageOptions}
                            selectedValue={targetLanguage}
                            onChange={setTargetLanguage}
                            className="w-32"
                        />
                        <Button onClick={handleTranslate}>번역하기</Button>
                        {canManage && (
                            <Button onClick={() => setIsShareModalOpen(true)}>
                                공유하기
                            </Button>
                        )}
                        <Button onClick={handleGenerateAudio} disabled={isGeneratingAudio}>
                            {story.fullAudioUrl && !isGeneratingAudio ? '동화책 읽기 (AI)' : isGeneratingAudio ? '음성 생성 중...' : '동화책 읽기 (AI)'}
                        </Button>
                        <Button onClick={handleCreateStorybook} disabled={isCreatingStorybook}>
                            {isCreatingStorybook ? '동화책 준비 중...' : '동화책으로 보기'}
                        </Button>
                    </CardFooter>
                </Card>

                {isSharedView && story.shareSlug && (
                    <Card className="max-w-2xl mx-auto mt-6">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <h2 className="text-xl font-semibold">댓글</h2>
                            <span className="text-sm text-muted-foreground">{commentCount}개</span>
                        </CardHeader>
                        <CardContent>
                            <SharedStoryComments slug={story.shareSlug} onCountChange={handleCommentCountChange} />
                        </CardContent>
                    </Card>
                )}

                <div className="flex justify-center space-x-4 mt-6">
                    {isSharedView ? (
                        <Button onClick={() => navigate('/shared')} variant="outline">공유 게시판으로</Button>
                    ) : (
                        <Button onClick={() => navigate('/stories')} variant="outline">목록으로</Button>
                    )}
                    {canManage && (
                        <Button onClick={handleDelete} variant="destructive">삭제</Button>
                    )}
                </div>
            </div>
            {canManage && !isSharedView && (
                <Modal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    title="동화 공유하기"
                    footer={(
                        <Button variant="ghost" onClick={() => setIsShareModalOpen(false)}>
                            닫기
                        </Button>
                    )}
                >
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            동화를 공유하면 누구나 게시판에서 읽을 수 있어요. 공유 후 버튼을 다시 눌러 링크를 복사할 수 있습니다.
                        </p>
                        <Button onClick={handleShareStory} disabled={isSharing} className="w-full">
                            {isSharing ? '공유 중...' : '동화 게시판으로 공유하기'}
                        </Button>
                        <Button onClick={handleCopyShareLink} variant="outline" className="w-full">
                            링크 복사
                        </Button>
                        {ensureShareLink() && (
                            <div className="rounded-md bg-muted p-3 text-sm break-all">
                                {ensureShareLink()}
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </>
    );
};

export default StoryDetail;
