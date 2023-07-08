/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO Remove this when V6
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import React from 'react';
import { Switch } from 'react-router-dom';
import { BoundaryRoute } from '../../Error';
import Outcome from './outcome/Outcome';
import Trigger from './trigger/Root';

const RootNotification = () => {
  return (
    <Switch>
      <BoundaryRoute exact path="/dashboard/settings/notification/outcome" render={() => <Outcome />} />
      <BoundaryRoute exact path="/dashboard/settings/notification/trigger" render={() => <Trigger />} />
    </Switch>
  );
};

export default RootNotification;
