import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PubSubService } from './pubsub.service';
import { BroadcastSubscriber } from './announcers/broadcast';
import { ProfileSubscriber } from './announcers/profile';
import { ReactionSubscriber } from './announcers/reaction';
import { ReplySubscriber } from './announcers/reply';
import { TomstoneSubscriber } from './announcers/tombstone';
import { UpdateSubscriber } from './announcers/update';

@Module({
  imports: [ScheduleModule],
  providers: [
    PubSubService,
    BroadcastSubscriber,
    ProfileSubscriber,
    ReactionSubscriber,
    ReplySubscriber,
    TomstoneSubscriber,
    UpdateSubscriber,
  ],
  controllers: [],
  exports: [PubSubService],
})
export class PubSubModule {}
