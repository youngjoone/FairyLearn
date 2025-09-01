import { useCallback } from 'react';
import { useToast } from '../components/ui/ToastProvider';
import { getAccess, getRefresh, setTokens, clearTokens } from '../lib/auth'; // Import auth utilities

interface CommonErrorResponse {
    code: string;
    message: string;
    requestId: string;
    timestamp: string;
}

// Custom error for 402 Payment Required
export class PaymentRequiredError extends Error {
    code: string;
    requestId: string;
    timestamp: string;

    constructor(message: string, code: string = "PAYMENT_REQUIRED", requestId: string = "N/A", timestamp: string = new Date().toISOString()) {
        super(message);
        this.name = "PaymentRequiredError";
        this.code = code;
        this.requestId = requestId;
        this.timestamp = timestamp;
    }
}

// Flag to prevent multiple refresh token requests
let isRefreshing = false;
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: any) => void; }[] = [];

const processQueue = (error: any | null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(true); // Resolve with true to indicate successful refresh
        }
    });
    failedQueue = [];
};

function useApi() {
    const { addToast } = useToast();

    const fetchWithErrorHandler = useCallback(async <T>(
        url: string,
        options?: RequestInit
    ): Promise<T> => {
        try {
            const token = getAccess();
            const headers: Record<string, string> = {
                ...(options?.headers as Record<string, string>),
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                console.log(`[API] Sending token for ${url}: ${token.substring(0, 10)}...`);
            }

            let response = await fetch(url, {
                ...options,
                headers,
            });

            if (response.status === 401) {
                const refreshToken = getRefresh();
                if (refreshToken && !isRefreshing) {
                    isRefreshing = true;
                    try {
                        console.log('[API] Attempting to refresh token...');
                        const refreshResponse = await fetch('http://localhost:8080/api/auth/refresh', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ refreshToken }),
                        });

                        if (refreshResponse.ok) {
                            const refreshData = await refreshResponse.json();
                            setTokens(refreshData.accessToken, refreshData.refreshToken);
                            console.log('[API] Token refreshed successfully. Retrying original request.');
                            processQueue(null); // Resolve all pending requests
                            // Retry the original request with new token
                            headers['Authorization'] = `Bearer ${refreshData.accessToken}`;
                            response = await fetch(url, {
                                ...options,
                                headers,
                            });
                        } else {
                            console.error('[API] Refresh token failed. Clearing tokens.');
                            clearTokens();
                            processQueue(new Error('Refresh token failed'));
                            addToast('세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
                            // Redirect to home or login page
                            window.location.href = '/'; // Hard reload to clear state
                            throw new Error('Refresh token failed');
                        }
                    } catch (refreshError) {
                        console.error('[API] Error during token refresh:', refreshError);
                        clearTokens();
                        processQueue(refreshError);
                        addToast('세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
                        window.location.href = '/';
                        throw refreshError;
                    } finally {
                        isRefreshing = false;
                    }
                } else if (isRefreshing) {
                    // If a refresh is already in progress, queue the request
                    console.log('[API] Refresh in progress, queuing request.');
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve: () => resolve(fetchWithErrorHandler(url, options)), reject });
                    }) as Promise<T>;
                } else {
                    // No refresh token or refresh failed, clear tokens and redirect
                    console.error('[API] No refresh token available or refresh failed. Clearing tokens.');
                    clearTokens();
                    addToast('세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
                    window.location.href = '/';
                    throw new Error('No refresh token available');
                }
            }

            if (!response.ok) {
                let errorData: CommonErrorResponse | null = null;
                try {
                    errorData = await response.json();
                } catch (jsonError) {
                    console.error("Failed to parse error response JSON:", jsonError);
                }

                const errorMessage = errorData?.message || `HTTP error! status: ${response.status}`;
                const errorCode = errorData?.code || `HTTP_${response.status}`;
                const requestId = errorData?.requestId || 'N/A';
                const timestamp = errorData?.timestamp || new Date().toISOString();

                const fullErrorMessage = `${errorMessage} (요청ID: ${requestId})`;
                addToast(fullErrorMessage, 'error');
                console.error("API Error Details:", {
                    code: errorCode,
                    message: errorMessage,
                    requestId: requestId,
                    timestamp: timestamp,
                    status: response.status,
                    url: url,
                });

                if (response.status === 402 && errorCode === "PAYMENT_REQUIRED") {
                    throw new PaymentRequiredError(errorMessage, errorCode, requestId, timestamp);
                }

                throw new Error(fullErrorMessage);
            }

            return response.json();
        } catch (networkError) {
            if (networkError instanceof PaymentRequiredError) {
                throw networkError;
            }

            console.error("Network error:", networkError);
            const errorMessage = "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.";
            addToast(errorMessage, 'error');
            throw new Error(errorMessage);
        }
    }, [addToast]);

    return { fetchWithErrorHandler };
}

export default useApi;