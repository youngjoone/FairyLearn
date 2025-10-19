import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useApi from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/FormControls/Input'; // Reusing Input for text fields if needed
import Select from '@/components/ui/FormControls/Select';
import RadioLikert from '@/components/ui/FormControls/RadioLikert'; // Can be adapted for radio buttons
import Meta from '@/lib/seo';
import { getAccess } from '@/lib/auth';
import { useToast } from '@/components/ui/ToastProvider';

import Skeleton from '@/components/ui/Skeleton';

interface StorageQuota {
    limit: number;
    used: number;
}

interface CharacterProfile {
    id: number;
    slug: string;
    name: string;
    persona?: string | null;
    catchphrase?: string | null;
    promptKeywords?: string | null;
    imageUrl?: string | null; // Renamed from imagePath
    visualDescription?: string | null; // Added
    modelingStatus?: string | null;
}

const ageRanges = ['4-5', '6-7', '8-9'];
const topicsOptions = [
    { value: '공룡', label: '공룡' },
    { value: '우주', label: '우주' },
    { value: '숲', label: '숲' },
    { value: '바다', label: '바다' },
    { value: '로봇', label: '로봇' },
    { value: '마법', label: '마법' },
    { value: '모험', label: '모험' },
    { value: '동물 친구들', label: '동물 친구들' },
    { value: '계절 이야기', label: '계절 이야기' },
    { value: '음악', label: '음악' },
    { value: '스포츠', label: '스포츠' },
    { value: '여행', label: '여행' },
    { value: '환경 보호', label: '환경 보호' },
    { value: '과일과 음식', label: '과일과 음식' },
    { value: '시간 여행', label: '시간 여행' },
];
const objectivesOptions = [
    { value: '과학', label: '과학' },
    { value: '영어', label: '영어' },
    { value: '수학', label: '수학' },
    { value: '예절', label: '예절' },
    { value: '협동', label: '협동' },
    { value: '문제 해결', label: '문제 해결' },
    { value: '공감', label: '공감' },
    { value: '감정 표현', label: '감정 표현' },
    { value: '창의력', label: '창의력' },
    { value: '환경 의식', label: '환경 의식' },
    { value: '세계 문화', label: '세계 문화' },
    { value: '자기 돌봄', label: '자기 돌봄' },
];
const languages = [{ value: 'KO', label: '한국어' }, { value: 'EN', label: 'English' }];

