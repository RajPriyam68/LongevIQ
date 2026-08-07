process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.PORT = '4100';
process.env.DATABASE_URL ??= 'postgresql://longeviq:longeviq@localhost:5432/longeviq_test';
process.env.JWT_ACCESS_SECRET ??= 'test-secret-please-change-in-production';
