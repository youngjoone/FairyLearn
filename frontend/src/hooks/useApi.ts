import axios from 'axios';
import { useCallback } from 'react';
import { getAccess, getRefresh, setTokens, clearTokens } from '../lib/auth';

// --- Axios Instance Setup ---
const axiosInstance = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Interceptor Logic ---
let isRefreshing = false;
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: any) => void; }[] = [];

const processQueue = (error: any | null, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

axiosInstance.interceptors.request.use(
    config => {
        const token = getAccess();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;
        console.log('Interceptor: Caught response error', error.response?.status, error.message);

        if (error.response?.status === 401 && !originalRequest._retry) {
            console.log('Interceptor: Handling 401. Refresh token:', getRefresh());
            if (isRefreshing) {
                console.log('Interceptor: Refreshing in progress, queuing request.');
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    return axiosInstance(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = getRefresh();
            if (!refreshToken) {
                console.log('Interceptor: No refresh token found. Redirecting to login.');
                window.location.href = '/login';
                return Promise.reject(error);
            }

            try {
                console.log('Interceptor: Attempting to refresh token.');
                const { data } = await axiosInstance.post('/auth/refresh', { refreshToken });
                setTokens(data.accessToken, data.refreshToken);
                axiosInstance.defaults.headers.common['Authorization'] = 'Bearer ' + data.accessToken;
                originalRequest.headers['Authorization'] = 'Bearer ' + data.accessToken;
                processQueue(null, data.accessToken);
                console.log('Interceptor: Token refresh successful. Retrying original request.');
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                console.error('Interceptor: Token refresh failed.', refreshError);
                clearTokens();
                processQueue(refreshError, null);
                console.log('Interceptor: Redirecting to login after refresh failure.');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// --- Custom Hook Definition ---
function useApi() {
    const fetchWithErrorHandler = useCallback(async <T>(url: string, options?: any): Promise<T> => {
        try {
            const response = await axiosInstance({
                url,
                method: options?.method || 'GET',
                data: options?.body,
                ...options,
            });
            return response.data;
        } catch (error) {
            console.error('fetchWithErrorHandler caught error:', error);
            throw error;
        }
    }, []);

    return { fetchWithErrorHandler };
}

export default useApi;
