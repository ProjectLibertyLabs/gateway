import { Injectable, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import blockchainConfig, { IBlockchainConfig } from '#blockchain/blockchain.config';

@Injectable()
export class ReadOnlyGuard implements CanActivate {
   
  constructor(@Inject(blockchainConfig.KEY) private readonly config: IBlockchainConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const { isDeployedReadOnly } = this.config;
    if (isDeployedReadOnly) {
      // If the system is in read-only mode, disable certain routes
      const request = context.switchToHttp().getRequest();
      const { method } = request;
      const restrictedMethods = ['POST', 'PUT', 'DELETE']; // Methods that should be restricted

      // Return false if the method is in the restricted list
      if (restrictedMethods.includes(method)) {
        return false;
      }
    }
    // Allow access otherwise
    return true;
  }
}
