import axios from 'axios';

const API_URL = 'http://localhost:3000/api'; // Adjust if running elsewhere

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor to add Token
apiClient.interceptors.request.use(config => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const api = {
    login: async (email, password) => {
        try {
            const response = await apiClient.post('/auth/login', { email, password });
            const { token, user } = response.data;
            if (typeof window !== 'undefined') {
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
            }
            return { token, user };
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Login failed');
        }
    },

    getConfigs: async () => {
        const response = await apiClient.get('/configs');
        return response.data;
    },

    updateConfigs: async (newConfigs) => {
        const response = await apiClient.put('/configs', newConfigs);
        return response.data;
    },

    getTrelloData: async () => {
        const response = await apiClient.get('/trello/board-data');
        return response.data;
    }
};
