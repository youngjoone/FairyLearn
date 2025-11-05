import React, { useEffect, useMemo, useState } from 'react';
import Meta from '@/lib/seo';
import useApi from '@/hooks/useApi';
import { useToast } from '@/components/ui/ToastProvider';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { useAuth } from '@/contexts/AuthContext';

type HeartTransactionType = 'CHARGE' | 'SPEND' | 'ADJUST';

interface HeartProduct {
  code: string;
  name: string;
  description?: string | null;
  hearts: number;
  bonusHearts: number;
  price: number;
  sortOrder: number;
}

interface HeartTransaction {
  id: number;
  type: HeartTransactionType;
  amount: number;
  balanceAfter: number;
  description?: string | null;
  createdAt: string;
}

interface WalletSummary {
  balance: number;
  recentTransactions: HeartTransaction[];
}

interface BillingOrder {
  id: number;
  productCode: string;
  productName?: string | null;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  heartsPerUnit: number;
  bonusHeartsPerUnit: number;
  status: 'PENDING' | 'PAID' | 'CANCELED';
  requestedAt: string;
  paidAt?: string | null;
}

interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isNaN(value) ? 0 : value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const normalizeProduct = (raw: any): HeartProduct => ({
  code: raw?.code ?? raw?.product_code ?? '',
  name: raw?.name ?? '',
  description: raw?.description ?? null,
  hearts: toNumber(raw?.hearts ?? raw?.quantity ?? 0),
  bonusHearts: toNumber(raw?.bonusHearts ?? raw?.bonus_hearts ?? 0),
  price: toNumber(raw?.price ?? 0),
  sortOrder: toNumber(raw?.sortOrder ?? raw?.sort_order ?? 0),
});

const normalizeTransaction = (raw: any): HeartTransaction => ({
  id: toNumber(raw?.id),
  type: (raw?.type ?? 'CHARGE') as HeartTransactionType,
  amount: toNumber(raw?.amount),
  balanceAfter: toNumber(raw?.balanceAfter ?? raw?.balance_after),
  description: raw?.description ?? null,
  createdAt: raw?.createdAt ?? raw?.created_at ?? new Date().toISOString(),
});

const normalizeOrder = (raw: any): BillingOrder => ({
  id: toNumber(raw?.id),
  productCode: raw?.productCode ?? raw?.product_code ?? '',
  productName: raw?.productName ?? raw?.product_name ?? null,
  quantity: toNumber(raw?.quantity ?? 1),
  pricePerUnit: toNumber(raw?.pricePerUnit ?? raw?.price_per_unit),
  totalAmount: toNumber(raw?.totalAmount ?? raw?.total_amount),
  heartsPerUnit: toNumber(raw?.heartsPerUnit ?? raw?.hearts_per_unit),
  bonusHeartsPerUnit: toNumber(raw?.bonusHeartsPerUnit ?? raw?.bonus_hearts_per_unit),
  status: (raw?.status ?? 'PENDING') as BillingOrder['status'],
  requestedAt: raw?.requestedAt ?? raw?.requested_at ?? new Date().toISOString(),
  paidAt: raw?.paidAt ?? raw?.paid_at ?? null,
});

const normalizeWallet = (raw: any): WalletSummary => ({
  balance: toNumber(raw?.balance),
  recentTransactions: Array.isArray(raw?.recentTransactions ?? raw?.recent_transactions)
    ? (raw?.recentTransactions ?? raw?.recent_transactions).map(normalizeTransaction)
    : [],
});

const currencyFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const dateFormatter = (value?: string | null) => {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString('ko-KR');
};

