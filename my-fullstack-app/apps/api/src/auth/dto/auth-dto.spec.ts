import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';
import { RegisterDto } from './register.dto';

describe('auth DTO validation', () => {
  it('accepts valid registration input', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'renbo@example.com',
      name: 'Renbo',
      password: 'valid-password',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects malformed login input', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'not-an-email',
      password: '',
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('rejects short registration passwords', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'renbo@example.com',
      name: 'Renbo',
      password: 'short',
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
