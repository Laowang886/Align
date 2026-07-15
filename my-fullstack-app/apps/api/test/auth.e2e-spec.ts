// apps/api/test/auth.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => { //test suite for authentication endpoints
  let app: INestApplication;
  let prisma: PrismaService;

  //use a unique email for each test run to avoid conflicts with existing users
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'testpassword123';

  // setup the NestJS application and Prisma service before running tests
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    // Create a Nest application instance
    app = moduleFixture.createNestApplication();
    // Match the production bootstrap so JwtStrategy can read request.cookies.
    app.use(cookieParser());
    // Get the PrismaService instance from the application context
    prisma = moduleFixture.get(PrismaService);
    app.use(cookieParser());
    await app.init();
  });

  // cleanup after all tests have run
  afterAll(async () => {
    // test cleanup: delete the test user from the database
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  let cookie: string;

  //register a new user and check that the response includes a Set-Cookie header and the user object without the passwordHash
  it('POST /auth/register → 201 + Set-Cookie', async () => {
    const response = await request(app.getHttpServer()) //Start a mock request
      //Send a POST request to the /auth/register endpoint
      .post('/auth/register')
      .send({ name: 'Test User', email: testEmail, password: testPassword })
      .expect(201);

    //verify that the response includes a Set-Cookie header and the user object without the passwordHash
    expect(response.headers['set-cookie']).toBeDefined();
    //verify that the response body includes the user object with the correct email and without the passwordHash
    expect(response.body.user.email).toBe(testEmail);
    expect(response.body.user.passwordHash).toBeUndefined();   // make sure passwordHash is not returned in the response
  });

  //login with the registered user and check that the response includes a Set-Cookie header
  it('POST /auth/login → 201 + Set-Cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(201);

    //verify that the response includes a Set-Cookie header and save the cookie for subsequent requests
    expect(response.headers['set-cookie']).toBeDefined();
    cookie = response.headers['set-cookie'][0].split(';')[0];
  });

  it('GET /auth/me with cookie → 200', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body.email).toBe(testEmail);
  });

  it('POST /auth/logout → 204 + cleared cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookie)
      .expect(204);

    // check that the cookie is cleared (Set-Cookie header should be present with an expired date)
    expect(response.headers['set-cookie']).toBeDefined();
    // Simulate the browser replacing its stored token cookie with the cleared value.
    cookie = response.headers['set-cookie'][0].split(';')[0];
  });

  it('GET /auth/me after logout → 401', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookie)
      .expect(401);
  });
});
