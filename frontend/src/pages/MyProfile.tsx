import React, { useEffect, useState } from 'react';
import Meta from '@/lib/seo';
import { useAuth } from '@/contexts/AuthContext';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent } from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/FormControls/Input';
import useApi from '@/hooks/useApi';

const MyProfile: React.FC = () => {
  const { isLoggedIn, profile, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { fetchWithErrorHandler } = useApi();

  useEffect(() => {
    if (!isLoggedIn || profile) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    refreshProfile()
      .catch((error) => {
        console.error('Failed to refresh profile', error);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, profile, refreshProfile]);

  if (!isLoggedIn) {
    return (
      <EmptyState
        title="로그인이 필요합니다."
        description="프로필 정보를 확인하려면 먼저 로그인해 주세요."
        icon="🔐"
      />
    );
  }

  if (isLoading && !profile) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">내 프로필</h1>
        <Card>
          <CardContent>
            <Skeleton className="h-6 w-1/3 mb-3" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname ?? '');
      setIsEditing(false);
      setSaveSuccess(false);
      setSaveError(null);
    }
  }, [profile]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nickname.trim()) {
      setSaveError('닉네임을 입력해 주세요.');
      setSaveSuccess(false);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await fetchWithErrorHandler('/me', {
        method: 'PATCH',
        body: { nickname: nickname.trim() },
      });
      await refreshProfile();
      setSaveSuccess(true);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update nickname', error);
      setSaveError('닉네임을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) {
    return (
      <EmptyState
        title="프로필 정보를 불러오지 못했습니다."
        description="잠시 후 다시 시도해 주세요."
        icon="⚠️"
      />
    );
  }

  return (
    <>
      <Meta title="내 프로필 — FairyLearn" description="내 계정 정보를 확인합니다." />
      <div className="p-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mb-4 text-center">내 프로필</h1>
          <Card>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-2 max-w-xs mx-auto">
                <p className="text-sm text-muted-foreground">닉네임</p>
                {isEditing ? (
                  <Input
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    placeholder="닉네임을 입력하세요"
                    maxLength={64}
                    className="max-w-xs"
                    autoFocus
                  />
                ) : (
                  <p className="text-lg font-semibold">{profile.nickname || '닉네임 없음'}</p>
                )}
              </div>
              <div className="flex items-center gap-3 max-w-xs mx-auto justify-center">
                {isEditing ? (
                  <>
                    <Button type="submit" disabled={isSaving} className="shrink-0">
                      {isSaving ? '저장 중...' : '저장'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setIsEditing(false);
                        setNickname(profile.nickname ?? '');
                        setSaveError(null);
                        setSaveSuccess(false);
                      }}
                      disabled={isSaving}
                    >
                      취소
                    </Button>
                  </>
                ) : (
                  <Button type="button" onClick={() => setIsEditing(true)}>
                    닉네임 변경
                  </Button>
                )}
                <div className="text-sm min-h-[1.25rem]">
                  {saveSuccess && <span className="text-green-600">변경 완료</span>}
                  {saveError && <span className="text-destructive">{saveError}</span>}
                </div>
              </div>
            </form>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">이메일</p>
                <p className="text-lg font-semibold">{profile.email}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">연동 방식</p>
                <p className="text-lg font-semibold">{profile.provider || 'local'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default MyProfile;
