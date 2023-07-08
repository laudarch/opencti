import axios from 'axios';
import ejs from 'ejs';
import * as R from 'ramda';
import { clearIntervalAsync, setIntervalAsync, SetIntervalAsyncTimer } from 'set-interval-async/fixed';
import conf, { booleanConf, getBaseUrl, logApp } from '../config/conf';
import { TYPE_LOCK_ERROR } from '../config/errors';
import { getEntitiesListFromCache, getEntityFromCache } from '../database/cache';
import { createStreamProcessor, lockResource, NOTIFICATION_STREAM_NAME, StreamProcessor } from '../database/redis';
import { sendMail, smtpIsAlive } from '../database/smtp';
import { addNotification } from '../modules/notification/notification-domain';
import type { NotificationContentEvent } from '../modules/notification/notification-types';
import { OUTCOME_CONNECTOR_EMAIL, OUTCOME_CONNECTOR_EMAIL_INTERFACE, OUTCOME_CONNECTOR_UI, OUTCOME_CONNECTOR_WEBHOOK, OUTCOME_CONNECTOR_WEBHOOK_INTERFACE, } from '../modules/outcome/outcome-statics';
import { BasicStoreEntityOutcome, ENTITY_TYPE_OUTCOME } from '../modules/outcome/outcome-types';
import { ENTITY_TYPE_SETTINGS } from '../schema/internalObject';
import type { SseEvent, StreamNotifEvent } from '../types/event';
import type { BasicStoreSettings } from '../types/settings';
import type { StixCoreObject, StixRelationshipObject } from '../types/stix-common';
import type { AuthContext } from '../types/user';
import { executionContext, SYSTEM_USER } from '../utils/access';
import { now } from '../utils/format';
import { ActivityNotificationEvent, DigestEvent, getNotifications, KnowledgeNotificationEvent, NotificationUser, } from './notificationManager';

const DOC_URI = 'https://filigran.notion.site/OpenCTI-Public-Knowledge-Base-d411e5e477734c59887dad3649f20518';
const PUBLISHER_ENGINE_KEY = conf.get('publisher_manager:lock_key');
const STREAM_SCHEDULE_TIME = 10000;

const processNotificationEvent = async (
  context: AuthContext,
  notificationId: string,
  user: NotificationUser,
  data: Array<{
    notification_id: string,
    instance: StixCoreObject | StixRelationshipObject | Partial<{ id: string }>,
    type: string,
    message: string,
  }>
) => {
  const settings = await getEntityFromCache<BasicStoreSettings>(context, SYSTEM_USER, ENTITY_TYPE_SETTINGS);
  const outcomes = await getEntitiesListFromCache<BasicStoreEntityOutcome>(context, SYSTEM_USER, ENTITY_TYPE_OUTCOME);
  const outcomeMap = new Map(outcomes.map((n) => [n.internal_id, n]));
  const notifications = await getNotifications(context);
  const notificationMap = new Map(notifications.map((n) => [n.trigger.internal_id, n.trigger]));
  const notification = notificationMap.get(notificationId);
  if (!notification) {
    return;
  }
  const { name: notification_name, trigger_type } = notification;
  const userOutcomes = user.outcomes ?? []; // No outcome is possible for live trigger only targeting digest
  for (let outcomeIndex = 0; outcomeIndex < userOutcomes.length; outcomeIndex += 1) {
    const outcome = userOutcomes[outcomeIndex];
    const { outcome_connector_id, outcome_configuration: configuration } = outcomeMap.get(outcome) ?? {};
    const generatedContent: Record<string, Array<NotificationContentEvent>> = {};
    for (let index = 0; index < data.length; index += 1) {
      const { notification_id, instance, type, message } = data[index];
      const event = { operation: type, message, instance_id: instance.id };
      const eventNotification = notificationMap.get(notification_id);
      if (eventNotification) {
        const notificationName = eventNotification.name;
        if (generatedContent[notificationName]) {
          generatedContent[notificationName] = [...generatedContent[notificationName], event];
        } else {
          generatedContent[notificationName] = [event];
        }
      }
    }
    const content = Object.entries(generatedContent).map(([k, v]) => ({ title: k, events: v }));
    // region data generation
    const background_color = (settings.platform_theme_dark_background ?? '#0a1929').substring(1);
    const platformOpts = { doc_uri: DOC_URI, platform_uri: getBaseUrl(), background_color };
    const templateData = { content, notification, settings, user, data, ...platformOpts };
    // endregion
    if (outcome_connector_id === OUTCOME_CONNECTOR_UI) {
      const createNotification = {
        name: notification_name,
        notification_type: trigger_type,
        user_id: user.user_id,
        content,
        created: now(),
        created_at: now(),
        updated_at: now(),
        is_read: false
      };
      addNotification(context, SYSTEM_USER, createNotification).catch((err) => {
        logApp.error('[OPENCTI-PUBLISHER] Error user interface publication', { error: err });
      });
    } else if (outcome_connector_id === OUTCOME_CONNECTOR_EMAIL) {
      const { title, template } = JSON.parse(configuration ?? '{}') as OUTCOME_CONNECTOR_EMAIL_INTERFACE;
      const generatedTitle = ejs.render(title, templateData);
      const generatedEmail = ejs.render(template, templateData);
      const mail = { from: settings.platform_email, to: user.user_email, subject: generatedTitle, html: generatedEmail };
      sendMail(mail).catch((err) => {
        logApp.error('[OPENCTI-PUBLISHER] Error email publication', { error: err });
      });
      // TODO get the outcome connector id from the outcome definition
    } else if (outcome_connector_id === OUTCOME_CONNECTOR_WEBHOOK) {
      const { url, template, verb, params, headers } = JSON.parse(configuration ?? '{}') as OUTCOME_CONNECTOR_WEBHOOK_INTERFACE;
      const generatedWebhook = ejs.render(template, templateData);
      const dataJson = JSON.parse(generatedWebhook);
      const dataHeaders = R.fromPairs((headers ?? []).map((h) => [h.attribute, h.value]));
      const dataParameters = R.fromPairs((params ?? []).map((h) => [h.attribute, h.value]));
      axios({ url, method: verb, params: dataParameters, headers: dataHeaders, data: dataJson }).catch((err) => {
        logApp.error('[OPENCTI-PUBLISHER] Error webhook publication', { error: err });
      });
    } else {
      // Push the event to the external connector
      // TODO
    }
  }
};

