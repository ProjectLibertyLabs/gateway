import { Vec } from '@polkadot/types';
import { EventRecord } from '@polkadot/types/interfaces';

interface ReturnValue {
  msaId: string;
  handle: string;
  debugMsg: string;
}

export const handlePublishHandleTxResult = (txResultEvents: Vec<EventRecord>): ReturnValue => {
  let msaId;
  let handle;
  let debugMsg;

  txResultEvents.forEach((record) => {
    const { method, data, section } = record.event;
    // Grab the handle and msa id from the event data
    if (section.search('handles') !== -1 && method.search('HandleClaimed') !== -1) {
      msaId = data[0].toString();
      // Remove the 0x prefix from the handle
      const handleData = data[1].toString().slice(2);
      // Convert the hex handle to a utf-8 string
      handle = Buffer.from(handleData.toString(), 'hex').toString('utf-8');
      debugMsg = `Handle created: ${handle} for msaId: ${msaId}`;
    }
  });

  return { msaId, handle, debugMsg };
};
