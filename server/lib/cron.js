import cron from 'node-cron';
import axios from 'axios';

const API_BASE = process.env.API_URL || 'http://localhost:3005/api';
const CRON_SECRET = process.env.CRON_SECRET || 'your-cron-secret-key';

/**
 * Initialize CRON jobs for drip feed processing
 */
export function initCron() {
    console.log('🕐 Initializing CRON jobs...');

    // Process drip feed orders every hour at minute 0
    cron.schedule('0 * * * *', async () => {
        console.log('⏰ Running drip feed processor...');
        try {
            const response = await axios.post(`${API_BASE}/drip-feed/process`, {}, {
                    headers: {
                        'Authorization': `Bearer ${CRON_SECRET}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 300000 // 5 minutes timeout
                });

            if (response.data.success) {
                console.log(`✅ Processed ${response.data.processed} drip feed orders`);
            }
        } catch (error) {
            console.error('❌ Drip feed processing failed:', error.message);
        }
    });

    // Sync order statuses with provider API every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
        console.log('🔄 Running order status sync...');
        try {
            const response = await axios.post(`${API_BASE}/orders/sync-status`, {}, {
                headers: {
                    'Authorization': `Bearer ${CRON_SECRET}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000 // 1 minute timeout
            });

            if (response.data.success) {
                console.log(`✅ Synced ${response.data.synced} orders`);
            }
        } catch (error) {
            console.error('❌ Order status sync failed:', error.message);
        }
    });

    console.log('✅ CRON jobs scheduled:');
    console.log('   - Drip feed processor: every hour at :00');
    console.log('   - Order status sync: every 10 minutes');
}

/**
 * Manually trigger drip feed processing (for testing)
 */
export async function manualProcess() {
    console.log('🔄 Manually triggering drip feed processing...');
    try {
        const response = await axios.post(`${API_BASE}/drip-feed/process`, {}, {
            headers: {
                'Authorization': `Bearer ${CRON_SECRET}`,
                'Content-Type': 'application/json'
            },
            timeout: 300000
        });

        return response.data;
    } catch (error) {
        console.error('Manual drip feed processing failed:', error.message);
        throw error;
    }
}

/**
 * Manually trigger order status sync (for testing)
 */
export async function manualSync() {
    console.log('🔄 Manually triggering order status sync...');
    try {
        const response = await axios.post(`${API_BASE}/orders/sync-status`, {}, {
            headers: {
                'Authorization': `Bearer ${CRON_SECRET}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });

        return response.data;
    } catch (error) {
        console.error('Manual order sync failed:', error.message);
        throw error;
    }
}
