import { IAccountApiConfig } from '#types/interfaces/account/api-config.interface';
import { IContentPublishingApiConfig } from '#types/interfaces/content-publishing/api-config.interface';
import { IContentWatcherApiConfig } from '#types/interfaces/content-watcher/api-config.interface';
import { IGraphApiConfig } from '#types/interfaces/graph/api-config.interface';

import {
  AccountQueues,
  ContentPublishingQueues,
  ContentWatcherQueues,
  GraphQueues,
} from '#types/constants/queue.constants';

export type ServiceConfigMap = {
  'account-api': IAccountApiConfig;
  'content-publishing-api': IContentPublishingApiConfig;
  'content-watcher-api': IContentWatcherApiConfig;
  'graph-api': IGraphApiConfig;
};

export type ConfigTypeName = keyof ServiceConfigMap;
export type ConfigType<T extends ConfigTypeName> = ServiceConfigMap[T];
export type AnyServiceConfig = ServiceConfigMap[ConfigTypeName];

export type QueueName =
  | AccountQueues.QueueName
  | ContentPublishingQueues.QueueName
  | ContentWatcherQueues.QueueName
  | GraphQueues.QueueName;
