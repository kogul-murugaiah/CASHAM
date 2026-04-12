export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number = 500) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        let errorMessage = 'An error occurred';
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
            errorMessage = `${response.status} ${response.statusText}`;
            try {
                const text = await response.text();
                if (text && text.length < 100) errorMessage += `: ${text}`;
            } catch (t) { }
        }

        // Redirect to login on 401 if it's not the /auth/user or /auth/login endpoint
        if (response.status === 401 && !url.includes('/api/auth/login') && !url.includes('/api/auth/user')) {
            window.location.href = '/login';
        }

        throw new ApiError(errorMessage, response.status);
    }

    // Handle 204 No Content
    if (response.status === 204) return null;

    return response.json();
}

export const api = {
    get: (url: string) => fetchWithAuth(url),
    post: (url: string, data?: any) => fetchWithAuth(url, { method: 'POST', body: JSON.stringify(data) }),
    put: (url: string, data?: any) => fetchWithAuth(url, { method: 'PUT', body: JSON.stringify(data) }),
    patch: (url: string, data?: any) => fetchWithAuth(url, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (url: string) => fetchWithAuth(url, { method: 'DELETE' }),
};
