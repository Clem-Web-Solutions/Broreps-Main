const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';

class ApiClient {
    private baseURL: string;
    private token: string | null;

    constructor() {
        this.baseURL = API_URL;
        this.token = localStorage.getItem('auth_token');
    }

    setToken(token: string | null) {
        this.token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
    }

    getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    async request(endpoint: string, options: RequestInit = {}): Promise<any> {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                const error: any = new Error(data.error || 'Request failed');
                error.code = data.code;
                error.status = response.status;
                throw error;
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth
    async login(email: string, password: string) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        this.setToken(data.token);
        return data;
    }

    async register(data: { name: string; email: string; password: string }) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getMe() {
        return this.request('/users/me');
    }

    logout() {
        this.setToken(null);
    }

    // Providers (Admin)
    async getProviders() {
        return this.request('/providers');
    }

    async getProvider(provider: string) {
        return this.request(`/providers/${provider}`);
    }

    async createProvider(providerData: { name: string; api_key: string; api_url?: string }) {
        return this.request('/providers', {
            method: 'POST',
            body: JSON.stringify(providerData),
        });
    }

    async updateProvider(provider: string, providerData: { name: string; api_key: string; api_url?: string }) {
        return this.request(`/providers/${provider}`, {
            method: 'PUT',
            body: JSON.stringify(providerData),
        });
    }

    async deleteProvider(provider: string) {
        return this.request(`/providers/${provider}`, {
            method: 'DELETE',
        });
    }

    async testProviderConnection(provider: string) {
        return this.request(`/providers/${provider}/test`, {
            method: 'POST',
        });
    }

    // SMM API
    async getBalance(provider: string) {
        return this.request(`/smm/balance/${provider}`);
    }

    async getServices(provider: string) {
        return this.request(`/smm/services/${provider}`);
    }

    async createOrder(orderData: any) {
        return this.request('/smm/order', {
            method: 'POST',
            body: JSON.stringify(orderData),
        });
    }

    async getOrderStatus(provider: string, orderId: string) {
        return this.request(`/smm/status/${provider}/${orderId}`);
    }

    async refillOrder(provider: string, orderId: string) {
        return this.request('/smm/refill', {
            method: 'POST',
            body: JSON.stringify({ provider, order_id: orderId }),
        });
    }

    async cancelOrder(provider: string, orderId: string) {
        return this.request('/smm/cancel', {
            method: 'POST',
            body: JSON.stringify({ provider, order_id: orderId }),
        });
    }

    // Orders
    async getOrders(filters: Record<string, any> = {}, syncWithApi = false, page = 1, limit = 50) {
        const params = new URLSearchParams({
            ...filters,
            page: page.toString(),
            limit: limit.toString(),
            ...(syncWithApi ? { sync: 'true' } : {})
        });
        return this.request(`/orders?${params}`);
    }

    async getOrder(orderId: string, syncWithApi = true) {
        const params = syncWithApi ? '?sync=true' : '?sync=false';
        return this.request(`/orders/${orderId}${params}`);
    }

    async syncOrders(orderIds: string[]) {
        return this.request('/orders/sync', {
            method: 'POST',
            body: JSON.stringify({ order_ids: orderIds }),
        });
    }

    async getRecentOrders(limit = 10) {
        return this.request(`/orders/recent/${limit}`);
    }

    async importOrders(orderIds: string[], provider = 'BulkMedya', defaultService?: string, defaultLink?: string) {
        return this.request('/import/orders', {
            method: 'POST',
            body: JSON.stringify({ orderIds, provider, defaultService, defaultLink }),
        });
    }

    // Drip Feed
    async getDripAccounts() {
        return this.request('/drip/accounts');
    }

    async getDripAccount(accountId: string) {
        return this.request(`/drip/accounts/${accountId}`);
    }

    async createDripAccount(accountData: any) {
        return this.request('/drip/accounts', {
            method: 'POST',
            body: JSON.stringify(accountData),
        });
    }

