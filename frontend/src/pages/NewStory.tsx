import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
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

interface WalletSummary {
    balance: number;
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
    descriptionPrompt?: string | null;
    artStyle?: string | null;
    scope?: string | null;
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

const artStyleOptions = [
    { value: '', label: '기본 (AI 추천 스타일)' },
    { value: '부드럽고 몽환적인 수채화 일러스트', label: '수채화 동화풍' },
    { value: '밝고 선명한 카툰 스타일', label: '카툰 스타일' },
    { value: '부드러운 파스텔 톤의 애니메이션 룩', label: '애니메이션 파스텔' },
    { value: '빈티지 스토리북 펜과 잉크 스타일', label: '빈티지 스토리북' },
];

const moralSamples = [
    '친구와 함께하면 어떤 어려움도 이겨낼 수 있다는 교훈을 주세요.',
    '정직하게 말하는 것이 가장 좋은 선택임을 깨닫게 해주세요.',
    '서로 배려하고 돕는 마음의 중요성을 느끼게 해주세요.',
    '실수해도 다시 도전하면 더 성장할 수 있다는 메시지를 전해주세요.',
];

const requiredElementSamples = [
    '마법 열쇠',
    '구름 위 성',
    '빛나는 지팡이',
    '시간을 알려주는 별시계',
    '무지개 다리',
];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const pickRandom = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const pickMultiple = <T,>(items: T[], count: number): T[] => {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.max(0, Math.min(count, items.length)));
};

