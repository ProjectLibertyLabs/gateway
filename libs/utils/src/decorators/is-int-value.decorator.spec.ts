// eslint-disable-next-line max-classes-per-file
import { validate } from 'class-validator';
import { IsIntValue } from './is-int-value.decorator';

class TestDto {
  @IsIntValue({ minValue: 0, maxValue: 100 })
  value: number;
}

class TestDtoNoOptions {
  @IsIntValue()
  value: number;
}

describe('IsIntValue Decorator', () => {
  describe('with valid values', () => {
    it('should accept valid number within range', async () => {
      const dto = new TestDto();
      dto.value = 50;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept valid number at min boundary', async () => {
      const dto = new TestDto();
      dto.value = 0;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept valid number at max boundary', async () => {
      const dto = new TestDto();
      dto.value = 100;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept valid string number within range', async () => {
      const dto = new TestDto();
      (dto.value as any) = '50';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept large BigInt-compatible number as string', async () => {
      const dto = new TestDto();
      (dto.value as any) = '999999999999999999';
      const errors = await validate(dto);
      expect(errors.length).toBe(1); // Should fail because it's > maxValue
      expect(errors[0].property).toBe('value');
    });
  });

  describe('with invalid values', () => {
    it('should reject non-numeric string', async () => {
      const dto = new TestDto();
      (dto.value as any) = 'Hello';
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].property).toBe('value');
      expect(errors[0].constraints?.IsIntValue).toContain('should be a number');
    });

    it('should reject value below minimum', async () => {
      const dto = new TestDto();
      dto.value = -5;
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].property).toBe('value');
    });

    it('should reject negative number as string', async () => {
      const dto = new TestDto();
      (dto.value as any) = '-5';
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].property).toBe('value');
    });

    it('should reject value above maximum', async () => {
      const dto = new TestDto();
      dto.value = 150;
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].property).toBe('value');
    });

    it('should reject null value', async () => {
      const dto = new TestDto();
      (dto.value as any) = null;
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].property).toBe('value');
    });

    it('should reject undefined value', async () => {
      const dto = new TestDto();
      (dto.value as any) = undefined;
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].property).toBe('value');
    });

    it('should reject object value', async () => {
      const dto = new TestDto();
      (dto.value as any) = { foo: 'bar' };
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].property).toBe('value');
    });

    it('should reject array value', async () => {
      const dto = new TestDto();
      (dto.value as any) = [1, 2, 3];
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].property).toBe('value');
    });

    it('should reject decimal number string', async () => {
      const dto = new TestDto();
      (dto.value as any) = '50.5';
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].property).toBe('value');
    });
  });

  describe('without validation options', () => {
    it('should accept any valid integer when no min/max specified', async () => {
      const dto = new TestDtoNoOptions();
      dto.value = 999999;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept negative numbers when no min specified', async () => {
      const dto = new TestDtoNoOptions();
      dto.value = -999;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should still reject non-numeric string when no min/max specified', async () => {
      const dto = new TestDtoNoOptions();
      (dto.value as any) = 'Hello';
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].property).toBe('value');
    });
  });
});