    async cancelDripAccount(accountId: string) {
        return this.request(`/drip/accounts/${accountId}`, {
            method: 'DELETE',
        });
    }

    async getDripRuns(filters: Record<string, any> = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`/drip/runs?${params}`);
    }

    async getShopifyOrders() {
        return this.request('/drip/shopify-orders');
    }

    async runDripEngine() {
        return this.request('/drip/run-engine', {
            method: 'POST',
        });
    }

    async fixBlockedRuns() {
        return this.request('/drip/fix-blocked', {
            method: 'POST',
        });
    }

    // Drip Queue Processor
    async processDripQueue() {
        return this.request('/drip-queue/process-queue', {
            method: 'POST',
        });
    }

    async processCompletedOrders() {
        return this.request('/drip-queue/process-completed', {
            method: 'POST',
        });
    }

    // Drip Engine - Run Cycle
    async runDripCycle() {
        return this.request('/drip/run-engine', {
            method: 'POST',
        });
    }

    async processScheduledOrders() {
        return this.request('/drip-queue/process-scheduled', {
            method: 'POST',
        });
    }

    async deleteOrder(orderId: number) {
        return this.request(`/orders/${orderId}`, {
            method: 'DELETE',
        });
    }

    async retryOrder(orderId: number) {
        return this.request(`/orders/${orderId}/retry`, {
            method: 'POST',
        });
    }

    async forceRunDripAccount(accountId: number) {
        return this.request(`/drip/accounts/${accountId}/force-run`, {
            method: 'POST',
        });
    }

    async updateDripAccountStatus(accountId: number, status: string) {
        return this.request(`/drip/accounts/${accountId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
        });
    }

    // Refill
    async getRefillTimers() {
        return this.request('/refill/timers');
    }

    async refreshOngoingOrders() {
        return this.request('/refill/ongoing', {
            method: 'POST',
        });
    }

    async refreshAllOrders() {
        return this.request('/refill/all', {
            method: 'POST',
        });
    }

    async autoRefill() {
        return this.request('/refill/auto-refill', {
            method: 'POST',
        });
    }

    // Alerts
    async getAlerts() {
        return this.request('/alerts');
    }

    async getAlert(id: string) {
        return this.request(`/alerts/${id}`);
    }

    async createAlert(alertData: { type: string; title: string; message: string }) {
        return this.request('/alerts', {
            method: 'POST',
            body: JSON.stringify(alertData),
        });
    }

    async updateAlert(id: string, alertData: { type: string; title: string; message: string; enabled?: boolean }) {
        return this.request(`/alerts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(alertData),
        });
    }

    async deleteAlert(id: string) {
        return this.request(`/alerts/${id}`, {
            method: 'DELETE',
        });
    }

    // Balance
    async getAvailableBalance(provider: string) {
        return this.request(`/balance/${provider}`);
    }

    async getBalanceReservations(provider: string) {
        return this.request(`/balance/reservations/${provider}`);
    }

    // Dashboard
    async getDashboardStats() {
        return this.request('/dashboard/stats');
    }

    async getDashboardRecentOrders() {
        return this.request('/dashboard/recent-orders');
    }

    async getDashboardChartData() {
        return this.request('/dashboard/chart-data');
    }

    // Employees (Admin)
    async getEmployees() {
        return this.request('/users');
    }

    async getEmployee(id: string) {
        return this.request(`/users/${id}`);
    }

    async createEmployee(employeeData: any) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(employeeData),
        });
    }

    async updateEmployee(id: string, employeeData: any) {
        return this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(employeeData),
        });
    }

    async deleteEmployee(id: string) {
        return this.request(`/users/${id}`, {
            method: 'DELETE',
        });
    }

    // Users Management
    async getUsersByStatus(status: 'pending' | 'approved' | 'rejected') {
        return this.request(`/auth/users/${status}`);
    }

    async approveUser(userId: number) {
        return this.request(`/auth/approve-user/${userId}`, {
            method: 'POST',
        });
    }

    async rejectUser(userId: number) {
        return this.request(`/auth/reject-user/${userId}`, {
            method: 'POST',
        });
    }

    // Track (Public)
    async trackOrder(orderNumber: string) {
        return this.request(`/track/${orderNumber}`);
    }

    // Notifications
    async getNotifications(unreadOnly = false, limit = 50) {
        const params = new URLSearchParams();
        if (unreadOnly) params.append('unread', 'true');
        params.append('limit', limit.toString());
        return this.request(`/notifications?${params.toString()}`);
    }

    async markNotificationAsRead(notificationId: number) {
        return this.request(`/notifications/${notificationId}/read`, {
            method: 'PATCH',
        });
    }

    async markAllNotificationsAsRead() {
        return this.request('/notifications/read-all', {
            method: 'POST',
        });
    }

    async deleteNotification(notificationId: number) {
        return this.request(`/notifications/${notificationId}`, {
            method: 'DELETE',
        });
    }

    async clearReadNotifications() {
        return this.request('/notifications/clear/read', {
            method: 'DELETE',
        });
    }

    // Allowed Services
    async getAllowedServices() {
        return this.request('/allowed-services');
    }

    async addAllowedService(serviceId: string, serviceName: string, provider = 'BulkMedya', deliveryMode = 'standard', dripfeedQuantity?: number, isPack = false) {
        return this.request('/allowed-services', {
            method: 'POST',
            body: JSON.stringify({
                service_id: serviceId,
                service_name: serviceName,
                provider,
                delivery_mode: deliveryMode,
                dripfeed_quantity: dripfeedQuantity,
                is_pack: isPack,
            }),
        });
    }

    async deleteAllowedService(serviceId: string) {
        return this.request(`/allowed-services/${serviceId}`, {
            method: 'DELETE',
        });
    }

    async getPackItems(packId: number) {
        return this.request(`/allowed-services/${packId}/pack-items`);
    }

    async addPackItem(packId: number, subServiceId: number, quantityOverride?: number | null) {
        return this.request(`/allowed-services/${packId}/pack-items`, {
            method: 'POST',
            body: JSON.stringify({ sub_service_id: subServiceId, quantity_override: quantityOverride || null }),
        });
    }

    async deletePackItem(itemId: number) {
        return this.request(`/allowed-services/pack-items/${itemId}`, { method: 'DELETE' });
    }

    // Drip Feed Orders
    async createDripFeedOrder(orderData: {
        provider: string;
        service: string;
        service_name?: string;
        link: string;
        quantity: number;
        shopify_order_number?: string;
        dripfeed_enabled?: boolean;
        dripfeed_quantity?: number;
    }) {
        return this.request('/drip-feed/create-order', {
            method: 'POST',
            body: JSON.stringify(orderData),
        });
    }

    async getDripFeedWaitingOrders() {
        return this.request('/drip-feed/waiting-orders');
    }

    async processDripFeedOrders() {
        return this.request('/drip-feed/process', {
            method: 'POST',
            body: JSON.stringify({}),
        });
    }

    // Provider Balances
    async getAllProviderBalances() {
        return this.request('/balances/all-balances');
    }

    // Chat Bot
    async sendChatMessage(message: string) {
        return this.request('/chat', {
            method: 'POST',
            body: JSON.stringify({ message }),
        });
    }

    // Refill / Service Availability Check
    async getRefillServices() {
        return this.request('/refill/services');
    }

    async checkServiceAvailability(serviceId: string) {
        return this.request(`/refill/check-service/${serviceId}`, {
            method: 'POST',
        });
    }

    async checkAllServicesAvailability() {
        return this.request('/refill/check-all-manual', {
            method: 'POST',
        });
    }

    async getRefillHistory() {
        return this.request('/refill/history');
    }
}

export const api = new ApiClient();
export default api;
