import db from './config/database.js';

console.log('🔍 Services disponibles dans la base de données');
console.log('=============================================');
console.log('');

try {
  const [services] = await db.query('SELECT * FROM allowed_services LIMIT 10');
  
  if (services.length === 0) {
    console.log('❌ Aucun service trouvé dans la base de données');
    console.log('');
    console.log('💡 Créons un service de test...');
    
    await db.query(`
      INSERT INTO allowed_services (id, service_id, service_name, provider, delivery_mode)
      VALUES (101, '101', 'Instagram Followers (Test)', 'BulkMedya', 'standard')
      ON DUPLICATE KEY UPDATE service_name = service_name
    `);
    
    console.log('✅ Service de test créé (ID: 101)');
  } else {
    console.log(`✅ ${services.length} service(s) trouvé(s):\n`);
    
    services.forEach(service => {
      console.log(`  📦 ID: ${service.id} | Service ID: ${service.service_id} | ${service.service_name}`);
    });
    
    // Si le service 101 n'existe pas, le créer
    const exists = services.find(s => s.id === 101);
    if (!exists) {
      console.log('');
      console.log('💡 Création du service de test (ID: 101)...');
      
      await db.query(`
        INSERT INTO allowed_services (id, service_id, service_name, provider, delivery_mode)
        VALUES (101, '101', 'Instagram Followers (Test)', 'BulkMedya', 'standard')
      `);
      
      console.log('✅ Service de test créé');
    }
  }
  
  console.log('');
  console.log('👉 Vous pouvez maintenant tester le webhook:');
  console.log('   node test-tagadapay-webhook.js');
  console.log('');
  
  process.exit(0);
} catch (error) {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
}
