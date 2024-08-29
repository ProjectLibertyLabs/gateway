import { DispatchError } from '@polkadot/types/interfaces';
import { SpRuntimeDispatchError } from '@polkadot/types/lookup';

export class EventError extends Error {
  name: string = '';

  message: string = '';

  stack?: string = '';

  section?: string = '';

  rawError: DispatchError | SpRuntimeDispatchError;

  constructor(source: DispatchError | SpRuntimeDispatchError) {
    super();

    if (source.isModule) {
      const decoded = source.registry.findMetaError(source.asModule);
      this.name = decoded.name;
      this.message = decoded.docs.join(' ');
      this.section = decoded.section;
    } else {
      this.name = source.type;
      this.message = source.type;
      this.section = '';
    }
    this.rawError = source;
  }

  public toString() {
    return `${this.section}.${this.name}: ${this.message}`;
  }
}
