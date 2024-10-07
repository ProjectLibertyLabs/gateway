import { validate } from 'class-validator';
import { IsSchemaName } from './is-schema-name.decorator';
import { SCHEMA_NAME_TO_ID } from '#types/constants/schemas';

class TestClass {
  @IsSchemaName()
  schemaName: string;
}

describe('IsSchemaName', () => {
  it('should pass for valid schema names', async () => {
    const testObj = new TestClass();
    testObj.schemaName = 'dsnp.broadcast@v2';

    const errors = await validate(testObj);
    expect(errors.length).toBe(0);
  });

  it('should fail for invalid schema names', async () => {
    const testObj = new TestClass();
    testObj.schemaName = 'invalid.schema@v1';

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('IsSchemaName');
    expect(errors[0].constraints.IsSchemaName).toBe(
      'schemaName value "invalid.schema@v1" is not a known valid permission.',
    );
  });

  it('should fail for empty string', async () => {
    const testObj = new TestClass();
    testObj.schemaName = '';

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('IsSchemaName');
  });

  it('should fail for null', async () => {
    const testObj = new TestClass();
    testObj.schemaName = null;

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('IsSchemaName');
  });

  it('should fail for undefined', async () => {
    const testObj = new TestClass();
    testObj.schemaName = undefined;

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('IsSchemaName');
  });

  it('should pass for all known schema names', async () => {
    await Promise.all(
      [...SCHEMA_NAME_TO_ID.keys()].map(async (schemaName) => {
        const testObj = new TestClass();
        testObj.schemaName = schemaName;

        const errors = await validate(testObj);
        expect(errors.length).toBe(0);
      }),
    );
  });
});
