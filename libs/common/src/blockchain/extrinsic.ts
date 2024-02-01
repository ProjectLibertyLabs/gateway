/**
 * These helpers return a map of events, some of which contain useful data, some of which don't.
 * Extrinsics that "create" records typically contain an ID of the entity they created, and this
 * would be a useful value to return. However, this data seems to be nested inside an array of arrays.
 *
 * Ex: schemaId = events["schemas.SchemaCreated"][<arbitrary_index>]
 *
 * To get the value associated with an event key, we would need to query inside that nested array with
 * a set of arbitrary indices. Should an object at any level of that querying be undefined, the helper
 * will throw an unchecked exception.
 *
 * To get type checking and cast a returned event as a specific event type, you can utilize TypeScripts
 * type guard functionality like so:
 *
 *      const msaCreatedEvent = events.defaultEvent;
 *      if (this.api.events.msa.MsaCreated.is(msaCreatedEvent)) {
 *          msaId = msaCreatedEvent.data.msaId;
 *      }
 *
 * Normally, I'd say the best experience is for the helper to return both the ID of the created entity
 * along with a map of emitted events. But in this case, returning that value will increase the complexity
 * of each helper, since each would have to check for undefined values at every lookup. So, this may be
 * a rare case when it is best to simply return the map of emitted events and trust the user to look them
 * up in the test.
 */

import { ApiRx } from '@polkadot/api';
import { SubmittableExtrinsic, ApiTypes, AugmentedEvent } from '@polkadot/api/types';
import { Call, Event, EventRecord, Hash } from '@polkadot/types/interfaces';
import { IsEvent } from '@polkadot/types/metadata/decorate/types';
import { Codec, ISubmittableResult, AnyTuple } from '@polkadot/types/types';
import { filter, firstValueFrom, map, pipe, tap } from 'rxjs';
import { KeyringPair } from '@polkadot/keyring/types';
import { EventError } from './event-error';

export type EventMap = { [key: string]: Event };

function eventKey(event: Event): string {
  return `${event.section}.${event.method}`;
}

export type ParsedEventResult = [any, EventMap];

export class Extrinsic<T extends ISubmittableResult = ISubmittableResult, C extends Codec[] = Codec[], N = unknown> {
  private event?: IsEvent<C, N>;

  private extrinsic: SubmittableExtrinsic<'rxjs', T>;

  // private call: Call;
  private keys: KeyringPair;

  public api: ApiRx;

  constructor(api: ApiRx, extrinsic: SubmittableExtrinsic<'rxjs', T>, keys: KeyringPair, targetEvent?: IsEvent<C, N>) {
    this.extrinsic = extrinsic;
    this.keys = keys;
    this.event = targetEvent;
    this.api = api;
  }

  public get targetEvent() {
    return this.event;
  }

  public async signAndSend(nonce?: number): Promise<[Hash, EventMap]> {
    const { status, events, txHash } = await firstValueFrom(this.extrinsic.signAndSend(this.keys, { nonce }));
    if (status.isFinalized || status.isInBlock) {
      const eventMap: EventMap = {};
      events.forEach((record: EventRecord) => {
        const { event } = record;
        eventMap[eventKey(event)] = event;
      });
      return [txHash, eventMap];
    }
    return [txHash, {}];
  }

  public getCall(): Call {
    const call = this.api.createType('Call', this.extrinsic);
    return call;
  }
}
