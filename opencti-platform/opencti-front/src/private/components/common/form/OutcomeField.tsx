import React, { FunctionComponent, useState } from 'react';
import { Field } from 'formik';
import { Label } from 'mdi-material-ui';
import makeStyles from '@mui/styles/makeStyles';
import { graphql } from 'react-relay';
import { fetchQuery } from '../../../../relay/environment';
import AutocompleteField from '../../../../components/AutocompleteField';
import { useFormatter } from '../../../../components/i18n';
import { fieldSpacingContainerStyle } from '../../../../utils/field';
import { OutcomeFieldSearchQuery$data } from './__generated__/OutcomeFieldSearchQuery.graphql';
import { Option } from './ReferenceField';

const useStyles = makeStyles(() => ({
  icon: {
    paddingTop: 4,
    display: 'inline-block',
  },
  text: {
    display: 'inline-block',
    flexGrow: 1,
    marginLeft: 10,
  },
  autoCompleteIndicator: {
    display: 'none',
  },
}));

interface OutcomeFieldProps {
  name: string
  style?: { marginTop: number };
  helpertext?: string
  onChange: (name: string, value: Option[]) => void
}

const OutcomeFieldQuery = graphql`
  query OutcomeFieldSearchQuery {
    notificationOutcomes {
      id
      name
      description
    }
  }
`;

const OutcomeField: FunctionComponent<OutcomeFieldProps> = ({
  name,
  style,
  helpertext,
  onChange,
}) => {
  const classes = useStyles();
  const { t } = useFormatter();

  const [outcomesTemplates, setOutcomesTemplates] = useState<Option[]>([]);

  const searchOutcomes = (event: React.ChangeEvent<HTMLInputElement>) => {
    fetchQuery(OutcomeFieldQuery, { search: event && event.target.value ? event.target.value : '' }).toPromise().then((data) => {
      const outcomeOptions = ((data as OutcomeFieldSearchQuery$data)?.notificationOutcomes ?? [])
        .map((n) => ({
          label: n.name,
          value: n.id,
        }));
      setOutcomesTemplates(outcomeOptions);
    });
  };

  return (
    <div style={{ width: '100%' }}>
      <Field
        component={AutocompleteField}
        name={name}
        multiple={true}
        style={fieldSpacingContainerStyle ?? style}
        textfieldprops={{ variant: 'standard', label: t('Outcomes'), helperText: helpertext, onFocus: searchOutcomes }}
        noOptionsText={t('No available options')}
        options={outcomesTemplates}
        onInputChange={searchOutcomes}
        isOptionEqualToValue={(option: Option, { value }: Option) => option.value === value}
        onChange={onChange}
        renderOption={(props: React.HTMLAttributes<HTMLLIElement>, option: Option) => (
          <li {...props}>
            <div className={classes.icon} style={{ color: option.color }}>
              <Label />
            </div>
            <div className={classes.text}>{option.label}</div>
          </li>
        )}
        classes={{ clearIndicator: classes.autoCompleteIndicator }}
      />
    </div>
  );
};

export default OutcomeField;
