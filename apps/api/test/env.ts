import { testDatabaseUrl } from './db-url';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDatabaseUrl();
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';
process.env.ADMIN_KEY = 'test-admin-key-123';
process.env.APPLE_AUDIENCES = 'app.playce.mobile';
process.env.GOOGLE_CLIENT_IDS = 'test-client.apps.googleusercontent.com';
process.env.SMTP_URL = '';
