import React from "react";
import PropTypes from "prop-types";
import AssignLeadModalUserList from "./AssignLeadModalUserList";
import AssignLeadModalUserListItem from "./AssignLeadModalUserListItem";
import FormFooter from "../../Common/Form/FormFooter";
import SearchBarWithResults from "./SearchBarWithResults";
import ConsumerName from "../../Common/ConsumerName";
import "./assignLeadForm.scss";
import { observer } from "mobx-react";

const AssignLeadForm = (props) => {
  return (
    <div>
      <h1 className="assignLeadForm__title">Assign Lead</h1>
      <div className="assignLeadForm__divider assignLeadForm__dividerTop" />

      <span className="assignLeadForm__customerNameTitle">Customer Name: </span>
      <span className="assignLeadForm__customerName">
        {props.customerType === "corporate" ? (
          props.customerName
        ) : (
          <ConsumerName name={props.customerName} />
        )}
      </span>

      <div className="assignLeadForm__divider assignLeadForm__dividerBottom" />

      <h2 className="assignLeadForm__subHeading">
        Assign Dealership Users to this Customer
      </h2>
      <div className="assignLeadForm__searchWrapper">
        <SearchBarWithResults
          handleSearch={props.handleSearch}
          searchResults={props.searchResults}
          onSelectResult={props.onSelectResult}
          searchQuery={props.searchQuery}
          selectedSearchResult={props.selectedSearchResult}
          addUserToCurrentAssignees={props.addUserToCurrentAssignees}
          activeSearchResultIndex={props.activeSearchResultIndex}
          makeNextSearchResultActive={props.makeNextSearchResultActive}
          makePrevSearchResultActive={props.makePrevSearchResultActive}
          selectCurrentActiveResult={props.selectCurrentActiveResult}
        />
      </div>

      <div className="assignLeadForm__userList">
        <AssignLeadModalUserList>
          {!props.currentLeadAssignees.length && (
            <li className="assignLeadForm__noAssignedUsers">
              No users have been assigned yet.
            </li>
          )}
          {props.currentLeadAssignees.map((assignee, index) => (
            <AssignLeadModalUserListItem
              key={`assignee${index}`}
              tabIndex={index + 2}
              isLast={index === props.currentLeadAssignees.length - 1}
              assignee={assignee}
              onClick={() => {
                props.removeUserFromCurrentAssignees(assignee);
              }}
            />
          ))}
        </AssignLeadModalUserList>
      </div>

      <FormFooter
        isSubmitting={props.isLoading}
        hasSubmittingError={props.hasError}
        onSubmit={props.onSubmit}
        onCancel={props.onCancel}
        submitDisabled={!props.submitEnabled}
        submitLabel="Save & Exit"
        cancelTabIndex={props.currentLeadAssignees.length + 3}
        submitTabIndex={props.currentLeadAssignees.length + 4}
      />
    </div>
  );
};

AssignLeadForm.propTypes = {
  customerName: PropTypes.string,
  assignees: PropTypes.object,
  onSubmit: PropTypes.func,
  onCancel: PropTypes.func,
  handleSearch: PropTypes.func,
  searchResults: PropTypes.object,
  onSelectResult: PropTypes.func,
  searchQuery: PropTypes.string,
  selectedSearchResult: PropTypes.object,
  addUserToCurrentAssignees: PropTypes.func,
  currentLeadAssignees: PropTypes.object,
  isLoading: PropTypes.bool,
  hasError: PropTypes.bool,
  submitEnabled: PropTypes.bool,
  makeNextSearchResultActive: PropTypes.func,
  makePrevSearchResultActive: PropTypes.func,
  activeSearchResultIndex: PropTypes.number,
  selectCurrentActiveResult: PropTypes.func,
  customerType: PropTypes.string,
  removeUserFromCurrentAssignees: PropTypes.func,
};

export default observer(AssignLeadForm);
