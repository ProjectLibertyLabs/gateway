import { Vec } from '@polkadot/types';
import { EventRecord } from '@polkadot/types/interfaces';

interface ReturnValue {
  msaId: string;
  newPublicKey: string;
  debugMsg: string;
}

export const handlePublishKeyTxResult = (txResultEvents: Vec<EventRecord>): ReturnValue => {
  let msaId;
  let newPublicKey;
  let debugMsg;

  txResultEvents.forEach((record) => {
    const { method, data, section } = record.event;
    // Grab the event data
    if (section.search('msa') !== -1 && method.search('PublicKeyAdded') !== -1) {
      msaId = data[0].toString();
      newPublicKey = data[1].toString();
      debugMsg = `Public Key: ${newPublicKey} Added for msaId: ${msaId}`;
    }
  });

  return { msaId, newPublicKey, debugMsg };
};
