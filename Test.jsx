import {useTranslation, withTranslation} from "react-i18next";
import React from "react";
import PropTypes from "prop-types";
import DateFormat from "../../Common/DateFormat";
import { getClientApp } from "../../../core/helpers";
import "./consumerHubInfoPanel.scss";

function ConsumerHubInfoPanel({
  application
}) {
  const {
    t
  } = useTranslation();
  const clientApp = getClientApp(application);
  const showIddViewedActivityItem = application.AcceptedInitialDisclosureDocument && application.ClientApp === "new-vehicle-account";
  return <div className="consumerHubInfoPanel">
      <span className="consumerHubInfoPanel__title">{t('online_application')}</span>
      <div className="consumerHubInfoPanel__timestamp">
        <DateFormat value={application.CreatedDate} format="HH:mm DD MMM YYYY" />
      </div>
      <ul className="consumerHubInfoPanel__activityList">
        <li className="consumerHubInfoPanel__activityItem">
          {`Customer completed application via ${clientApp}`}
        </li>
        {showIddViewedActivityItem && <li className="consumerHubInfoPanel__activityItem">
            {`Customer acknowledged that they've read and understood the Initial Disclosure Document, via ${clientApp}`}
          </li>}
      </ul>
    </div>;
}

ConsumerHubInfoPanel.propTypes = {
  application: PropTypes.object
};
export default ConsumerHubInfoPanel;