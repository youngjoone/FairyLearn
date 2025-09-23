import React, { useEffect, useState } from 'react';
import Meta from '@/lib/seo';
import { useAuth } from '@/contexts/AuthContext';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent } from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

const MyProfile: React.FC = () => {
  const { isLoggedIn, profile, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

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
        <h1 className="text-2xl font-bold mb-4">내 프로필</h1>
        <Card>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">닉네임</p>
              <p className="text-lg font-semibold">{profile.nickname || '닉네임 없음'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">이메일</p>
              <p className="text-lg font-semibold">{profile.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">연동 방식</p>
              <p className="text-lg font-semibold">{profile.provider || 'local'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default MyProfile;
