import { addOutcome } from '../modules/outcome/outcome-domain';
import { OUTCOME_CONNECTOR_WEBHOOK } from '../modules/outcome/outcome-statics';
import { executionContext, SYSTEM_USER } from '../utils/access';

const DEFAULT_TEAM_MESSAGE = {
  outcome_connector_id: OUTCOME_CONNECTOR_WEBHOOK,
  name: 'Sample of Team message for live trigger',
  description: 'This is a sample outcome to send a team message. The template is already filled and fully customizable. You need to add the correct Teams endpoint to get it working.',
  outcome_configuration: `
    {
      "template": "{\\n        \\"type\\": \\"message\\",\\n        \\"attachments\\": [\\n            {\\n                \\"contentType\\": \\"application/vnd.microsoft.card.thumbnail\\",\\n                \\"content\\": {\\n                    \\"subtitle\\": \\"Operation : <%=content[0].events[0].operation%>\\",\\n                    \\"text\\": \\"<%=(new Date(notification.created)).toLocaleString()%>\\",\\n                    \\"title\\": \\"<%=content[0].events[0].message%>\\",\\n                    \\"buttons\\": [\\n                        {\\n                            \\"type\\": \\"openUrl\\",\\n                            \\"title\\": \\"See in OpenCTI\\",\\n                            \\"value\\": \\"https://YOUR_OPENCTI_URL/dashboard/id/<%=content[0].events[0].instance_id%>\\"\\n                        }\\n                    ]\\n                }\\n            }\\n        ]\\n    }",
      "url": "https://YOUR_DOMAIN.webhook.office.com/YOUR_ENDPOINT",
      "verb": "POST"
    }
  `
};

const DEFAULT_TEAM_DIGEST_MESSAGE = {
  outcome_connector_id: OUTCOME_CONNECTOR_WEBHOOK,
  name: 'Sample of Team message for Digest trigger',
  description: 'This is a sample outcome to send a team message. The template is already filled and fully customizable. You need to add the correct Teams endpoint to get it working.',
  outcome_configuration: `
    {
      "template": "{\\n    \\"type\\": \\"message\\",\\n    \\"attachments\\": [\\n        {\\n            \\"contentType\\": \\"application/vnd.microsoft.card.adaptive\\",\\n            \\"content\\": {\\n                \\"$schema\\": \\"http://adaptivecards.io/schemas/adaptive-card.json\\",\\n                \\"type\\": \\"AdaptiveCard\\",\\n                \\"version\\": \\"1.0\\",\\n                \\"body\\": [\\n                    {\\n                        \\"type\\": \\"Container\\",\\n                        \\"items\\": [\\n                            {\\n                                \\"type\\": \\"TextBlock\\",\\n                                \\"text\\": \\"<%=notification.name%>\\",\\n                                \\"weight\\": \\"bolder\\",\\n                                \\"size\\": \\"extraLarge\\"\\n                            }, {\\n                                \\"type\\": \\"TextBlock\\",\\n                                \\"text\\": \\"<%=(new Date(notification.created)).toLocaleString()%>\\",\\n                                \\"size\\": \\"medium\\"\\n                            }\\n                        ]\\n                    },\\n                    <% for(var i=0; i<content.length; i++) { %>\\n                    {\\n                        \\"type\\": \\"Container\\",\\n                        \\"items\\": [<% for(var j=0; j<content[i].events.length; j++) { %>\\n                            {\\n                                \\"type\\" : \\"TextBlock\\",\\n                                \\"text\\" : \\"[<%=content[i].events[j].message%>](https://YOUR_OPENCTI_URL/dashboard/id/<%=content[i].events[j].instance_id%>)\\"\\n                         \\t}<% if(j<(content[i].events.length -1)) {%>,<% } %>\\n                        <% } %>]\\n\\t\\t\\t\\t\\t\\t}\\n                    <% } %>\\n                ]\\n            }\\n        }\\n    ]\\n}",
      "url": "https://YOUR_DOMAIN.webhook.office.com/YOUR_ENDPOINT",
      "verb": "POST"
    }
  `
};

export const up = async (next) => {
  const context = executionContext('migration');
  await Promise.all([DEFAULT_TEAM_MESSAGE, DEFAULT_TEAM_DIGEST_MESSAGE]
    .map((outcome) => addOutcome(context, SYSTEM_USER, outcome)));
  next();
};

export const down = async (next) => {
  next();
};
