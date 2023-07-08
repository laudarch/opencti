import Ajv from 'ajv';
import { BUS_TOPICS } from '../../config/conf';
import { UnsupportedError } from '../../config/errors';
import { createEntity, deleteElementById, updateAttribute } from '../../database/middleware';
import { internalFindByIds, listAllEntities, listEntitiesPaginated, storeLoadById, } from '../../database/middleware-loader';
import { notify } from '../../database/redis';
import { isEmptyField } from '../../database/utils';
import type { EditInput, OutcomeAddInput, QueryOutcomesArgs } from '../../generated/graphql';
import type { AuthContext, AuthUser } from '../../types/user';
import { MEMBER_ACCESS_RIGHT_VIEW } from '../../utils/access';
import { now } from '../../utils/format';
import { BUILTIN_OUTCOMES_CONNECTORS, STATIC_OUTCOMES } from './outcome-statics';
import type { BasicStoreEntityOutcome } from './outcome-types';
import { ENTITY_TYPE_OUTCOME } from './outcome-types';

const ajv = new Ajv();

export const addOutcome = async (context: AuthContext, user: AuthUser, outcome: OutcomeAddInput): Promise<BasicStoreEntityOutcome> => {
  const outcomeConnector = BUILTIN_OUTCOMES_CONNECTORS[outcome.outcome_connector_id];
  if (isEmptyField(outcomeConnector) || isEmptyField(outcomeConnector.connector_schema)) {
    throw UnsupportedError('Invalid outcome connector', { id: outcome.outcome_connector_id });
  }
  // Connector Schema is valued, we have checked that before
  const validate = ajv.compile(JSON.parse(outcomeConnector.connector_schema ?? '{}'));
  const isValidConfiguration = validate(JSON.parse(outcome.outcome_configuration));
  if (!isValidConfiguration) {
    throw UnsupportedError('This configuration is invalid', { configuration: outcome.outcome_configuration });
  }
  const outcomeToCreate = { ...outcome, created: now(), updated: now(), authorized_authorities: ['SETTINGS'] };
  const created = await createEntity(context, user, outcomeToCreate, ENTITY_TYPE_OUTCOME);
  return notify(BUS_TOPICS[ENTITY_TYPE_OUTCOME].ADDED_TOPIC, created, user);
};

export const outcomeGet = (context: AuthContext, user: AuthUser, outcomeId: string): BasicStoreEntityOutcome => {
  return storeLoadById(context, user, outcomeId, ENTITY_TYPE_OUTCOME) as unknown as BasicStoreEntityOutcome;
};

export const outcomeEdit = async (context: AuthContext, user: AuthUser, triggerId: string, input: EditInput[]) => {
  const finalInput = input.map(({ key, value }) => {
    const item: { key: string, value: unknown } = { key, value };
    if (key === 'authorized_members') {
      item.value = value.map((id) => ({ id, access_right: MEMBER_ACCESS_RIGHT_VIEW }));
    }
    return item;
  });
  const { element: updatedElem } = await updateAttribute(context, user, triggerId, ENTITY_TYPE_OUTCOME, finalInput);
  return notify(BUS_TOPICS[ENTITY_TYPE_OUTCOME].EDIT_TOPIC, updatedElem, user);
};

export const outcomeDelete = async (context: AuthContext, user: AuthUser, triggerId: string) => {
  const element = await deleteElementById(context, user, triggerId, ENTITY_TYPE_OUTCOME);
  await notify(BUS_TOPICS[ENTITY_TYPE_OUTCOME].DELETE_TOPIC, element, user);
  return triggerId;
};

export const outcomesFind = (context: AuthContext, user: AuthUser, opts: QueryOutcomesArgs) => {
  return listEntitiesPaginated<BasicStoreEntityOutcome>(context, user, [ENTITY_TYPE_OUTCOME], { ...opts, includeAuthorities: true });
};

export const getOutcomes = async (context: AuthContext, user: AuthUser, ids: string[]) => {
  const outcomes = await internalFindByIds(context, user, ids, { type: ENTITY_TYPE_OUTCOME });
  const staticOutcomes = STATIC_OUTCOMES.filter(({ id }) => ids.includes(id));
  return [...outcomes, ...staticOutcomes] as BasicStoreEntityOutcome[];
};

export const usableOutcomes = async (context: AuthContext, user: AuthUser) => {
  const outcomes = await listAllEntities<BasicStoreEntityOutcome>(context, user, [ENTITY_TYPE_OUTCOME], { includeAuthorities: true });
  return [...outcomes, ...STATIC_OUTCOMES].sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
};
