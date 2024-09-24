import { IBlockchainConfig } from '#graph-lib/blockchain/blockchain.config';
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class ReadOnlyDeploymentGuard implements CanActivate {
  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(private config: IBlockchainConfig) {}

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
