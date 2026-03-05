/**
 * setup-tagadapay-user.js
 * ────────────────────────────────────────────────────────────────
 * Crée / met à jour l'utilisateur Supply utilisé par TagadaPay
 * ainsi que les tables nécessaires (tagadapay_orders, _webhook_logs,
 * _verification_logs, _subscriptions).
 *
 * Usage :
 *   node scripts/setup-tagadapay-user.js
 *   node scripts/setup-tagadapay-user.js --email=payment@broreps.fr --password=MonMotDePasse
 *
 * Options :
 *   --email=<email>      Email du compte (défaut : tagadapay@broreps.fr)
 *   --password=<pass>    Mot de passe (défaut : généré aléatoirement)
 *   --name=<name>        Nom affiché  (défaut : TagadaPay Bot)
 *   --role=<user|admin>  Rôle         (défaut : user)
 *   --reset-password     Force la mise à jour du mot de passe même si le compte existe
 * ────────────────────────────────────────────────────────────────
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ── Parse CLI args ─────────────────────────────────────────── */
const args = Object.fromEntries(
    process.argv.slice(2)
        .filter(a => a.startsWith('--'))
        .map(a => {
            const [key, ...rest] = a.slice(2).split('=');
            return [key, rest.length ? rest.join('=') : true];
        })
);

const CONFIG = {
    email:         args.email         || 'tagadapay@broreps.fr',
    password:      args.password      || null,          // null → generate
    name:          args.name          || 'TagadaPay Bot',
    role:          args.role          || 'user',
    resetPassword: args['reset-password'] === true,
};

