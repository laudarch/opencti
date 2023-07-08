import { Close } from '@mui/icons-material';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import makeStyles from '@mui/styles/makeStyles';
import CoreForm from '@rjsf/core';
import JsonForm from '@rjsf/mui';
import type { RJSFSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { Field, Form, Formik } from 'formik';
import { FormikHelpers } from 'formik/dist/types';
import React, { createRef, FunctionComponent } from 'react';
import { graphql, PreloadedQuery, useFragment, useMutation, usePreloadedQuery } from 'react-relay';
import * as Yup from 'yup';
import { useFormatter } from '../../../../../components/i18n';
import TextField from '../../../../../components/TextField';
import { Theme } from '../../../../../components/Theme';
import { fieldSpacingContainerStyle } from '../../../../../utils/field';
import ObjectMembersField from '../../../common/form/ObjectMembersField';
import OutcomeConnectorField from '../../../common/form/OutcomeConnectorField';
import { Option } from '../../../common/form/ReferenceField';
import { OutcomeEdition_edition$key } from './__generated__/OutcomeEdition_edition.graphql';
import { OutcomeEditionQuery } from './__generated__/OutcomeEditionQuery.graphql';
import { uiSchema } from './OutcomeUtils';

const useStyles = makeStyles<Theme>((theme) => ({
  buttons: {
    marginTop: 20,
    textAlign: 'right',
  },
  button: {
    marginLeft: theme.spacing(2),
  },
  header: {
    backgroundColor: theme.palette.background.nav,
    padding: '20px 20px 20px 60px',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    left: 5,
    color: 'inherit',
  },
  container: {
    padding: '10px 20px 20px 20px',
  },
}));

const outcomeMutationFieldPatch = graphql`
  mutation OutcomeEditionFieldPatchMutation($id: ID!, $input: [EditInput!]!) {
    outcomeFieldPatch(id: $id, input: $input) {
      ...OutcomeLine_node
      ...OutcomeEdition_edition
    }
  }
`;

const outcomeEditionFragment = graphql`
  fragment OutcomeEdition_edition on Outcome {
    id
    name
    description
    outcome_connector {
      id
      name
      connector_schema
      connector_schema_ui
    }
    outcome_connector_id
    outcome_configuration
    authorized_members {
      id
      name
      access_right
    }
  }
`;

export const outcomeEditionQuery = graphql`
  query OutcomeEditionQuery($id: String!) {
    outcome(id: $id) {
      ...OutcomeEdition_edition
    }
  }
`;

const outcomeValidation = (t: (n: string) => string) => Yup.object().shape({
  name: Yup.string().required(t('This field is required')),
  description: Yup.string().nullable(),
});

interface OutcomeEditionComponentProps {
  queryRef: PreloadedQuery<OutcomeEditionQuery>
  onClose: () => void
}

interface OutcomeEditionValues {
  name: string
  description?: string | null
  authorized_members?: Option[]
  outcome_connector_id?: Option
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormRef = React.RefObject<CoreForm<any, RJSFSchema, any>>['current'];

const OutcomeEdition: FunctionComponent<OutcomeEditionComponentProps> = ({
  queryRef,
  onClose,
}) => {
  const { t } = useFormatter();
  const classes = useStyles();
  const formRef = createRef<CoreForm>();
  const { outcome } = usePreloadedQuery<OutcomeEditionQuery>(outcomeEditionQuery, queryRef);
  const data = useFragment<OutcomeEdition_edition$key>(outcomeEditionFragment, outcome);
  const [commitFieldPatch] = useMutation(outcomeMutationFieldPatch);
  const initialValues: OutcomeEditionValues = {
    name: data?.name ?? '',
    description: data?.description,
    authorized_members: data?.authorized_members?.map(({ id, name }) => ({ value: id, label: name })) ?? [],
    outcome_connector_id: data?.outcome_connector ? { value: data.outcome_connector.id, label: data.outcome_connector.name } : undefined,
  };
  const submitForm = (setSubmitting: FormikHelpers<OutcomeEditionValues>['setSubmitting'], values: OutcomeEditionValues, current: FormRef) => {
    if (current?.validateForm()) {
      setSubmitting(true);
      const inputs = [
        { key: 'name', value: [values.name] },
        { key: 'description', value: [values.description] },
        { key: 'authorized_members', value: values.authorized_members?.map(({ value }) => value) },
        { key: 'outcome_connector_id', value: [values.outcome_connector_id?.value] },
        { key: 'outcome_configuration', value: [JSON.stringify(current.state.formData)] },
      ];
      commitFieldPatch({ variables: { id: data?.id, input: inputs } });
      setSubmitting(false);
    }
  };
  return (
    <>
      <div className={classes.header}>
        <IconButton
          aria-label="Close"
          className={classes.closeButton}
          onClick={onClose}
          size="large" color="primary"
        >
          <Close fontSize="small" color="primary" />
        </IconButton>
        <Typography variant="h6" classes={{ root: classes.title }}>{t('Outcome edition')}</Typography>
        <div className="clearfix" />
      </div>
      <div className={classes.container}>
        <div>
          <Formik
            enableReinitialize={true}
            initialValues={initialValues}
            validationSchema={outcomeValidation(t)}
            onSubmit={() => {}}
            onClose={onClose}
          >
            {({ values, setFieldValue, setSubmitting, isSubmitting }) => (
              <Form style={{ margin: '20px 0 20px 0' }}>
                <Field
                  component={TextField}
                  variant="standard"
                  name="name"
                  label={t('Name')}
                  fullWidth={true}
                />
                <Field
                  component={TextField}
                  name="description"
                  variant="standard"
                  label={t('Description')}
                  fullWidth={true}
                  style={{ marginTop: 20 }}
                />
                <OutcomeConnectorField
                  disabled={true}
                  name="outcome_connector_id"
                  style={{ marginTop: 20 }}
                />
                <ObjectMembersField
                  label={'Accessible for'}
                  style={fieldSpacingContainerStyle}
                  onChange={setFieldValue}
                  multiple={true}
                  name="authorized_members"
                />
                <JsonForm
                  uiSchema={{
                    ...JSON.parse(data?.outcome_connector?.connector_schema_ui ?? ' {}'),
                    ...uiSchema,
                  }}
                  ref={formRef}
                  showErrorList={false}
                  liveValidate
                  schema={JSON.parse(data?.outcome_connector?.connector_schema ?? ' {}')}
                  formData={JSON.parse(data?.outcome_configuration ?? ' {}')}
                  validator={validator}
                />
                <div className={classes.buttons}>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => {
                      submitForm(setSubmitting, values, formRef.current);
                      onClose();
                    }}
                    disabled={isSubmitting}
                    classes={{ root: classes.button }}>
                    {t('Save')}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </>
  );
};

export default OutcomeEdition;
