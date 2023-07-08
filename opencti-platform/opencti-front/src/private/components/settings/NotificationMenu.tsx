import React, { FunctionComponent } from 'react';
import NavToolbarMenu, { MenuEntry } from '../common/menus/NavToolbarMenu';

const NotificationMenu: FunctionComponent = () => {
  const entries: MenuEntry[] = [
    {
      path: '/dashboard/settings/notification/outcome',
      label: 'Outcomes',
    },
    {
      path: '/dashboard/settings/notification/trigger',
      label: 'Triggers',
    },
  ];

  return <NavToolbarMenu entries={entries} />;
};

export default NotificationMenu;
