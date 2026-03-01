import db from './config/database.js';

console.log('🔍 Vérification des commandes TagadaPay');
console.log('=======================================');
console.log('');

try {
  // Vérifier les commandes TagadaPay
  const [tagadapayOrders] = await db.query(`
    SELECT 
      id, payment_id, order_type, customer_email, 
      product_title, quantity, amount, currency,
      social_link, service_id, payment_status,
      internal_order_id, is_processed,
      created_at
    FROM tagadapay_orders 
    ORDER BY created_at DESC 
    LIMIT 5
  `);
  
  console.log(`📦 ${tagadapayOrders.length} commande(s) TagadaPay trouvée(s):\n`);
  
  tagadapayOrders.forEach(order => {
    console.log(`  💳 Paiement: ${order.payment_id}`);
    console.log(`     Type: ${order.order_type}`);
    console.log(`     Client: ${order.customer_email}`);
    console.log(`     Service: ${order.product_title} (x${order.quantity})`);
    console.log(`     Montant: ${order.amount / 100} ${order.currency}`);
    console.log(`     Lien social: ${order.social_link}`);
    console.log(`     Status: ${order.payment_status}`);
    console.log(`     Traité: ${order.is_processed ? 'Oui' : 'Non'}`);
    if (order.internal_order_id) {
      console.log(`     Commande interne: #${order.internal_order_id}`);
    }
    console.log(`     Créé le: ${order.created_at}`);
    console.log('');
  });
  
  // Vérifier les commandes internes créées
  if (tagadapayOrders.some(o => o.internal_order_id)) {
    console.log('📋 Commandes internes créées:');
    console.log('');
    
    const [internalOrders] = await db.query(`
      SELECT 
        o.id, o.service_id, o.link, o.quantity, 
        o.status, o.provider_order_id,
        s.service_name
      FROM orders o
      LEFT JOIN allowed_services s ON o.service_id = s.service_id
      WHERE o.id IN (SELECT internal_order_id FROM tagadapay_orders WHERE internal_order_id IS NOT NULL)
      ORDER BY o.created_at DESC
      LIMIT 5
    `);
    
    internalOrders.forEach(order => {
      console.log(`  🎯 Commande #${order.id}`);
      console.log(`     Service: ${order.service_name || order.service_id}`);
      console.log(`     Lien: ${order.link}`);
      console.log(`     Quantité: ${order.quantity}`);
      console.log(`     Status: ${order.status}`);
      if (order.provider_order_id) {
        console.log(`     Provider Order: ${order.provider_order_id}`);
      }
      console.log('');
    });
  }
  
  // Vérifier les logs webhook
  const [webhookLogs] = await db.query(`
    SELECT event_type, event_id, signature_valid, created_at
    FROM tagadapay_webhook_logs
    ORDER BY created_at DESC
    LIMIT 5
  `);
  
  console.log(`📝 ${webhookLogs.length} log(s) webhook récent(s):`);
  console.log('');
  
  webhookLogs.forEach(log => {
    console.log(`  🔔 ${log.event_type} | Event: ${log.event_id || 'N/A'} | Signature: ${log.signature_valid ? '✅' : '❌'} | ${log.created_at}`);
  });
  
  console.log('');
  console.log('✅ Vérification terminée!');
  console.log('');
  
  process.exit(0);
} catch (error) {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
}
