// Variables d'environnement minimales pour permettre l'import des modules qui
// valident la configuration au chargement (lib/env.ts).
process.env.DATABASE_URL ||= "mysql://user:pass@localhost:3306/jaze_test";
process.env.DATABASE_TLS_REQUIRED ||= "false";
process.env.ADMIN_EMAIL ||= "admin@example.com";
process.env.ADMIN_PASSWORD ||= "ChangeMe!Complex123";
process.env.MEDIA_SIGNING_SECRET ||= "0123456789abcdef0123456789abcdef";
