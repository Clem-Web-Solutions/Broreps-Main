import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import db from '../config/database.js';
import { smmRequest } from './smm.js';

const router = express.Router();

/**
 * Get all services with their availability status
 */
router.get('/services', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [services] = await db.query(`
      SELECT 
        s.*,
        p.name as provider_name,
        p.active as provider_active,
        p.api_url
      FROM allowed_services s
      LEFT JOIN providers p ON s.provider = p.name
      ORDER BY s.service_name ASC
    `);

    res.json({ 
      success: true,
      services: services 
    });
  } catch (err) {
    console.error('Get refill services error:', err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

/**
 * Check service availability with provider
 */
router.post('/check-service/:serviceId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const serviceId = req.params.serviceId;

    // Get service details
    const [services] = await db.query(
      'SELECT * FROM allowed_services WHERE id = ?',
      [serviceId]
    );

    if (services.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const service = services[0];

    // Get provider info
    const [providers] = await db.query(
      'SELECT * FROM providers WHERE name = ? AND active = TRUE',
      [service.provider]
    );

    if (providers.length === 0) {
      return res.status(400).json({ 
        error: `Provider ${service.provider} not found or inactive`,
        available: false 
      });
    }

    const provider = providers[0];

    // Get all services from provider
    let providerServices = [];
    try {
      providerServices = await smmRequest(provider, 'services', {});
    } catch (error) {
      console.error(`Failed to fetch services from ${provider.name}:`, error.message);
      return res.status(500).json({ 
        error: 'Failed to connect to provider',
        available: false 
      });
    }

    // Check if service exists in provider's catalog
    const serviceExists = Array.isArray(providerServices) && 
                         providerServices.some(ps => ps.service === service.service_id);

    // If service became unavailable, create alert
    if (!serviceExists) {
      await db.query(
        `INSERT INTO alerts (type, title, message, enabled)
         VALUES (?, ?, ?, ?)`,
        [
          'system',
          'Service indisponible',
          `Le service "${service.service_name}" (ID: ${service.service_id}) n'est plus disponible chez ${service.provider}`,
          true
        ]
      );
      console.log(`❌ Service ${service.service_id} is UNAVAILABLE`);
    } else {
      console.log(`✅ Service ${service.service_id} is AVAILABLE`);
    }

    res.json({
      success: true,
      available: serviceExists,
      service_id: service.service_id,
      service_name: service.service_name,
      provider: service.provider
    });
  } catch (err) {
    console.error('Check service error:', err);
    res.status(500).json({ error: 'Failed to check service' });
  }
});

/**
 * Check ALL services availability (CRON job endpoint)
 */
router.post('/check-all', async (req, res) => {
  try {
    // Verify CRON secret
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET || 'your-cron-secret-key';
    
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('🔄 Starting daily service availability check...');

    // Get all services
    const [services] = await db.query(`
      SELECT s.*, p.api_url, p.api_key, p.active as provider_active
      FROM allowed_services s
      LEFT JOIN providers p ON s.provider = p.name
    `);

    let checkedCount = 0;
    let unavailableCount = 0;
    let errorCount = 0;
    const results = [];

    for (const service of services) {
      try {
        // Skip if provider is inactive
        if (!service.provider_active) {
          console.log(`⚠️  Skipping ${service.service_id} - provider ${service.provider} is inactive`);
          continue;
        }

        // Get provider services
        const provider = {
          name: service.provider,
          api_url: service.api_url,
          api_key: service.api_key
        };

        let providerServices = [];
        try {
          providerServices = await smmRequest(provider, 'services', {});
        } catch (error) {
          console.error(`Failed to fetch services from ${provider.name}:`, error.message);
          errorCount++;
          continue;
        }

        // Check if service exists
        const serviceExists = Array.isArray(providerServices) && 
                             providerServices.some(ps => ps.service === service.service_id);

        checkedCount++;

        if (!serviceExists) {
          unavailableCount++;
          
          // Create alert
          await db.query(
            `INSERT INTO alerts (type, title, message, enabled)
             VALUES (?, ?, ?, ?)`,
            [
              'system',
              'Service indisponible',
              `Le service "${service.service_name}" (ID: ${service.service_id}) n'est plus disponible chez ${service.provider}`,
              true
            ]
          );
          console.log(`❌ Service ${service.service_id} is UNAVAILABLE`);
        } else {
          console.log(`✅ Service ${service.service_id} is AVAILABLE`);
        }

        results.push({
          service_id: service.service_id,
          service_name: service.service_name,
          provider: service.provider,
          available: serviceExists
        });

      } catch (error) {
        console.error(`Error checking service ${service.service_id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`✅ Service availability check completed:`);
    console.log(`   - Checked: ${checkedCount}`);
    console.log(`   - Unavailable: ${unavailableCount}`);
    console.log(`   - Errors: ${errorCount}`);

    res.json({
      success: true,
      checked: checkedCount,
      unavailable: unavailableCount,
      errors: errorCount,
      results: results
    });
  } catch (err) {
    console.error('Check all services error:', err);
    res.status(500).json({ error: 'Failed to check all services' });
  }
});

/**
 * Get service check history/logs
 */
router.get('/history', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [history] = await db.query(`
      SELECT 
        id, type, title, message, enabled, created_at
      FROM alerts
      WHERE type = 'system' 
        AND title = 'Service indisponible'
      ORDER BY created_at DESC
      LIMIT 100
    `);

    res.json({ 
      success: true,
      history: history 
    });
  } catch (err) {
    console.error('Get refill history error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export default router;
