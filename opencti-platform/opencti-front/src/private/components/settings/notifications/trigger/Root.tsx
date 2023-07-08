import makeStyles from '@mui/styles/makeStyles';
import React from 'react';
import { Theme } from '../../../../../components/Theme';
import NotificationMenu from '../../NotificationMenu';

const useStyles = makeStyles<Theme>(() => ({
  container: {
    margin: 0,
    padding: '0 200px 0 0',
  },
}));

const NotificationRoot = () => {
  const classes = useStyles();
  return <div className={classes.container}>
    <NotificationMenu />
    <div>Platform triggers will be available soon</div>
  </div>;
};

export default NotificationRoot;
