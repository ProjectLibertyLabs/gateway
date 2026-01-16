import { IsIntentNameConstraint } from '#utils/decorators/is-intent-name.decorator';
import { Global, Module } from '@nestjs/common';

// Need to declare a module containing any decorators that implement an injected constraint class.

@Global()
@Module({
  providers: [IsIntentNameConstraint],
  exports: [IsIntentNameConstraint],
})
export class DecoratorsModule {}
