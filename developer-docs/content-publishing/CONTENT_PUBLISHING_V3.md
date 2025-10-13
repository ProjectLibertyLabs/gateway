# Batch File Publishing Flow

Illustrates the flow of batch file publishing from the content-publisher API at `v3/content/batchAnnouncement`, to
pinning on IPFS, to announcing on the Frequency blockchain.
[SVG Version](./content-publishing-v3.svg) of this diagram

```mermaid
sequenceDiagram
    participant Client
    participant Controller as ContentControllerV3
    participant API as ApiService
    participant IPFS as IpfsService
    participant Cache as Redis
    participant BQueue as BatchQueue
    participant BatchSvc as BatchAnnouncementService
    participant Announcer as BatchAnnouncer
    participant PQueue as PublishQueue
    participant PublishSvc as PublishingService
    participant MsgPub as MessagePublisher
    participant Blockchain as BlockchainService
    participant Chain as Frequency Chain
    Client ->> Controller: POST v3/content/batchAnnouncement<br/>(multipart/form-data files + schemaIds)
    activate Controller
    Controller ->> Controller: Parse multipart data with Busboy
    Controller ->> Controller: Validate files and schemaIds match

    loop For each file
        Controller ->> API: uploadStreamedAsset(fileStream, filename, mimeType)
        activate API
        API ->> IPFS: ipfsPinStream(uploadPassThru)
        activate IPFS
        IPFS ->> IPFS: Pin file to IPFS network
        IPFS -->> API: {cid, hash, size}
        deactivate IPFS
        API ->> Cache: setex(assetMetadata, metadata)
        activate Cache
        Cache -->> API: OK
        deactivate Cache
        API -->> Controller: {cid} or {error}
        deactivate API
    end

    loop For each successful upload
        Controller ->> API: enqueueBatchRequest({cid, schemaId})
        activate API
        API ->> BQueue: add(BatchJob, {cid, schemaId})
        activate BQueue
        BQueue -->> API: job queued
        deactivate BQueue
        API -->> Controller: {referenceId}
        deactivate API
    end

    Controller -->> Client: BatchAnnouncementResponseDto<br/>{files: [{cid, referenceId} | {error}]}
    deactivate Controller
    Note over BQueue, BatchSvc: Background Processing
    BQueue ->> BatchSvc: process(BatchJob)
    activate BatchSvc
    BatchSvc ->> Announcer: announceExistingBatch({cid, schemaId})
    activate Announcer
    Announcer ->> IPFS: existsInLocalGateway(cid)
    IPFS -->> Announcer: exists status
    Announcer ->> IPFS: getInfoFromLocalNode(cid)
    IPFS -->> Announcer: {cid, size}
    Announcer -->> BatchSvc: IPublisherJob{id, schemaId, data: {cid, payloadLength}}
    deactivate Announcer
    BatchSvc ->> PQueue: add(PublisherJob)
    activate PQueue
    PQueue -->> BatchSvc: job queued
    deactivate PQueue
    BatchSvc -->> BQueue: completed
    deactivate BatchSvc
    Note over PQueue, PublishSvc: Blockchain Publishing
    PQueue ->> PublishSvc: process(IPublisherJob)
    activate PublishSvc
    PublishSvc ->> MsgPub: publish(jobData)
    activate MsgPub
    MsgPub ->> MsgPub: Add to message batch queue
    MsgPub ->> MsgPub: Wait for batch window or max batch size
    MsgPub ->> Blockchain: generateAddIpfsMessage(schemaId, cid, payloadLength)
    activate Blockchain
    Blockchain -->> MsgPub: transaction call
    deactivate Blockchain
    MsgPub ->> Blockchain: createType('Vec<Call>', transactions)
    activate Blockchain
    Blockchain -->> MsgPub: callVec
    deactivate Blockchain
    MsgPub ->> Blockchain: payWithCapacityBatchAll(callVec)
    activate Blockchain
    Blockchain ->> Chain: Submit batch transaction
    activate Chain
    Chain -->> Blockchain: transaction hash & block info
    deactivate Chain
    Blockchain -->> MsgPub: [tx, txHash, currentBlockNumber]
    deactivate Blockchain
    MsgPub -->> PublishSvc: [tx, txHash, currentBlockNumber]
    deactivate MsgPub
    PublishSvc ->> Cache: hset(TXN_WATCH_LIST_KEY, {txHash: status})
    activate Cache
    Cache -->> PublishSvc: OK
    deactivate Cache
    PublishSvc -->> PQueue: completed
    deactivate PublishSvc
    Note right of Chain: Files are now published:<br/>- Content stored in IPFS<br/>- CID announced on Frequency chain<br/>- Transaction monitored for finality
```
