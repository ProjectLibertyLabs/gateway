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
  describe('with min/max validation options', () => {
    it.each([
      { value: 50, description: 'valid number within range' },
      { value: 0, description: 'valid number at min boundary' },
      { value: 100, description: 'valid number at max boundary' },
      { value: '50', description: 'valid string number within range' },
    ])('accepts $description', async ({ value }) => {
      const dto = new TestDto();
      (dto.value as any) = value;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it.each([
      { value: 'Hello', description: 'non-numeric string', expectedMessage: 'should be a number' },
      { value: -5, description: 'value below minimum' },
      { value: '-5', description: 'negative number as string' },
      { value: 150, description: 'value above maximum' },
      { value: null, description: 'null value' },
      { value: undefined, description: 'undefined value' },
      { value: { foo: 'bar' }, description: 'object value' },
      { value: [1, 2, 3], description: 'array value' },
      { value: '50.5', description: 'decimal number string' },
      { value: '999999999999999999', description: 'large BigInt-compatible number as string (exceeds maxValue)' },
    ])('rejects $description', async ({ value, expectedMessage }) => {
      const dto = new TestDto();
      (dto.value as any) = value;
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].property).toBe('value');
      if (expectedMessage) {
        expect(errors[0].constraints?.IsIntValue).toContain(expectedMessage);
      }
    });
  });

  describe('without validation options', () => {
    it.each([
      { value: 999999, description: 'any valid integer when no min/max specified' },
      { value: -999, description: 'negative numbers when no min specified' },
    ])('accepts $description', async ({ value }) => {
      const dto = new TestDtoNoOptions();
      dto.value = value;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('rejects non-numeric string when no min/max specified', async () => {
      const dto = new TestDtoNoOptions();
      (dto.value as any) = 'Hello';
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].property).toBe('value');
    });
  });
});
