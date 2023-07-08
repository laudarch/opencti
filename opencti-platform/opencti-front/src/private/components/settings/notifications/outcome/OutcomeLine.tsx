import Chip from '@mui/material/Chip';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import makeStyles from '@mui/styles/makeStyles';
import React, { FunctionComponent } from 'react';
import { graphql, useFragment } from 'react-relay';
import ItemIcon from '../../../../../components/ItemIcon';
import { DataColumns } from '../../../../../components/list_lines';
import { Theme } from '../../../../../components/Theme';
import { OutcomeLine_node$key } from './__generated__/OutcomeLine_node.graphql';
import { OutcomeLinesPaginationQuery$variables } from './__generated__/OutcomeLinesPaginationQuery.graphql';
import OutcomePopover from './OutcomePopover';

const useStyles = makeStyles<Theme>((theme) => ({
  item: {
    paddingLeft: 10,
    height: 50,
  },
  itemIcon: {
    color: theme.palette.primary.main,
  },
  bodyItem: {
    height: 20,
    fontSize: 13,
    float: 'left',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    paddingRight: 5,
  },
  goIcon: {
    position: 'absolute',
    right: -10,
  },
  itemIconDisabled: {
    color: theme.palette.grey?.[700],
  },
  placeholder: {
    display: 'inline-block',
    height: '1em',
    backgroundColor: theme.palette.grey?.[700],
  },
  drawerPaper: {
    minHeight: '100vh',
    width: '50%',
    position: 'fixed',
    overflow: 'auto',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    padding: 0,
  },
  chipInList: {
    fontSize: 12,
    height: 20,
    float: 'left',
    width: 120,
  },
}));

interface OutcomeLineProps {
  node: OutcomeLine_node$key;
  dataColumns: DataColumns;
  paginationOptions: OutcomeLinesPaginationQuery$variables
}

const OutcomeLineFragment = graphql`
  fragment OutcomeLine_node on Outcome {
    id
    entity_type
    name
    description
    outcome_connector {
      name
    }
  }
`;

export const OutcomeLine: FunctionComponent<OutcomeLineProps> = ({
  dataColumns,
  node,
  paginationOptions,
}) => {
  const classes = useStyles();
  const data = useFragment(OutcomeLineFragment, node);
  return (
    <>
      <ListItem classes={{ root: classes.item }} divider={true} button={true}>
        <ListItemIcon classes={{ root: classes.itemIcon }}>
          <ItemIcon type={'Report'} />
        </ListItemIcon>
        <ListItemText
          primary={
            <div>
              <div className={classes.bodyItem} style={{ width: dataColumns.connector.width }}>
                <Chip
                  classes={{ root: classes.chipInList }}
                  color="primary"
                  variant="outlined"
                  label={data.outcome_connector.name}
                />
              </div>
              <div className={classes.bodyItem} style={{ width: dataColumns.name.width }}>
                {data.name}
              </div>
              <div className={classes.bodyItem} style={{ width: dataColumns.description.width }}>
                {data.description}
              </div>
            </div>
          }
        />
        <ListItemIcon classes={{ root: classes.goIcon }}>
          <OutcomePopover data={data} paginationOptions={paginationOptions} />
        </ListItemIcon>
      </ListItem>
    </>
  );
};

export const OutcomeLineDummy = ({ dataColumns }: { dataColumns: DataColumns; }) => {
  const classes = useStyles();
  return (
    <ListItem classes={{ root: classes.item }} divider={true}>
      <ListItemIcon classes={{ root: classes.itemIconDisabled }}>
        <Skeleton animation="wave" variant="circular" width={30} height={30} />
      </ListItemIcon>
      <ListItemText
        primary={
          <div>
            <div className={classes.bodyItem} style={{ width: dataColumns.connector.width }}>
              <Skeleton
                animation="wave"
                variant="rectangular"
                width="90%"
                height="100%"
              />
            </div>
            <div className={classes.bodyItem} style={{ width: dataColumns.name.width }}>
              <Skeleton
                animation="wave"
                variant="rectangular"
                width="90%"
                height="100%"
              />
            </div>
            <div className={classes.bodyItem} style={{ width: dataColumns.description.width }}>
              <Skeleton
                animation="wave"
                variant="rectangular"
                width="90%"
                height="100%"
              />
            </div>
          </div>
        }
      />
    </ListItem>
  );
};
