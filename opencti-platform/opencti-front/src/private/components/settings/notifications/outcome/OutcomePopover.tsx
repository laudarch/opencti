import React, { useState } from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import MoreVert from '@mui/icons-material/MoreVert';
import makeStyles from '@mui/styles/makeStyles';
import { graphql, useMutation, useQueryLoader } from 'react-relay';
import { useFormatter } from '../../../../../components/i18n';
import { Theme } from '../../../../../components/Theme';
import Transition from '../../../../../components/Transition';
import { deleteNode } from '../../../../../utils/store';
import { OutcomeLine_node$data } from './__generated__/OutcomeLine_node.graphql';
import { OutcomeLinesPaginationQuery$variables } from './__generated__/OutcomeLinesPaginationQuery.graphql';
import OutcomeEdition, { outcomeEditionQuery } from './OutcomeEdition';
import Loader, { LoaderVariant } from '../../../../../components/Loader';
import { OutcomeEditionQuery } from './__generated__/OutcomeEditionQuery.graphql';

const useStyles = makeStyles<Theme>((theme) => ({
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
}));

export const outcomePopoverDeletionMutation = graphql`
  mutation OutcomePopoverDeletionMutation($id: ID!) {
    outcomeDelete(id: $id)
  }
`;

const OutcomePopover = ({ data, paginationOptions }: { data: OutcomeLine_node$data, paginationOptions?: OutcomeLinesPaginationQuery$variables }) => {
  const { t } = useFormatter();
  const classes = useStyles();
  const [queryRef, loadQuery] = useQueryLoader<OutcomeEditionQuery>(outcomeEditionQuery);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [displayDelete, setDisplayDelete] = useState<boolean>(false);
  const [displayEdit, setDisplayEdit] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [commit] = useMutation(outcomePopoverDeletionMutation);
  //  popover
  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => setAnchorEl(null);
  // delete
  const handleOpenDelete = () => {
    setDisplayDelete(true);
    handleClose();
  };
  const handleCloseDelete = () => setDisplayDelete(false);
  const submitDelete = () => {
    setDeleting(true);
    commit({
      variables: {
        id: data.id,
      },
      updater: (store) => {
        deleteNode(store, 'Pagination_outcomes', paginationOptions, data.id);
      },
      onCompleted: () => {
        setDeleting(false);
        handleCloseDelete();
      },
    });
  };
  // edition
  const handleDisplayEdit = () => {
    loadQuery({ id: data.id }, { fetchPolicy: 'store-and-network' });
    setDisplayEdit(true);
    handleClose();
  };
  // Loader
  return (
    <div className={classes.container}>
      <IconButton
        onClick={handleOpen}
        aria-haspopup="true"
        style={{ marginTop: 3 }}
        size="large">
        <MoreVert />
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem onClick={handleDisplayEdit}>{t('Update')}</MenuItem>
        <MenuItem onClick={handleOpenDelete}>{t('Delete')}</MenuItem>
      </Menu>
      <Dialog
        open={displayDelete}
        keepMounted={true}
        TransitionComponent={Transition}
        PaperProps={{ elevation: 1 }}
        onClose={handleCloseDelete}>
        <DialogContent>
          <DialogContentText>
            {t('Do you want to delete this outcome?')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete} disabled={deleting}>
            {t('Cancel')}
          </Button>
          <Button color="secondary" onClick={submitDelete} disabled={deleting}>
            {t('Delete')}
          </Button>
        </DialogActions>
      </Dialog>
      {displayEdit && (
        <Drawer
          open={true}
          anchor="right"
          elevation={1}
          sx={{ zIndex: 1202 }}
          classes={{ paper: classes.drawerPaper }}
          onClose={() => setDisplayEdit(false)}
        >
          {queryRef && (
            <React.Suspense fallback={<Loader variant={LoaderVariant.inElement} />}>
              <OutcomeEdition queryRef={queryRef} onClose={() => setDisplayEdit(false)} />
            </React.Suspense>
          )}
        </Drawer>
      )}
    </div>
  );
};

export default OutcomePopover;