const NewStory: React.FC = () => {
    const navigate = useNavigate();
    const { fetchWithErrorHandler } = useApi();
    const { addToast } = useToast();

    const [ageRange, setAgeRange] = useState<string>('');
    const [topics, setTopics] = useState<string[]>([]);
    const [objectives, setObjectives] = useState<string[]>([]);
    const [minPages, setMinPages] = useState<number>(10);
    const [language, setLanguage] = useState<string>('KO');
    const [title, setTitle] = useState<string>(''); // Optional title

    const [quota, setQuota] = useState<StorageQuota | null>(null);
    const [isLoadingQuota, setIsLoadingQuota] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

    const [characters, setCharacters] = useState<CharacterProfile[]>([]);
    const [selectedCharacterIds, setSelectedCharacterIds] = useState<number[]>([]);
    const [isLoadingCharacters, setIsLoadingCharacters] = useState<boolean>(false);
    const [isFetchingRandom, setIsFetchingRandom] = useState<boolean>(false);

    const buildAssetUrl = (path?: string | null): string | null => {
        if (!path) return null;
        if (/^https?:\/\//i.test(path)) {
            return path;
        }
        const backendBase = (import.meta.env.VITE_BACKEND_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:8080';
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${backendBase}${normalizedPath}`;
    };

    useEffect(() => {
        const token = getAccess();
        if (!token) {
            addToast('로그인이 필요한 서비스입니다.', 'error');
            // navigate('/'); // Assuming Home page handles redirect
            return;
        }

        const fetchQuota = async () => {
            setIsLoadingQuota(true);
            try {
                const quotaData = await fetchWithErrorHandler<StorageQuota>('storage/me');
                setQuota(quotaData);
            } catch (err) {
                addToast(`저장 공간 정보 로드 실패: ${err instanceof Error ? err.message : String(err)}`, 'error');
            } finally {
                setIsLoadingQuota(false);
            }
        };
        const fetchCharacters = async () => {
            setIsLoadingCharacters(true);
            try {
                const list = await fetchWithErrorHandler<CharacterProfile[]>('public/characters');
                const normalized = list.map((character: any) => ({
                    id: character.id,
                    slug: character.slug,
                    name: character.name,
                    persona: character.persona ?? null,
                    catchphrase: character.catchphrase ?? null,
                    promptKeywords: character.promptKeywords ?? character.prompt_keywords ?? null,
                    imageUrl: character.imageUrl ?? character.image_url ?? null, // Updated
                    visualDescription: character.visualDescription ?? character.visual_description ?? null, // Added
                    modelingStatus: character.modelingStatus ?? character.modeling_status ?? null,
                }));
                setCharacters(normalized);
            } catch (err) {
                console.error('캐릭터 목록 불러오기 실패', err);
                addToast(`캐릭터 목록을 불러오지 못했어요: ${err instanceof Error ? err.message : String(err)}`, 'error');
            } finally {
                setIsLoadingCharacters(false);
            }
        };
        fetchQuota();
        fetchCharacters();
    }, [fetchWithErrorHandler, addToast, navigate]);

    const validateForm = () => {
        const errors: { [key: string]: string } = {};
        if (!ageRange) errors.ageRange = '연령대를 선택해주세요.';
        if (topics.length === 0) errors.topics = '주제를 1개 이상 선택해주세요.';
        if (objectives.length === 0) errors.objectives = '목표를 1개 이상 선택해주세요.';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const toggleCharacterSelection = (characterId: number) => {
        setSelectedCharacterIds(prev => {
            if (prev.includes(characterId)) {
                return prev.filter(id => id !== characterId);
            }
            if (prev.length >= 2) {
                addToast('캐릭터는 최대 2명까지 선택할 수 있어요.', 'error');
                return prev;
            }
            return [...prev, characterId];
        });
    };

    const handleRandomCharacterSelection = async () => {
        setIsFetchingRandom(true);
        try {
            const randomCharacters = await fetchWithErrorHandler<CharacterProfile[]>('public/characters/random?count=2');
            if (randomCharacters && randomCharacters.length > 0) {
                setSelectedCharacterIds(randomCharacters.map(c => c.id));
                addToast('랜덤 캐릭터가 선택되었습니다!', 'success');
            } else {
                addToast('랜덤 캐릭터를 불러오지 못했습니다.', 'error');
            }
        } catch (err) {
            addToast(`랜덤 캐릭터 선택 실패: ${err instanceof Error ? err.message : String(err)}`, 'error');
        } finally {
            setIsFetchingRandom(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) {
            addToast('필수 입력값을 확인해주세요.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const selectedCharacterProfiles = characters.filter(char => selectedCharacterIds.includes(char.id));
            const characterVisuals = selectedCharacterProfiles.map(char => ({
                id: char.id,
                name: char.name,
                slug: char.slug,
                visualDescription: char.visualDescription || '',
                imageUrl: char.imageUrl || '',
                modelingStatus: char.modelingStatus || undefined,
            }));

            const requestBody = {
                title: title || undefined, // Send title only if not empty
                ageRange,
                topics,
                objectives,
                minPages,
                language,
                characterIds: selectedCharacterIds,
                characterVisuals: characterVisuals, // Added
            };

            const response = await fetchWithErrorHandler<{ id: number }>('http://localhost:8080/api/stories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
            addToast('동화가 성공적으로 생성되었습니다!', 'success');
            navigate(`/stories/${response.id}`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            if (errorMessage.includes('STORAGE_LIMIT_EXCEEDED')) {
                addToast('저장 공간이 부족합니다. 기존 동화를 삭제하거나 업그레이드하세요.', 'error');
            } else {
                addToast(`동화 생성 실패: ${errorMessage}`, 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const isSubmitDisabled = isSubmitting || (quota ? quota.used >= quota.limit : false);

    if (isLoadingQuota) {
        return (
            <div className="p-4">
                <Skeleton className="h-10 w-full mb-4" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <>
            <Meta title="새 동화 만들기 — FairyLearn" description="새로운 동화를 생성합니다." />
            <div className="p-4 max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold mb-4">새 동화 만들기</h1>

                {quota && (
                    <div className="mb-4 p-2 bg-blue-100 text-blue-800 rounded-md">
                        저장 공간: {quota.used} / {quota.limit}
                        {quota.used >= quota.limit && (
                            <span className="ml-2 font-semibold text-red-600"> (공간 부족! 업그레이드 필요)</span>
                        )}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <h2 className="text-xl font-semibold">동화 생성 파라미터</h2>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                                    동화 제목 (선택 사항)
                                </label>
                                <Input
                                    id="title"
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="mt-1 block w-full"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="block text-sm font-medium text-gray-700">캐릭터 선택 (최대 2명)</span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleRandomCharacterSelection}
                                        disabled={isFetchingRandom}
                                        isLoading={isFetchingRandom}
                                    >
                                        랜덤 캐릭터
                                    </Button>
                                    <span className="text-xs text-gray-500">{selectedCharacterIds.length}/2 선택됨</span>
                                </div>
                                {isLoadingCharacters ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <Skeleton className="h-32 w-full" />
                                        <Skeleton className="h-32 w-full" />
                                    </div>
                                ) : characters.length === 0 ? (
                                    <div className="p-3 border border-dashed rounded-md text-sm text-gray-500">
                                        준비된 캐릭터가 없습니다. 잠시 후 다시 시도해주세요.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {characters.map(character => {
                                            const isSelected = selectedCharacterIds.includes(character.id);
                                            const imageUrl = buildAssetUrl(character.imageUrl);
                                            return (
                                                <button
                                                    type="button"
                                                    key={character.id}
                                                    onClick={() => toggleCharacterSelection(character.id)}
                                                    className={`group relative text-left border rounded-lg p-3 transition ${isSelected ? 'border-blue-500 bg-blue-50/80 ring-1 ring-blue-200' : 'border-gray-200 hover:border-blue-400/70'}`}
                                                >
                                                    {isSelected && (
                                                        <span className="absolute top-2 right-2 text-xs font-medium text-blue-600">선택됨</span>
                                                    )}
                                                    <div className="flex gap-3 items-start">
                                                        {imageUrl ? (
                                                            <img
                                                                src={imageUrl}
                                                                alt={`${character.name} 이미지`}
                                                                className="w-20 h-20 rounded-md object-cover border border-gray-200"
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <div className="w-20 h-20 rounded-md bg-gray-100 border border-dashed flex items-center justify-center text-xs text-gray-400">이미지 준비중</div>
                                                        )}
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-gray-900">{character.name}</p>
                                                            {character.persona && (
                                                                <p className="text-sm text-gray-600 mt-1 leading-snug">{character.persona}</p>
                                                            )}
                                                            {character.catchphrase && (
                                                                <p className="text-sm text-blue-600 mt-1 leading-snug">{character.catchphrase}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    연령대 <span className="text-red-500">*</span>
                                </label>
                                <RadioLikert
                                    name="ageRange"
                                    options={ageRanges.map(range => ({ label: range, value: range }))}
                                    selectedValue={ageRange}
                                    onChange={setAgeRange}
                                />
                                {formErrors.ageRange && <p className="text-red-500 text-xs mt-1">{formErrors.ageRange}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    주제 <span className="text-red-500">*</span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {topicsOptions.map(option => (
                                        <Button
                                            key={option.value}
                                            type="button"
                                            variant={topics.includes(option.value) ? 'solid' : 'outline'}
                                            onClick={() => {
                                                setTopics(prev =>
                                                    prev.includes(option.value)
                                                        ? prev.filter(t => t !== option.value)
                                                        : [...prev, option.value]
                                                );
                                            }}
                                        >
                                            {option.label}
                                        </Button>
                                    ))}
                                </div>
                                {formErrors.topics && <p className="text-red-500 text-xs mt-1">{formErrors.topics}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    목표 <span className="text-red-500">*</span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {objectivesOptions.map(option => (
                                        <Button
                                            key={option.value}
                                            type="button"
                                            variant={objectives.includes(option.value) ? 'solid' : 'outline'}
                                            onClick={() => {
                                                setObjectives(prev =>
                                                    prev.includes(option.value)
                                                        ? prev.filter(o => o !== option.value)
                                                        : [...prev, option.value]
                                                );
                                            }}
                                        >
                                            {option.label}
                                        </Button>
                                    ))}
                                </div>
                                {formErrors.objectives && <p className="text-red-500 text-xs mt-1">{formErrors.objectives}</p>}
                            </div>

                            <div>
                                <label htmlFor="minPages" className="block text-sm font-medium text-gray-700">
                                    최소 페이지 수: {minPages}
                                </label>
                                <input
                                    id="minPages"
                                    type="range"
                                    min="10"
                                    max="20"
                                    value={minPages}
                                    onChange={(e) => setMinPages(Number(e.target.value))}
                                    className="mt-1 block w-full"
                                />
                            </div>

                            <div>
                                <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                                    언어
                                </label>
                                <Select
                                    id="language"
                                    options={languages}
                                    selectedValue={language}
                                    onChange={setLanguage}
                                    className="mt-1 block w-full"
                                />
                            </div>

                            <CardFooter className="flex justify-end p-0 pt-4">
                                <Button type="submit" disabled={isSubmitDisabled} isLoading={isSubmitting}>
                                    동화 생성하기
                                </Button>
                            </CardFooter>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
};

export default NewStory;