/* ── Colour helpers ─────────────────────────────────────────── */
const c = {
    green:  (s) => `\x1b[32m${s}\x1b[0m`,
    yellow: (s) => `\x1b[33m${s}\x1b[0m`,
    red:    (s) => `\x1b[31m${s}\x1b[0m`,
    cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
    bold:   (s) => `\x1b[1m${s}\x1b[0m`,
    dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

const log = {
    step:    (msg) => console.log(c.cyan('  ◆ ') + msg),
    ok:      (msg) => console.log(c.green('  ✔ ') + msg),
    warn:    (msg) => console.log(c.yellow('  ⚠ ') + msg),
    error:   (msg) => console.error(c.red('  ✖ ') + msg),
    info:    (msg) => console.log(c.dim('    ' + msg)),
    section: (msg) => console.log('\n' + c.bold(c.cyan('▸ ' + msg))),
};

/* ── DB Tables SQL ───────────────────────────────────────────── */
const TABLES_SQL = `
-- TagadaPay Orders
CREATE TABLE IF NOT EXISTS \`tagadapay_orders\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`payment_id\` VARCHAR(255) UNIQUE NOT NULL,
  \`checkout_session_id\` VARCHAR(255) DEFAULT NULL,
  \`order_id\` VARCHAR(255) DEFAULT NULL,
  \`order_type\` ENUM('payment','subscription') DEFAULT 'payment',
  \`customer_email\` VARCHAR(255) DEFAULT NULL,
  \`customer_name\` VARCHAR(255) DEFAULT NULL,
  \`customer_phone\` VARCHAR(50) DEFAULT NULL,
  \`product_title\` VARCHAR(500) DEFAULT NULL,
  \`quantity\` INT DEFAULT 1,
  \`amount\` INT NOT NULL COMMENT 'Amount in cents',
  \`currency\` VARCHAR(10) DEFAULT 'EUR',
  \`social_link\` TEXT DEFAULT NULL,
  \`service_id\` INT DEFAULT NULL,
  \`payment_status\` VARCHAR(50) DEFAULT 'pending',
  \`metadata\` JSON DEFAULT NULL,
  \`internal_order_id\` INT DEFAULT NULL,
  \`is_processed\` BOOLEAN DEFAULT FALSE,
  \`shopify_order_number\` INT DEFAULT NULL,
  \`payment_created_at\` DATETIME DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payment_id (payment_id),
  INDEX idx_customer_email (customer_email),
  INDEX idx_payment_status (payment_status),
  INDEX idx_internal_order_id (internal_order_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (internal_order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (service_id) REFERENCES allowed_services(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TagadaPay Subscriptions
CREATE TABLE IF NOT EXISTS \`tagadapay_subscriptions\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`subscription_id\` VARCHAR(255) UNIQUE NOT NULL COMMENT 'TagadaPay subscription ID',
  \`subscription_status\` VARCHAR(50) DEFAULT 'active',
  \`subscription_interval\` VARCHAR(50) DEFAULT NULL COMMENT 'monthly, yearly, etc.',
  \`subscription_next_billing_date\` DATETIME DEFAULT NULL,
  \`subscription_started_at\` DATETIME DEFAULT NULL,
  \`customer_email\` VARCHAR(255) DEFAULT NULL,
  \`customer_name\` VARCHAR(255) DEFAULT NULL,
  \`product_title\` VARCHAR(500) DEFAULT NULL,
  \`amount\` INT NOT NULL COMMENT 'Amount in cents',
  \`currency\` VARCHAR(10) DEFAULT 'EUR',
  \`social_link\` TEXT DEFAULT NULL,
  \`payment_count\` INT DEFAULT 0,
  \`total_paid\` INT DEFAULT 0 COMMENT 'Total paid across all payments in cents',
  \`metadata\` JSON DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_subscription_id (subscription_id),
  INDEX idx_customer_email (customer_email),
  INDEX idx_status (subscription_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TagadaPay Webhook Logs
CREATE TABLE IF NOT EXISTS \`tagadapay_webhook_logs\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`event_type\` VARCHAR(100) NOT NULL,
  \`event_id\` VARCHAR(255) NOT NULL,
  \`payload\` LONGTEXT NOT NULL,
  \`ip_address\` VARCHAR(45) DEFAULT NULL,
  \`signature_valid\` BOOLEAN DEFAULT FALSE,
  \`processed\` BOOLEAN DEFAULT FALSE,
  \`error_message\` TEXT DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_type (event_type),
  INDEX idx_event_id (event_id),
  INDEX idx_processed (processed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TagadaPay Verification Logs (public tracking)
CREATE TABLE IF NOT EXISTS \`tagadapay_verification_logs\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`payment_id\` VARCHAR(255) DEFAULT NULL,
  \`order_id\` VARCHAR(255) DEFAULT NULL,
  \`email_attempted\` VARCHAR(255) DEFAULT NULL,
  \`ip_address\` VARCHAR(45) DEFAULT NULL,
  \`success\` BOOLEAN DEFAULT FALSE,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payment_id (payment_id),
  INDEX idx_email (email_attempted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

/* ── .env variable check ─────────────────────────────────────── */
const REQUIRED_ENV = [
    'TAGADAPAY_API_KEY',
    'TAGADAPAY_WEBHOOK_SECRET',
    'TAGADAPAY_BASE_URL',
];

function checkEnv() {
    log.section('Vérification des variables d\'environnement');
    let allOk = true;
    for (const key of REQUIRED_ENV) {
        if (process.env[key]) {
            log.ok(`${key} configuré`);
        } else {
            log.warn(`${key} manquant dans .env`);
            allOk = false;
        }
    }
    if (!allOk) {
        log.warn('Certaines variables TagadaPay sont manquantes.');
        log.info('Ajoutez-les dans server/.env :');
        log.info('  TAGADAPAY_API_KEY=<votre-clé>');
        log.info('  TAGADAPAY_WEBHOOK_SECRET=<votre-secret>');
        log.info('  TAGADAPAY_BASE_URL=https://app.tagadapay.com/api/public/v1');
    }
    return allOk;
}

/* ── Main ────────────────────────────────────────────────────── */
async function main() {
    console.log('\n' + c.bold('═══════════════════════════════════════════════════'));
    console.log(c.bold('  🏷  Setup TagadaPay User & Tables'));
    console.log(c.bold('═══════════════════════════════════════════════════'));

    checkEnv();

    /* Connect to DB */
    log.section('Connexion à la base de données');
    let conn;
    try {
        conn = await mysql.createConnection({
            host:     process.env.DB_HOST     || 'localhost',
            port:     parseInt(process.env.DB_PORT || '3306'),
            user:     process.env.DB_USER     || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME     || 'broreps_panel',
            multipleStatements: true,
        });
        log.ok(`Connecté à ${process.env.DB_HOST || 'localhost'}/${process.env.DB_NAME || 'broreps_panel'}`);
    } catch (err) {
        log.error('Impossible de se connecter à la base de données :');
        log.info(err.message);
        process.exit(1);
    }

    /* Create tables */
    log.section('Création / vérification des tables TagadaPay');
    try {
        await conn.query(TABLES_SQL);
        log.ok('tagadapay_orders');
        log.ok('tagadapay_subscriptions');
        log.ok('tagadapay_webhook_logs');
        log.ok('tagadapay_verification_logs');
    } catch (err) {
        log.error('Erreur lors de la création des tables :');
        log.info(err.message);
        await conn.end();
        process.exit(1);
    }

    /* Handle user */
    log.section(`Utilisateur Supply : ${CONFIG.email}`);

    const [existing] = await conn.execute(
        'SELECT id, name, email, role, status FROM users WHERE email = ? LIMIT 1',
        [CONFIG.email]
    );

    const plainPassword = CONFIG.password || crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    if (existing.length === 0) {
        /* Create */
        log.step('Création du compte...');
        try {
            const [result] = await conn.execute(
                'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
                [CONFIG.name, CONFIG.email, hashedPassword, CONFIG.role, 'approved']
            );
            log.ok(`Compte créé (id=${result.insertId})`);
            printCredentials(CONFIG.email, plainPassword);
        } catch (err) {
            log.error('Erreur lors de la création du compte :');
            log.info(err.message);
        }
    } else {
        const user = existing[0];
        log.info(`Compte existant (id=${user.id}, rôle=${user.role}, statut=${user.status})`);

        /* Ensure approved */
        if (user.status !== 'approved') {
            await conn.execute('UPDATE users SET status = ? WHERE id = ?', ['approved', user.id]);
            log.ok('Statut mis à jour → approved');
        } else {
            log.ok('Statut : approved ✓');
        }

        /* Reset password if requested */
        if (CONFIG.resetPassword) {
            await conn.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
            log.ok('Mot de passe réinitialisé');
            printCredentials(CONFIG.email, plainPassword);
        } else {
            log.warn('Mot de passe non modifié (utilisez --reset-password pour le changer)');
        }
    }

    /* Summary of env state */
    log.section('Résumé de la configuration');
    log.info(`URL Webhook à configurer dans TagadaPay :`);
    const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3005}`;
    log.info(c.cyan(`  ${serverUrl}/api/tagadapay/webhook`));
    log.info('');
    log.info('Variables .env nécessaires :');
    for (const key of REQUIRED_ENV) {
        const val = process.env[key];
        const display = val
            ? c.green(`✔ ${key}`) + c.dim(` = ${val.slice(0, 8)}…`)
            : c.yellow(`⚠ ${key}`) + c.dim(' = (non défini)');
        log.info('  ' + display);
    }

    await conn.end();
    console.log('\n' + c.bold(c.green('  ✔ Setup terminé avec succès !\n')));
}

function printCredentials(email, password) {
    console.log('');
    console.log(c.bold('  ┌─────────────────────────────────┐'));
    console.log(c.bold('  │  Identifiants du compte créé    │'));
    console.log(c.bold('  ├─────────────────────────────────┤'));
    console.log(c.bold(`  │  Email    : ${email.padEnd(20)} │`));
    console.log(c.bold(`  │  Password : ${password.padEnd(20)} │`));
    console.log(c.bold('  └─────────────────────────────────┘'));
    console.log('');
    console.log(c.yellow('  ⚠  Notez ce mot de passe, il ne sera plus affiché.'));
}

main().catch((err) => {
    console.error(c.red('\n  ✖ Erreur fatale :'), err.message);
    process.exit(1);
});
