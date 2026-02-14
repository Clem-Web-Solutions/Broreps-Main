const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';

class ApiClient {
    private baseURL: string;

    constructor() {
        this.baseURL = API_URL;
    }

    async request(endpoint: string, options: RequestInit = {}): Promise<any> {
        const url = `${this.baseURL}${endpoint}`;
        console.log('🔍 API Request:', url);
        console.log('🔧 Request config:', { method: options.method || 'GET', headers: options.headers });
        
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        };

        try {
            console.log('📡 Fetching from:', url);
            const response = await fetch(url, config);
            console.log('📨 Response status:', response.status, response.statusText);
            
            const data = await response.json();
            console.log('📦 Response data:', data);

            if (!response.ok) {
                console.error('❌ Response not OK:', response.status, data);
                const error: any = new Error(data.error || 'Request failed');
                error.code = data.code;
                error.status = response.status;
                error.response = data;
                throw error;
            }

            return data;
        } catch (error: any) {
            console.error('💥 API Error caught:', error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Failed URL:', url);
            
            // If it's a network error (not HTTP error)
            if (error.name === 'TypeError' || !error.status) {
                const networkError: any = new Error('Impossible de contacter le serveur. Vérifiez que le serveur est démarré.');
                networkError.originalError = error;
                throw networkError;
            }
            
            throw error;
        }
    }

    // Track (Public)
    async trackOrder(orderNumber: string) {
        return this.request(`/track/${orderNumber}`);
    }
}

export const api = new ApiClient();
export default api;