const randomTitlePrefixes = ['반짝이는', '신비로운', '용감한', '포근한', '즐거운'];
const randomTitleSubjects = ['모험', '이야기', '비밀', '여행', '꿈'];

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

    const [globalCharacters, setGlobalCharacters] = useState<CharacterProfile[]>([]);
    const [customCharacters, setCustomCharacters] = useState<CharacterProfile[]>([]);
    const allCharacters = useMemo(() => [...customCharacters, ...globalCharacters], [customCharacters, globalCharacters]);
    const [selectedCharacterIds, setSelectedCharacterIds] = useState<number[]>([]);
    const [isLoadingGlobalCharacters, setIsLoadingGlobalCharacters] = useState<boolean>(false);
    const [isLoadingCustomCharacters, setIsLoadingCustomCharacters] = useState<boolean>(false);
    const isLoadingCharacters = isLoadingGlobalCharacters || isLoadingCustomCharacters;
    const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
    const [moral, setMoral] = useState<string>('');
    const [requiredElementsInput, setRequiredElementsInput] = useState<string>('');
    const [artStyle, setArtStyle] = useState<string>('');

    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(true);

    const HEART_COST_PER_STORY = 1;

    const buildAssetUrl = (path?: string | null): string | null => {
        if (!path) return null;
        if (/^https?:\/\//i.test(path)) {
            return path;
        }
        const backendBase = (import.meta.env.VITE_BACKEND_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:8080';
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${backendBase}${normalizedPath}`;
    };

    const buildRequestPayload = (params: {
        title?: string;
        ageRange: string;
        topics: string[];
        objectives: string[];
        minPages: number;
        language: string;
        characterIds: number[];
        moral?: string;
        requiredElements?: string[];
        artStyle?: string;
    }) => {
        const selectedCharacterProfiles = allCharacters.filter(char => params.characterIds.includes(char.id));
        const characterVisuals = selectedCharacterProfiles.map(char => ({
            id: char.id,
            name: char.name,
            slug: char.slug,
            visualDescription: char.visualDescription || '',
            imageUrl: buildAssetUrl(char.imageUrl) || '',
            modelingStatus: char.modelingStatus || undefined,
        }));

        const payload: Record<string, unknown> = {
            title: params.title || undefined,
            ageRange: params.ageRange,
            topics: params.topics,
            objectives: params.objectives,
            minPages: params.minPages,
            language: params.language,
            characterIds: params.characterIds,
            characterVisuals,
        };

        if (params.moral) {
            payload.moral = params.moral;
        }
        if (params.requiredElements && params.requiredElements.length > 0) {
            payload.requiredElements = params.requiredElements;
        }
        if (params.artStyle) {
            payload.artStyle = params.artStyle;
        }

        return payload;
    };

    const submitStory = async (payload: Record<string, unknown>, successMessage: string) => {
        if (walletBalance !== null && walletBalance < HEART_COST_PER_STORY) {
            addToast('하트가 부족합니다. 결제 관리에서 충전 후 다시 시도해주세요.', 'error');
            navigate('/me/billing');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetchWithErrorHandler<{ id: number }>('stories', {
                method: 'POST',
                body: payload,
            });
            addToast(successMessage, 'success');
            setWalletBalance(prev => (prev !== null ? Math.max(prev - HEART_COST_PER_STORY, 0) : prev));
            navigate(`/stories/${response.id}`);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const apiError = (err.response?.data ?? {}) as { message?: string; code?: string };
                if (err.response?.status === 402) {
                    addToast('하트가 부족합니다. 결제 관리에서 충전 후 다시 시도해주세요.', 'error');
                    navigate('/me/billing');
                } else if (apiError.code === 'STORAGE_LIMIT_EXCEEDED') {
                    addToast('저장 공간이 부족합니다. 기존 동화를 삭제하거나 업그레이드하세요.', 'error');
                } else {
                    const message = apiError.message || err.message || '동화 생성에 실패했습니다.';
                    addToast(`동화 생성 실패: ${message}`, 'error');
                }
            } else {
                const message = err instanceof Error ? err.message : String(err);
                addToast(`동화 생성 실패: ${message}`, 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const token = getAccess();
        if (!token) {
            addToast('로그인이 필요한 서비스입니다.', 'error');
            return;
        }

        let cancelled = false;

        const fetchQuota = async () => {
            setIsLoadingQuota(true);
            try {
                const quotaData = await fetchWithErrorHandler<StorageQuota>('storage/me');
                if (!cancelled) {
                    setQuota(quotaData);
                }
            } catch (err) {
                if (!cancelled) {
                    addToast(`저장 공간 정보 로드 실패: ${err instanceof Error ? err.message : String(err)}`, 'error');
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingQuota(false);
                }
            }
        };

        const normalizeCharacter = (character: any): CharacterProfile => ({
            id: character.id,
            slug: character.slug,
            name: character.name,
            persona: character.persona ?? null,
            catchphrase: character.catchphrase ?? null,
            promptKeywords: character.promptKeywords ?? character.prompt_keywords ?? null,
            imageUrl: character.imageUrl ?? character.image_url ?? null,
            visualDescription: character.visualDescription ?? character.visual_description ?? null,
            modelingStatus: character.modelingStatus ?? character.modeling_status ?? null,
            descriptionPrompt: character.descriptionPrompt ?? character.description_prompt ?? null,
            scope: character.scope ?? null,
            artStyle: character.artStyle ?? character.art_style ?? null,
        });

        const fetchGlobalCharacters = async () => {
            setIsLoadingGlobalCharacters(true);
            try {
                const list = await fetchWithErrorHandler<CharacterProfile[]>('public/characters');
                if (!cancelled) {
                    setGlobalCharacters(list.map(normalizeCharacter));
                }
            } catch (err) {
                console.error('추천 캐릭터 목록 불러오기 실패', err);
                if (!cancelled) {
                    addToast(`추천 캐릭터를 불러오지 못했어요: ${err instanceof Error ? err.message : String(err)}`, 'error');
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingGlobalCharacters(false);
                }
            }
        };

        const fetchCustomCharacters = async () => {
            setIsLoadingCustomCharacters(true);
            try {
                const list = await fetchWithErrorHandler<CharacterProfile[]>('characters/me');
                if (!cancelled) {
                    setCustomCharacters(list.map(normalizeCharacter));
                }
            } catch (err: any) {
                if (!cancelled) {
                    if (err?.response?.status === 401 || err?.response?.status === 403) {
                        setCustomCharacters([]);
                    } else {
                        console.error('내 캐릭터 목록 불러오기 실패', err);
                        addToast('내 캐릭터를 불러오지 못했어요.', 'error');
                    }
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingCustomCharacters(false);
                }
            }
        };

        const fetchWallet = async () => {
            setIsLoadingWallet(true);
            try {
                const wallet = await fetchWithErrorHandler<WalletSummary>('wallets/me');
                if (!cancelled) {
                    setWalletBalance(wallet.balance);
                }
            } catch (err) {
                console.error('하트 잔액 조회 실패', err);
                if (!cancelled) {
                    addToast('하트 잔액을 불러오는 중 문제가 발생했습니다.', 'error');
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingWallet(false);
                }
            }
        };

        fetchQuota();
        fetchGlobalCharacters();
        fetchCustomCharacters();
        fetchWallet();

        return () => {
            cancelled = true;
        };
    }, [fetchWithErrorHandler, addToast]);

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

    useEffect(() => {
        setSelectedCharacterIds(prev =>
            prev.filter(id => allCharacters.some(character => character.id === id))
        );
    }, [allCharacters]);

    const renderCharacterSection = (title: string, items: CharacterProfile[], emptyMessage: React.ReactNode) => (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="block text-sm font-medium text-gray-700">{title}</span>
                {title === '내 캐릭터' && (
                    <Link to="/me/characters" className="text-xs text-blue-600 hover:underline">
                        캐릭터 관리
                    </Link>
                )}
            </div>
            {items.length === 0 ? (
                <div className="p-3 border border-dashed rounded-md text-sm text-gray-500">{emptyMessage}</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map(character => {
                        const isSelected = selectedCharacterIds.includes(character.id);
                        const imageUrl = buildAssetUrl(character.imageUrl);
                        return (
                            <button
                                type="button"
                                key={`${title}-${character.id}`}
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
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) {
            addToast('필수 입력값을 확인해주세요.', 'error');
            return;
        }

        const trimmedMoral = moral.trim();
        const requiredElements = requiredElementsInput
            .split(/[\n,]/)
            .map(item => item.trim())
            .filter(item => item.length > 0);

        const payload = buildRequestPayload({
            title: title || undefined,
            ageRange,
            topics,
            objectives,
            minPages,
            language,
            characterIds: selectedCharacterIds,
            moral: trimmedMoral || undefined,
            requiredElements,
            artStyle: artStyle || undefined,
        });

        await submitStory(payload, '동화가 성공적으로 생성되었습니다!');
    };

    const handleRandomStory = async () => {
        if (isSubmitting) {
            return;
        }
        if (quota && quota.used >= quota.limit) {
            addToast('저장 공간이 부족합니다. 기존 동화를 삭제하거나 업그레이드하세요.', 'error');
            return;
        }
        if (walletBalance !== null && walletBalance < HEART_COST_PER_STORY) {
            addToast('하트가 부족합니다. 결제 관리에서 충전 후 다시 시도해주세요.', 'error');
            navigate('/me/billing');
            return;
        }
        if (isLoadingCharacters) {
            addToast('캐릭터 목록을 불러오는 중입니다. 잠시만 기다려 주세요.', 'info');
            return;
        }

        const randomAgeRange = pickRandom(ageRanges);
        const randomTopics = pickMultiple(
            topicsOptions.map(option => option.value),
            randomInt(1, Math.min(3, topicsOptions.length))
        );
        const randomObjectives = pickMultiple(
            objectivesOptions.map(option => option.value),
            randomInt(1, Math.min(2, objectivesOptions.length))
        );
        const randomMinPages = randomInt(10, 20);
        const randomLanguage = pickRandom(languages).value;

        const availableCharacterIds = allCharacters.map(char => char.id);
        const randomCharacterIds = availableCharacterIds.length > 0
            ? pickMultiple(availableCharacterIds, Math.min(2, availableCharacterIds.length))
            : [];

        const includeTitle = Math.random() < 0.6;
        const randomTitle = includeTitle ? `${pickRandom(randomTitlePrefixes)} ${pickRandom(randomTitleSubjects)}` : '';

        const includeMoral = Math.random() < 0.65;
        const randomMoral = includeMoral ? pickRandom(moralSamples) : '';

        const includeRequiredElements = Math.random() < 0.5;
        const randomRequiredElements = includeRequiredElements
            ? pickMultiple(requiredElementSamples, randomInt(1, Math.min(3, requiredElementSamples.length)))
            : [];

        const includeArtStyle = Math.random() < 0.6;
        const randomArtStyleValue = includeArtStyle ? pickRandom(artStyleOptions).value : '';

        setAgeRange(randomAgeRange);
        setTopics(randomTopics);
        setObjectives(randomObjectives);
        setMinPages(randomMinPages);
        setLanguage(randomLanguage);
        setSelectedCharacterIds(randomCharacterIds);
        setTitle(randomTitle);
        setMoral(randomMoral);
        setRequiredElementsInput(randomRequiredElements.join(', '));
        setArtStyle(randomArtStyleValue);
        setShowAdvanced(true);
        setFormErrors({});

        const payload = buildRequestPayload({
            title: randomTitle || undefined,
            ageRange: randomAgeRange,
            topics: randomTopics,
            objectives: randomObjectives,
            minPages: randomMinPages,
            language: randomLanguage,
            characterIds: randomCharacterIds,
            moral: randomMoral || undefined,
            requiredElements: randomRequiredElements,
            artStyle: randomArtStyleValue || undefined,
        });

        await submitStory(payload, '랜덤 동화가 생성되었습니다!');
    };
    const isSubmitDisabled = isSubmitting || (quota ? quota.used >= quota.limit : false) || (walletBalance !== null && walletBalance < HEART_COST_PER_STORY);

    if (isLoadingQuota || isLoadingWallet) {
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
                {walletBalance !== null && (
                    <div className="mb-4 p-2 bg-pink-100 text-pink-800 rounded-md">
                        보유 하트: {walletBalance.toLocaleString('ko-KR')}개
                        {walletBalance < HEART_COST_PER_STORY && (
                            <span className="ml-2 font-semibold text-red-600"> (하트 부족! 충전이 필요해요)</span>
                        )}
                    </div>
                )}

                <div className="flex justify-end mb-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleRandomStory}
                        disabled={isSubmitting || (quota ? quota.used >= quota.limit : false) || isLoadingCharacters}
                    >
                        랜덤 동화 만들기
                    </Button>
                </div>

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
                                    <span className="text-xs text-gray-500">{selectedCharacterIds.length}/2 선택됨</span>
                                </div>
                                {isLoadingCharacters ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <Skeleton className="h-32 w-full" />
                                        <Skeleton className="h-32 w-full" />
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        {renderCharacterSection(
                                            '추천 캐릭터',
                                            globalCharacters,
                                            '준비된 캐릭터가 없습니다. 잠시 후 다시 시도해주세요.'
                                        )}
                                        {renderCharacterSection(
                                            '내 캐릭터',
                                            customCharacters,
                                            <span>
                                                아직 만든 캐릭터가 없습니다.{' '}
                                                <Link to="/me/characters" className="text-blue-600 hover:underline">
                                                    내 캐릭터 페이지
                                                </Link>
                                                에서 직접 만들어보세요.
                                            </span>
                                        )}
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

                            <div className="pt-4 mt-6 border-t">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-gray-800">고급 설정</h3>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowAdvanced(prev => !prev)}
                                    >
                                        {showAdvanced ? '숨기기' : '펼치기'}
                                    </Button>
                                </div>
                                {showAdvanced && (
                                    <div className="mt-4 space-y-4">
                                        <div>
                                            <label htmlFor="moral" className="block text-sm font-medium text-gray-700">
                                                이야기의 교훈
                                            </label>
                                            <textarea
                                                id="moral"
                                                value={moral}
                                                onChange={(e) => setMoral(e.target.value)}
                                                rows={2}
                                                maxLength={150}
                                                placeholder="예) 서로 도우면 어떤 어려움도 해결할 수 있다는 메시지를 전달해 주세요."
                                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">150자 이내로 간단히 입력해주세요.</p>
                                        </div>

                                        <div>
                                            <label htmlFor="requiredElements" className="block text-sm font-medium text-gray-700">
                                                꼭 등장했으면 하는 요소
                                            </label>
                                            <textarea
                                                id="requiredElements"
                                                value={requiredElementsInput}
                                                onChange={(e) => setRequiredElementsInput(e.target.value)}
                                                rows={3}
                                                placeholder="예) 마법 열쇠, 구름 위 성, 반짝이는 지도"
                                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">쉼표 또는 줄바꿈으로 여러 개를 입력할 수 있어요.</p>
                                        </div>

                                        <div>
                                            <label htmlFor="artStyle" className="block text-sm font-medium text-gray-700">
                                                그림 스타일
                                            </label>
                                            <Select
                                                id="artStyle"
                                                options={artStyleOptions}
                                                selectedValue={artStyle}
                                                onChange={setArtStyle}
                                                className="mt-1 block w-full"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">선택하지 않으면 AI가 상황에 맞는 스타일을 제안합니다.</p>
                                        </div>
                                    </div>
                                )}
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