const processLiveNotificationEvent = async (context: AuthContext, event: KnowledgeNotificationEvent | ActivityNotificationEvent) => {
  const { targets, data: instance } = event;
  for (let index = 0; index < targets.length; index += 1) {
    const { user, type, message } = targets[index];
    const data = [{ notification_id: event.notification_id, instance, type, message }];
    await processNotificationEvent(context, event.notification_id, user, data);
  }
};

const processDigestNotificationEvent = async (context: AuthContext, event: DigestEvent) => {
  const { target: user, data } = event;
  await processNotificationEvent(context, event.notification_id, user, data);
};

const publisherStreamHandler = async (streamEvents: Array<SseEvent<StreamNotifEvent>>) => {
  try {
    const context = executionContext('publisher_manager');
    const notifications = await getNotifications(context);
    const notificationMap = new Map(notifications.map((n) => [n.trigger.internal_id, n.trigger]));
    for (let index = 0; index < streamEvents.length; index += 1) {
      const streamEvent = streamEvents[index];
      const { data: { notification_id } } = streamEvent;
      const notification = notificationMap.get(notification_id);
      if (notification) {
        if (notification.trigger_type === 'live') {
          const liveEvent = streamEvent as SseEvent<KnowledgeNotificationEvent>;
          await processLiveNotificationEvent(context, liveEvent.data);
        }
        if (notification.trigger_type === 'digest') {
          const digestEvent = streamEvent as SseEvent<DigestEvent>;
          await processDigestNotificationEvent(context, digestEvent.data);
        }
      }
    }
  } catch (e) {
    logApp.error('[OPENCTI-PUBLISHER] Error executing publisher manager', { error: e });
  }
};

const initPublisherManager = () => {
  const WAIT_TIME_ACTION = 2000;
  let streamScheduler: SetIntervalAsyncTimer<[]>;
  let streamProcessor: StreamProcessor;
  let running = false;
  let shutdown = false;
  let isSmtpActive = false;
  const wait = (ms: number) => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  };
  const notificationHandler = async () => {
    let lock;
    try {
      // Lock the manager
      lock = await lockResource([PUBLISHER_ENGINE_KEY], { retryCount: 0 });
      running = true;
      logApp.info('[OPENCTI-PUBLISHER] Running publisher manager');
      const opts = { withInternal: false, streamName: NOTIFICATION_STREAM_NAME };
      streamProcessor = createStreamProcessor(SYSTEM_USER, 'Publisher manager', publisherStreamHandler, opts);
      await streamProcessor.start('live');
      while (!shutdown && streamProcessor.running()) {
        await wait(WAIT_TIME_ACTION);
      }
      logApp.info('[OPENCTI-MODULE] End of publisher manager processing');
    } catch (e: any) {
      if (e.name === TYPE_LOCK_ERROR) {
        logApp.debug('[OPENCTI-PUBLISHER] Publisher manager already started by another API');
      } else {
        logApp.error('[OPENCTI-PUBLISHER] Publisher manager failed to start', { error: e });
      }
    } finally {
      if (streamProcessor) await streamProcessor.shutdown();
      if (lock) await lock.unlock();
    }
  };
  return {
    start: async () => {
      isSmtpActive = await smtpIsAlive();
      streamScheduler = setIntervalAsync(async () => {
        await notificationHandler();
      }, STREAM_SCHEDULE_TIME);
    },
    status: () => {
      return {
        id: 'PUBLISHER_MANAGER',
        enable: booleanConf('publisher_manager:enabled', false),
        is_smtp_active: isSmtpActive,
        running,
      };
    },
    shutdown: async () => {
      logApp.info('[OPENCTI-MODULE] Stopping publisher manager');
      shutdown = true;
      if (streamScheduler) await clearIntervalAsync(streamScheduler);
      return true;
    },
  };
};
const publisherManager = initPublisherManager();

export default publisherManager;
