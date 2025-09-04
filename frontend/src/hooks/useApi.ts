import { useEffect, useCallback, useRef } from 'react'; // Import useRef
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/ToastProvider';
import { getAccess, getRefresh, setTokens, clearTokens } from '../lib/auth';

// Flag to prevent multiple refresh token requests
let isRefreshing = false;
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: any) => void; }[] = [];

const processQueue = (error: any | null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(true);
        }
    });
    failedQueue = [];
};

function useApi() {
    const navigate = useNavigate();
    const { addToast } = useToast();

    // Use useRef to store the axios instance so it's not recreated on every render
    const axiosInstance = useRef(axios.create({
        baseURL: 'http://localhost:8080/api',
        headers: {
            'Content-Type': 'application/json',
        },
    }));

    useEffect(() => {
        const instance = axiosInstance.current; // Get the current instance

        // Request Interceptor: Add JWT token to headers
        const requestInterceptor = instance.interceptors.request.use(
            config => {
                const token = getAccess();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            error => Promise.reject(error)
        );

        // Response Interceptor: Handle 401, 403, and other errors
        const responseInterceptor = instance.interceptors.response.use(
            response => response,
            async error => {
                const originalRequest = error.config;
                const status = error.response?.status;
                const refreshToken = getRefresh();

                // Handle 401 Unauthorized: User is not logged in or session expired
                if (status === 401) {
                    // Case 1: No refresh token - User is not logged in or session is fully terminated
                    if (!refreshToken) {
                        clearTokens();
                        addToast('로그인이 필요한 서비스입니다.', 'info');
                        navigate('/login');
                        return Promise.reject(error);
                    }

                    // Case 2: Refresh token exists - Try to refresh the access token
                    if (!isRefreshing) {
                        isRefreshing = true;
                        try {
                            const refreshResponse = await axios.post('http://localhost:8080/api/auth/refresh', { refreshToken });
                            const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data;
                            setTokens(accessToken, newRefreshToken);
                            
                            // Retry the original request with the new token
                            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                            processQueue(null, accessToken);
                            return instance(originalRequest);

                        } catch (refreshError) {
                            console.error('Refresh token failed:', refreshError);
                            clearTokens();
                            processQueue(refreshError, null);
                            addToast('세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
                            navigate('/login');
                            return Promise.reject(refreshError);
                        } finally {
                            isRefreshing = false;
                        }
                    } else {
                        // While token is refreshing, queue subsequent failed requests
                        return new Promise((resolve, reject) => {
                            failedQueue.push({
                                resolve: (token: string) => {
                                    originalRequest.headers.Authorization = `Bearer ${token}`;
                                    resolve(instance(originalRequest));
                                },
                                reject: (err: any) => {
                                    reject(err);
                                }
                            });
                        });
                    }
                }


                // Handle 403 Forbidden
                if (status === 403) {
                    addToast('접근 권한이 없습니다.', 'error');
                    navigate('/'); // Redirect to home for forbidden access
                    return Promise.reject(error);
                }

                // Other errors (5xx, 422, etc.)
                const errorMessage = error.response?.data?.message || error.message;
                addToast(`오류 발생: ${errorMessage}`, 'error');
                return Promise.reject(error);
            }
        );

        // Cleanup interceptors on component unmount
        return () => {
            instance.interceptors.request.eject(requestInterceptor);
            instance.interceptors.response.eject(responseInterceptor);
        };
    }, [navigate, addToast]); // Dependencies remain, but interceptors are stable

    // This is the public function that components will use
    const fetchWithErrorHandler = useCallback(async <T>(url: string, options?: RequestInit): Promise<T> => {
        try {
            const response = await axiosInstance.current({ // Use the ref's current instance
                url,
                method: options?.method || 'GET',
                data: options?.body,
                headers: options?.headers,
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }, []); // No dependencies needed for fetchWithErrorHandler itself, as it uses axiosInstance.current

    return { fetchWithErrorHandler };
}

export default useApi;