import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useApi from '@/hooks/useApi';
import Input from '@/components/ui/FormControls/Input';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import Meta from '@/lib/seo';
import { useToast } from '@/components/ui/ToastProvider';

interface MyCharacter {
    id: number;
    slug: string;
    name: string;
    persona?: string | null;
    catchphrase?: string | null;
    promptKeywords?: string | null;
    imageUrl?: string | null;
    visualDescription?: string | null;
    descriptionPrompt?: string | null;
    modelingStatus?: string | null;
    scope?: string | null;
    artStyle?: string | null;
}

const initialFormState = {
    name: '',
    persona: '',
    catchphrase: '',
    promptKeywords: '',
    visualDescription: '',
    descriptionPrompt: '',
    artStyle: '',
};

const MyCharacters: React.FC = () => {
    const { fetchWithErrorHandler } = useApi();
    const { addToast } = useToast();

    const [characters, setCharacters] = useState<MyCharacter[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [shouldRegenerate, setShouldRegenerate] = useState<boolean>(false);
    const [formState, setFormState] = useState(initialFormState);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [fileInputKey, setFileInputKey] = useState<number>(0);

    const [actionCharacterId, setActionCharacterId] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        const loadCharacters = async () => {
            setIsLoading(true);
            try {
                const list = await fetchWithErrorHandler<any[]>('characters/me');
                if (cancelled) {
                    return;
                }
                const normalized = list.map(normalizeCharacter);
                setCharacters(normalized);
            } catch (err) {
                console.error('커스텀 캐릭터 로드 실패', err);
                if (!cancelled) {
                    addToast('내 캐릭터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.', 'error');
                    setCharacters([]);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadCharacters();
        return () => {
            cancelled = true;
        };
    }, [fetchWithErrorHandler, addToast]);

    const normalizeCharacter = (character: any): MyCharacter => ({
        id: character.id,
        slug: character.slug,
        name: character.name,
        persona: character.persona ?? null,
        catchphrase: character.catchphrase ?? character.catchPhrase ?? null,
        promptKeywords: character.promptKeywords ?? character.prompt_keywords ?? null,
        imageUrl: character.imageUrl ?? character.image_url ?? null,
        visualDescription: character.visualDescription ?? character.visual_description ?? null,
        descriptionPrompt: character.descriptionPrompt ?? character.description_prompt ?? null,
        modelingStatus: character.modelingStatus ?? character.modeling_status ?? null,
        scope: character.scope ?? null,
        artStyle: character.artStyle ?? character.art_style ?? null,
    });

    const buildAssetUrl = (path?: string | null): string | null => {
        if (!path) return null;
        if (/^https?:\/\//i.test(path) || path.startsWith('file://')) {
            return path;
        }
        const backendBase = (import.meta.env.VITE_BACKEND_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:8080';
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${backendBase}${normalizedPath}`;
    };

    const resetForm = () => {
        setFormState(initialFormState);
        setEditingId(null);
        setShouldRegenerate(false);
        setPhotoFile(null);
        setFileInputKey(prev => prev + 1);
        setActionCharacterId(null);
    };

    const handleInputChange = (field: keyof typeof initialFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormState(prev => ({
            ...prev,
            [field]: event.target.value,
        }));
    };

    const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            setPhotoFile(null);
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            addToast('이미지는 5MB 이하만 업로드할 수 있어요.', 'error');
            event.target.value = '';
            return;
        }
        setPhotoFile(file);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!formState.name.trim()) {
            addToast('캐릭터 이름을 입력해주세요.', 'error');
            return;
        }
        if (!editingId && !photoFile) {
            addToast('레퍼런스 사진을 업로드해주세요.', 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            const payload: Record<string, unknown> = {
                ...formState,
            };
            if (editingId) {
                payload.regenerateImage = shouldRegenerate || !!photoFile || undefined;
            }
            const formData = new FormData();
            formData.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
            if (photoFile) {
                formData.append('photo', photoFile);
            }
            if (editingId) {
                const response = await fetchWithErrorHandler<MyCharacter>(`characters/${editingId}`, {
                    method: 'PUT',
                    body: formData,
                });
                setCharacters(prev =>
                    prev.map(character => (character.id === editingId ? normalizeCharacter(response) : character))
                );
                addToast('캐릭터 정보를 업데이트했어요.', 'success');
            } else {
                const response = await fetchWithErrorHandler<MyCharacter>('characters', {
                    method: 'POST',
                    body: formData,
                });
                setCharacters(prev => [normalizeCharacter(response), ...prev]);
                addToast('새 캐릭터를 만들었어요.', 'success');
            }
            resetForm();
        } catch (err) {
            console.error('캐릭터 저장 실패', err);
            addToast('캐릭터를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const startEdit = (character: MyCharacter) => {
        setEditingId(character.id);
        setFormState({
            name: character.name,
            persona: character.persona ?? '',
            catchphrase: character.catchphrase ?? '',
            promptKeywords: character.promptKeywords ?? '',
            visualDescription: character.visualDescription ?? '',
            descriptionPrompt: character.descriptionPrompt ?? '',
            artStyle: character.artStyle ?? '',
        });
        setShouldRegenerate(false);
        setPhotoFile(null);
        setFileInputKey(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (characterId: number) => {
        if (!window.confirm('정말 이 캐릭터를 삭제할까요?')) {
            return;
        }
        setActionCharacterId(characterId);
        try {
            await fetchWithErrorHandler<void>(`characters/${characterId}`, { method: 'DELETE' });
            setCharacters(prev => prev.filter(character => character.id !== characterId));
            if (editingId === characterId) {
                resetForm();
            }
            addToast('캐릭터를 삭제했어요.', 'success');
        } catch (err) {
            console.error('캐릭터 삭제 실패', err);
            addToast('캐릭터를 삭제하지 못했습니다.', 'error');
        } finally {
            setActionCharacterId(null);
        }
    };

    const totalCharacters = useMemo(() => characters.length, [characters]);

    return (
        <div className="space-y-8">
            <Meta title="내 캐릭터 관리 — FairyLearn" description="직접 만든 캐릭터를 관리하고 동화 생성에 활용해보세요." />
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">내 캐릭터</h1>
                    <p className="text-sm text-muted-foreground mt-1">직접 만든 캐릭터를 관리하고 동화에 활용하세요.</p>
                </div>
                <Link
                    to="/stories/new"
                    className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                    동화 만들기
                </Link>
            </div>

            <section className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-lg font-semibold">{editingId ? '캐릭터 수정' : '새 캐릭터 만들기'}</h2>
                        <p className="text-sm text-muted-foreground">{editingId ? '선택한 캐릭터 정보를 수정하고 필요 시 이미지를 다시 생성하세요.' : 'AI에게 전달할 정보를 입력하면 참조 이미지를 생성해 드립니다.'}</p>
                    </div>
                    {editingId && (
                        <Button variant="ghost" size="sm" onClick={resetForm}>
                            취소
                        </Button>
                    )}
                </div>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label htmlFor="character-name" className="block text-sm font-medium text-gray-700">
                            캐릭터 이름 <span className="text-red-500">*</span>
                        </label>
                        <Input
                            id="character-name"
                            type="text"
                            value={formState.name}
                            onChange={handleInputChange('name')}
                            className="mt-1 block w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            레퍼런스 사진 {editingId ? <span className="text-xs text-muted-foreground">(선택)</span> : <span className="text-red-500">*</span>}
                        </label>
                        <input
                            key={fileInputKey}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            required={!editingId}
                            className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent"
                        />
                        <p className="text-xs text-muted-foreground mt-1">아이 사진 등 5MB 이하 이미지를 업로드하면, AI가 동화 스타일로 변환해 줍니다.</p>
                        {photoFile && (
                            <p className="text-xs text-gray-500 mt-0.5">선택된 파일: {photoFile.name}</p>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">성격/설정</label>
                            <textarea
                                value={formState.persona}
                                onChange={handleInputChange('persona')}
                                className="mt-1 block w-full rounded-md border border-input bg-background p-2 text-sm"
                                rows={3}
                                placeholder="예: 호기심 많고 씩씩하지만 가끔 덤벙대는 토끼"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">시그니처 대사</label>
                            <Input
                                value={formState.catchphrase}
                                onChange={handleInputChange('catchphrase')}
                                placeholder='"깡충깡충! 내가 먼저 가볼래!"'
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">프롬프트 키워드</label>
                            <textarea
                                value={formState.promptKeywords}
                                onChange={handleInputChange('promptKeywords')}
                                className="mt-1 block w-full rounded-md border border-input bg-background p-2 text-sm"
                                rows={2}
                                placeholder="노란 강아지, 꽁지, 둥근 귀, 밝은 표정"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">비주얼 설명</label>
                            <textarea
                                value={formState.visualDescription}
                                onChange={handleInputChange('visualDescription')}
                                className="mt-1 block w-full rounded-md border border-input bg-background p-2 text-sm"
                                rows={2}
                                placeholder="아이들이 좋아할 귀여운 강아지 친구"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">이미지 생성 설명</label>
                        <textarea
                            value={formState.descriptionPrompt}
                            onChange={handleInputChange('descriptionPrompt')}
                            className="mt-1 block w-full rounded-md border border-input bg-background p-2 text-sm"
                            rows={4}
                            placeholder="AI가 참조 이미지를 만들 수 있도록 자세히 설명해주세요."
                        />
                    </div>
                    <div>
                        <label htmlFor="artStyle" className="block text-sm font-medium text-gray-700">희망 스타일</label>
                        <Input
                            id="artStyle"
                            type="text"
                            value={formState.artStyle}
                            onChange={handleInputChange('artStyle')}
                            placeholder="예: 따뜻한 파스텔 수채화"
                        />
                    </div>
                    {editingId && (
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                checked={shouldRegenerate}
                                onChange={(e) => setShouldRegenerate(e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            기존 이미지 기준으로 다시 생성하기
                        </label>
                    )}
                    {editingId && (
                        <p className="text-xs text-muted-foreground">
                            새로운 사진을 업로드하면 자동으로 다시 생성됩니다.
                        </p>
                    )}
                    <div className="flex gap-2">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? '처리 중...' : editingId ? '캐릭터 수정' : '캐릭터 생성'}
                        </Button>
                        {editingId && (
                            <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
                                수정 취소
                            </Button>
                        )}
                    </div>
                </form>
            </section>

            <section className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-lg font-semibold">내 캐릭터 목록</h2>
                        <p className="text-sm text-muted-foreground">
                            총 {totalCharacters}명. 동화 생성 시 &quot;내 캐릭터&quot; 영역에서 선택할 수 있습니다.
                        </p>
                    </div>
                    <Link
                        to="/stories/new"
                        className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                        동화에서 사용하기
                    </Link>
                </div>
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-40 w-full" />
                    </div>
                ) : characters.length === 0 ? (
                    <div className="p-4 border border-dashed rounded-md text-sm text-muted-foreground">
                        아직 만든 캐릭터가 없습니다. 위 폼을 사용해 첫 캐릭터를 만들어보세요.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {characters.map(character => {
                            const imageUrl = buildAssetUrl(character.imageUrl);
                            const isDeleting = actionCharacterId === character.id;
                            return (
                                <div key={character.id} className="border rounded-lg p-3 flex gap-3">
                                    <div className="w-24 h-24 flex-shrink-0 rounded-md border overflow-hidden bg-muted">
                                        {imageUrl ? (
                                            <img src={imageUrl} alt={`${character.name} 이미지`} className="w-full h-full object-cover" loading="lazy" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">이미지 준비중</div>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold">{character.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {character.scope === 'GLOBAL' ? '추천 캐릭터' : '내 캐릭터'} · {character.modelingStatus ?? 'UNKNOWN'}
                                            </p>
                                        </div>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => startEdit(character)}>
                                                    수정
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(character.id)}
                                                    disabled={isDeleting}
                                                >
                                                    {isDeleting ? '삭제 중...' : '삭제'}
                                                </Button>
                                            </div>
                                        </div>
                                        {character.persona && <p className="text-sm text-gray-700">{character.persona}</p>}
                                        {character.catchphrase && <p className="text-sm text-blue-600">{character.catchphrase}</p>}
                                        {character.promptKeywords && (
                                            <p className="text-xs text-muted-foreground break-words">키워드: {character.promptKeywords}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
};

export default MyCharacters;
