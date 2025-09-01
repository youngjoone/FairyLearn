import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { useToast } from '@/components/ui/ToastProvider';
import useApi from '@/hooks/useApi';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onPaymentSuccess }) => {
  const { fetchWithErrorHandler } = useApi();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleMockPayment = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithErrorHandler<{ purchaseId: number, status: string }>(
        'http://localhost:8080/api/pay/mock',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`, // Send JWT if available
          },
          body: JSON.stringify({ itemCode: 'hires_download', amount: 1000 }),
        }
      );
      if (response.status === 'PAID') {
        onPaymentSuccess();
      } else {
        addToast('결제 실패: ' + response.status, 'error');
      }
    } catch (error: any) {
      if (error.message.includes("로그인 후 고해상도 다운로드가 가능합니다.")) {
        addToast("로그인 후 이용 가능합니다.", "error");
      } else {
        // Error already handled by useApi
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold">고해상도 다운로드</h2>
        </CardHeader>
        <CardContent>
          <p className="mb-4">워터마크 없는 고해상도 이미지를 다운로드하려면 결제가 필요합니다.</p>
          <p className="text-lg font-semibold mb-4">가격: ₩1,000</p>
          <p className="text-sm text-muted-foreground">
            (이것은 모의 결제이며, 실제 결제가 이루어지지 않습니다.)
          </p>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleMockPayment} isLoading={isLoading}>
            모의 결제 진행
          </Button>
        </CardFooter>
      </Card>
    </Modal>
  );
};

export default PaymentModal;