const BillingManagement: React.FC = () => {
  const { fetchWithErrorHandler } = useApi();
  const { addToast } = useToast();
  const { isLoggedIn } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [products, setProducts] = useState<HeartProduct[]>([]);
  const [orders, setOrders] = useState<BillingOrder[]>([]);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  const totalBalanceLabel = useMemo(() => {
    if (!wallet) {
      return '—';
    }
    return `${wallet.balance.toLocaleString('ko-KR')}개`;
  }, [wallet]);

  const loadWallet = async () => {
    const summary = await fetchWithErrorHandler<any>('wallets/me');
    setWallet(normalizeWallet(summary));
  };

  const loadProducts = async () => {
    const list = await fetchWithErrorHandler<any[]>('billing/products');
    setProducts(Array.isArray(list) ? list.map(normalizeProduct) : []);
  };

  const loadOrders = async () => {
    const response = await fetchWithErrorHandler<PageResponse<any>>('billing/orders?size=20');
    const items = Array.isArray(response?.content) ? response.content.map(normalizeOrder) : [];
    setOrders(items);
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setIsLoading(false);
      return;
    }

    const bootstrap = async () => {
      setIsLoading(true);
      try {
        await Promise.all([loadWallet(), loadProducts(), loadOrders()]);
      } catch (error) {
        addToast('결제 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.', 'error');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrap();
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePurchase = async (productCode: string) => {
    setIsPurchasing(productCode);
    try {
      const orderResponse = await fetchWithErrorHandler<any>('billing/orders', {
        method: 'POST',
        body: { productCode, quantity: 1 },
      });
      const order = normalizeOrder(orderResponse);

      const confirmedResponse = await fetchWithErrorHandler<any>(`billing/orders/${order.id}/confirm`, {
        method: 'POST',
        body: { pgProvider: 'MOCK' },
      });
      const confirmed = normalizeOrder(confirmedResponse);

      await Promise.all([loadWallet(), loadOrders()]);
      const product = products.find(item => item.code === confirmed.productCode);
      const granted = confirmed.quantity * (confirmed.heartsPerUnit + confirmed.bonusHeartsPerUnit);
      addToast(`하트 ${granted.toLocaleString('ko-KR')}개가 충전되었어요!`, 'success');
      if (!product) {
        setProducts(prev => prev);
      }
    } catch (error) {
      console.error(error);
      addToast('결제 처리 중 문제가 발생했습니다.', 'error');
    } finally {
      setIsPurchasing(null);
    }
  };

  if (!isLoggedIn) {
    return (
      <EmptyState
        title="로그인이 필요합니다."
        description="결제 내역과 하트 잔액을 확인하려면 먼저 로그인해 주세요."
        icon="💳"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
      <Meta title="결제 관리 — FairyLearn" description="하트 충전 및 결제 내역을 확인하세요." />
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">결제 관리</h1>
          <p className="text-muted-foreground">하트 충전과 사용 내역을 한 곳에서 확인할 수 있어요.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="md:col-span-1">
            <CardHeader>
              <h2 className="text-lg font-semibold">보유 하트</h2>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalBalanceLabel}</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <h2 className="text-lg font-semibold">빠른 충전</h2>
              <p className="text-sm text-muted-foreground">원하는 하트 패키지를 선택해 바로 충전할 수 있어요.</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {products.map(product => {
                  const totalHearts = product.hearts + product.bonusHearts;
                  return (
                    <Card key={product.code} className="border border-border">
                      <CardHeader>
                        <h3 className="text-lg font-semibold">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">{currencyFormatter.format(product.price)}</p>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm">총 하트 <span className="font-semibold">{totalHearts.toLocaleString('ko-KR')}개</span></p>
                        {product.bonusHearts > 0 && (
                          <p className="text-xs text-primary">보너스 {product.bonusHearts.toLocaleString('ko-KR')}개 포함</p>
                        )}
                        {product.description && (
                          <p className="text-xs text-muted-foreground">{product.description}</p>
                        )}
                      </CardContent>
                      <CardFooter>
                        <Button
                          className="w-full"
                          onClick={() => handlePurchase(product.code)}
                          isLoading={isPurchasing === product.code}
                          disabled={isPurchasing !== null && isPurchasing !== product.code}
                        >
                          충전하기
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
                {products.length === 0 && (
                  <div className="col-span-full text-sm text-muted-foreground">
                    현재 판매 중인 하트 상품이 없습니다.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">최근 하트 변동</h2>
            </CardHeader>
            <CardContent>
              {(wallet?.recentTransactions?.length ?? 0) > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-2">일시</th>
                      <th className="py-2">내역</th>
                      <th className="py-2 text-right">변동</th>
                      <th className="py-2 text-right">잔액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallet?.recentTransactions?.map(tx => (
                      <tr key={tx.id} className="border-t border-border/60">
                        <td className="py-2 pr-2 align-top whitespace-nowrap">{dateFormatter(tx.createdAt)}</td>
                        <td className="py-2 pr-2 align-top">
                          <div className="font-medium">{tx.description || (tx.type === 'CHARGE' ? '하트 충전' : '하트 사용')}</div>
                          <div className="text-xs text-muted-foreground">{tx.type}</div>
                        </td>
                        <td className={`py-2 pr-2 text-right font-semibold ${tx.amount > 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('ko-KR')}
                        </td>
                        <td className="py-2 text-right">{tx.balanceAfter.toLocaleString('ko-KR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-muted-foreground">아직 하트 변동 내역이 없습니다.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">최근 주문</h2>
            </CardHeader>
            <CardContent>
              {orders.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-2">주문 번호</th>
                      <th className="py-2">상품</th>
                      <th className="py-2 text-right">금액</th>
                      <th className="py-2">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => {
                      const totalHearts = (order.heartsPerUnit + order.bonusHeartsPerUnit) * order.quantity;
                      return (
                        <tr key={order.id} className="border-t border-border/60">
                          <td className="py-2 pr-2">#{order.id}</td>
                          <td className="py-2 pr-2">
                            <div className="font-medium">{order.productName || order.productCode}</div>
                            <div className="text-xs text-muted-foreground">하트 {totalHearts.toLocaleString('ko-KR')}개</div>
                          </td>
                          <td className="py-2 pr-2 text-right">{currencyFormatter.format(order.totalAmount)}</td>
                          <td className="py-2">{order.status === 'PAID' ? '결제 완료' : order.status === 'PENDING' ? '결제 대기' : '취소됨'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-muted-foreground">아직 주문 내역이 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default BillingManagement;
