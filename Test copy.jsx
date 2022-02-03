import React from "react";
import PropTypes from "prop-types";
import _ from "lodash";
import "./applicationStatus.scss";
import Panel from "../../Common/Panel";
import Button from "../../Common/Button/Button";
import PanelHeader from "../../Common/PanelHeader";
import LenderNotes from "./ApplicationLenderNotes";
import SquareActionButton from "../../Common/SquareActionButton";
import Breadcrumbs from "../../Common/Breadcrumbs";
import Page from "../../Common/Page";
import ConsumerVehicleInfoPanel from "../../Common/ConsumerVehicleInfoPanel";
import AssignLeadContainer from "../../AssignLead/containers/AssignLeadContainer";
import PanelToolBar from "../../Common/PanelToolBar";
import NoProceedNotice from "../../ApplicationStatus/NoProceedNotice";
import ConsumerStatus from "../../ApplicationStatus/ConsumerStatus";
import LargeButtonLayout from "../../ApplicationStatus/Layout/LargeButtonLayout";
import Modal from "../../Common/Modal/Modal";
import { observer, inject } from "mobx-react";
import TrackEvent from "../../Common/Tracking/TrackEvent";
import RelatedApplicationStatus from "../../ApplicationStatus/RelatedApplicationStatus";
import InformationWarning from "../../Common/InformationWarning";
import LoadingDots from "../../Common/Loading/LoadingDots";
import EditNewDecision from "./EditNewDecision";
import BoldHeader from "../../Common/BoldHeader";
import CancelApplicationModal from "../../ApplicationStatus/CancelApplicationModal";
import LenderDocumentLink from "./LenderDocumentLink";

class ApplicationStatus extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isModalOpen: false,
      isCancelModalOpen: false,
      newDecisionOption: undefined,
    };
  }

  fetchUpdates = () => {
    this.props.fetchApplicationUpdates(this.props.params.applicantId);
  };

  componentDidMount() {
    this.intervalId = setInterval(this.fetchUpdates, 15000);
  }

  componentWillUnmount() {
    clearInterval(this.intervalId);
  }

  showModal = () => {
    this.setState({ isModalOpen: true });
  };

  closeModal = () => {
    this.setState({ isModalOpen: false });
  };

  showCancelModal = () => {
    this.setState({ isCancelModalOpen: true });
  };

  closeCancelModal = () => {
    this.setState({ isCancelModalOpen: false });
    this.props.appStore.applicationStatusStore.resetModalStatus();
  };

  componentWillMount() {
    this.setState({
      openModal: false,
    });

    if (
      this.props.application.Tags &&
      this.props.application.Tags.multiQuoteRefId
    ) {
      this.props.appStore.customerStore.fetchCustomerData(
        this.props.consumer.Id
      );
    }
  }

  handleHideFromDashboard = (value) => {
    this.props.showHideLeadOnDashboard(value);
  };
  handleChangeNewDecision = (option) => {
    this.setState({ newDecisionOption: option });
  };
  handleSubmitNewDecision = () => {
    const randomAgreementNumber = parseInt(
      (Math.random() * 9000000000).toString().replace(".", "").slice(0, 16)
    );
    this.props.appStore.customerStore.sendChangeApplicantDecision(
      this.state.newDecisionOption,
      this.props.params.consumerId,
      this.props.params.applicantId,
      randomAgreementNumber
    );
  };

  onCancelApplication = () => {
    this.props.appStore.applicationStatusStore.setCancelApplication(
      this.props.application.Id
    );
  };

  isCancelButtonAllowedByStatus = () => {
    const statusesNotAllowed = [
      "PaidOut",
      "Rejected",
      "NotTakenUp",
      "SentForPayout",
      "Error",
      "Cancelled",
      "Submitting",
    ];
    const containsStatus =
      statusesNotAllowed.indexOf(this.props.application.Status) > -1;
    return !containsStatus;
  };

  getBreadCrumbs = () => {
    let crumbs = [
      {
        name: "Home",
        path: `/d/${this.props.dealership.Id}`,
      },
    ];

    if (this.props.location.query.order) {
      crumbs.push({
        name: "Orders & Deals",
        path: `/d/${this.props.dealership.Id}/orders-and-deals`,
        query: {
          page: 1,
          pageSize: 5,
          dealStatus: "all",
          sortBy: "sentAt",
        },
      });
      crumbs.push({
        name: "Order Summary",
        path: `/d/${this.props.dealership.Id}/orders-and-deals/order/${this.props.location.query.order}`,
      });
    } else {
      crumbs.push({
        name: "Customer List",
        path: `/d/${this.props.dealership.Id}/consumers`,
      });
      crumbs.push({
        name: "Consumer",
        path: `/d/${this.props.dealership.Id}/consumers/${this.props.consumer.Id}`,
      });
    }

    crumbs.push({
      name: "Application Status",
    });

    return crumbs;
  };

  render() {
    if (this.props.application.Id !== this.props.params.applicantId) {
      this.props.changeApplication(this.props.params.applicantId);
    }

    const application = this.props.application;

    const { dealershipId, consumerId, applicantId } = this.props.params;
    const lenderNotes = _.orderBy(
      this.props.application.LenderNotes,
      "Timestamp",
      "desc"
    );
    const customerName =
      this.props.consumer.CustomerType.toLowerCase() === "consumer"
        ? `${this.props.consumer.Firstname} ${this.props.consumer.Surname}`
        : `${this.props.consumer.TradingName}`;

    let shouldHideEdit = false;
    if (
      application.Quote.FunderCode === "CRE" &&
      lenderNotes &&
      lenderNotes.length
    ) {
      lenderNotes.map((note) => {
        if (
          note.ExtraInfo.includes(
            "These applications are for personal loans to cover the cost(s) of any VAPs and/or negative equity."
          )
        ) {
          shouldHideEdit = true;
        }
      });
    }

    let shouldUseDocumentLink =
      (application.Status === "Accepted" ||
        application.Status === "ConditionalAccept") &&
      (application.Quote.FunderCode === "BAR" ||
        application.Quote.FunderCode === "V12") &&
      application.DocumentLinks &&
      application.DocumentLinks.length > 0;

    let hasBlackhorseDocs =
      (application.Status === "Accepted" ||
        application.Status === "ConditionalAccept") &&
      application.Quote.FunderCode === "BLA" &&
      application.DocumentLinkReadModels &&
      application.DocumentLinkReadModels.length > 0;

    let hasCloseDocs =
      (application.Status === "Accepted" ||
        application.Status === "ConditionalAccept") &&
      application.Quote.FunderCode === "CLO" &&
      application.DocumentLinkReadModels &&
      application.DocumentLinkReadModels.length > 0;

    let pceDoc;
    let pcciDoc;
    if (hasBlackhorseDocs) {
      pceDoc = application.DocumentLinkReadModels.filter(
        (doc) => doc.DocumentTitle === "PCE"
      )[0];
      pcciDoc = application.DocumentLinkReadModels.filter(
        (doc) => doc.DocumentTitle === "PCCI"
      )[0];
    }

    let associatedApplications = [];
    if (
      application.Tags &&
      application.Tags.multiQuoteRefId &&
      this.props.appStore.customerStore.customer
    ) {
      this.props.appStore.customerStore.customer.FinanceApplications.map(
        (app) => {
          if (
            app.Tags &&
            application.Tags.multiQuoteRefId === app.Tags.multiQuoteRefId &&
            app.ApplicantId !== application.Id
          ) {
            associatedApplications.push(app);
          }
        }
      );
    }

    const shouldShowCreationFinanceCopy =
      application.Quote.FunderCode === "CRE";

    let canRepropose =
      this.props.appStore.uiState.canRepropose &&
      associatedApplications.length <= 0;
    let thisAppSaysNoContinue =
      this.props.application.Status === "Error" ||
      this.props.application.Status === "";
    let disableContinueWithLoans =
      this.props.application.Quote.FinanceType !== "FS" &&
      thisAppSaysNoContinue;

    let isCombinedApplication = associatedApplications.length > 0;
    let mainLoanLoading =
      this.props.application.Status === "Submitting" ||
      this.props.application.Status === "Not Submitted" ||
      this.props.application.Status === "Pending";
    if (this.props.appStore.customerStore.isLoadingCustomer) {
      return (
        <Page>
          <Breadcrumbs
            items={this.getBreadCrumbs()}
            consumer={this.props.consumer}
          />
          <ConsumerVehicleInfoPanel vehicle={this.props.vehicle} />
          <Panel>
            <PanelHeader>Application Status</PanelHeader>
            <div className="applicationStatus__status">
              <LoadingDots />
            </div>
          </Panel>
        </Page>
      );
    }

    return (
      <Page>
        <Breadcrumbs
          items={this.getBreadCrumbs()}
          consumer={this.props.consumer}
        />
        <ConsumerVehicleInfoPanel vehicle={this.props.vehicle} />
        <Panel>
          <PanelHeader>Application Status</PanelHeader>
          <PanelToolBar>
            {this.props.appStore.uiState.canCloseDeals && (
              <div className="applicationStatus__button">
                <Button
                  buttonStyle="secondary"
                  to={
                    this.props.application.Status === "PaidOut"
                      ? `d/${this.props.params.dealershipId}/consumers/${this.props.params.consumerId}/vehicle/${this.props.application.Vehicle.VehicleId}/paidout?vehicleId=${this.props.application.Vehicle.VehicleId}`
                      : `/d/${this.props.params.dealershipId}/consumers/${this.props.params.consumerId}?vehicleId=${this.props.application.Vehicle.VehicleId}`
                  }
                >
                  {!this.props.application.Vehicle.Closed
                    ? "Close Deal"
                    : "Edit Closed Deal"}
                </Button>
              </div>
            )}
            <div className="applicationStatus__button">
              <AssignLeadContainer
                dealershipId={this.props.params.dealershipId}
                customerId={this.props.consumer.Id}
                customerName={customerName}
                customerType={this.props.consumer.CustomerType.toLowerCase()}
                initialAssignees={this.props.consumer.assignedTo}
              />
            </div>
          </PanelToolBar>

          <div className="applicationStatus__status">
            {isCombinedApplication && (
              <div className="applicationStatus__combinedInfoMessage">
                <InformationWarning>
                  This is a combined deal. Each loan application has to be
                  submitted separately and has its own application status.
                </InformationWarning>
              </div>
            )}

            <ConsumerStatus
              application={this.props.application}
              consumer={this.props.consumer}
              checkboxOnChange={this.handleHideFromDashboard}
              combined={isCombinedApplication}
              dealershipId={this.props.dealership.Id}
            />

            {isCombinedApplication && (
              <>
                <RelatedApplicationStatus
                  application={this.props.application}
                  dealershipId={this.props.dealership.Id}
                  customerId={this.props.consumer.Id}
                  main
                />
                <div className="applicationStatus__extraLoans">
                  {mainLoanLoading && (
                    <div className="applicationStatus__loadingSpinner" />
                  )}
                  <div
                    className={
                      mainLoanLoading ? "applicationStatus__loadingLoan" : ""
                    }
                  >
                    {associatedApplications.map((app, index) => (
                      <RelatedApplicationStatus
                        key={"related-app-status_" + index}
                        application={app}
                        dealershipId={this.props.dealership.Id}
                        customerId={this.props.consumer.Id}
                        disabled={
                          (disableContinueWithLoans ||
                            (app.Quote.FinanceType === "FS" &&
                              thisAppSaysNoContinue)) &&
                          !mainLoanLoading
                        }
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            <LenderNotes
              notes={lenderNotes}
              params={this.props.params}
              updatingState={this.props.application.updatingState}
              application={application}
              updateDecision={this.props.updateDecision}
              title={
                associatedApplications.length > 0 &&
                this.props.application.Quote.ProductName
              }
            />
            {process.env.REACT_APP_SHOW_NEWDECISION === "true" && (
              <EditNewDecision
                optionValue={this.state.newDecisionOption}
                handleChange={this.handleChangeNewDecision}
                handleSubmit={this.handleSubmitNewDecision}
                isLoading={
                  this.props.appStore.customerStore.isLoadingCustomer ||
                  this.props.appStore.customerStore.isLoadingDevStatus ||
                  mainLoanLoading
                }
                hasError={this.props.appStore.customerStore.hasError}
              />
            )}
            <BoldHeader text="What can I do now?" />
            <div>
              {!this.props.appStore.uiState.canViewConsumerApplications && (
                <NoProceedNotice text="You do not have the required permissions to view applications." />
              )}
              {!this.props.appStore.uiState.canCreateApplications && (
                <NoProceedNotice text="You do not have the required permissions to create or edit applications." />
              )}
              {application.isAdjusted && (
                <NoProceedNotice text="This proposal has been adjusted by the lender and edits are not allowed." />
              )}
              {application.isSubmitting && (
                <NoProceedNotice text="Your application is now being submitted to the lender. Updates are not allowed at this time." />
              )}
              {application.isPending && (
                <NoProceedNotice text="Your application is pending a decision from the lender and therefore cannot be updated at this time." />
              )}
              {application.isPaidOut && (
                <NoProceedNotice text="Your application has been paid out and cannot be updated at this time." />
              )}
            </div>
            <LargeButtonLayout>
              {application.Quote.FunderCode === "CRE" &&
                this.isCancelButtonAllowedByStatus() && (
                  <SquareActionButton
                    onClick={this.showCancelModal}
                    text="Cancel application"
                    ctaText="Cancel Application"
                    type="proceed"
                    iconName="cross"
                  />
                )}
              {this.props.appStore.uiState.canViewConsumerApplications &&
                !application.isError && (
                  <SquareActionButton
                    to={`/d/${dealershipId}/consumers/${consumerId}/application/${applicantId}/viewapplicationsummary`}
                    text="View the application summary"
                    ctaText="View Application"
                    type="view"
                    iconName="application"
                  />
                )}
              {application.isComplete &&
                !application.isError &&
                !shouldUseDocumentLink && (
                  <SquareActionButton
                    onClick={this.showModal}
                    text="Proceed and request paperwork"
                    ctaText="Proceed"
                    type="proceed"
                    iconName="proceed"
                  />
                )}

              {application.isComplete &&
                !application.isError &&
                shouldUseDocumentLink && (
                  <TrackEvent
                    linkTo={application.DocumentLinks[0]}
                    interactionName={`Lender Portal Paperwork Link (${application.Quote.FunderCode})`}
                  >
                    <SquareActionButton
                      href={application.DocumentLinks[0]}
                      text="Proceed and request paperwork"
                      ctaText="Proceed"
                      type="proceed"
                      iconName="proceed"
                    />
                  </TrackEvent>
                )}

              {this.props.appStore.uiState.canViewConsumerApplications &&
                this.props.appStore.uiState.canCreateApplications &&
                application.isError && (
                  <SquareActionButton
                    to={`/d/${dealershipId}/consumers/${consumerId}/application/${applicantId}/applicationsummary`}
                    text="Review application and resolve issues"
                    ctaText="Edit"
                    type="error"
                    iconName="rejected"
                  />
                )}
              {this.props.appStore.uiState.canCreateApplications &&
                application.isReproposable &&
                !application.isError &&
                canRepropose && (
                  <SquareActionButton
                    to={`/d/${dealershipId}/consumers/${consumerId}/application/${applicantId}/repropose`}
                    text="Re-propose to a new lender"
                    ctaText="Re-propose"
                    type="proceed"
                    iconName="repropose"
                  />
                )}
              {this.props.appStore.uiState.canCreateApplications &&
                application.isEditable &&
                !application.isError &&
                !shouldHideEdit && (
                  <SquareActionButton
                    to={`/d/${dealershipId}/consumers/${consumerId}/application/${applicantId}/edit`}
                    text="Edit the application and re-submit"
                    ctaText="Edit"
                    type="edit"
                    iconName="edit"
                  />
                )}
            </LargeButtonLayout>
          </div>
        </Panel>
        <Modal isOpen={this.state.isModalOpen} onClose={this.closeModal}>
          {hasBlackhorseDocs || hasCloseDocs ? (
            <div className="applicationStatus__modal">
              <div className="applicationStatus__modal--title">
                Agreement Documents
              </div>

              {hasBlackhorseDocs && (
                <>
                  <div className="applicationStatus__modal--links">
                    {pceDoc && (
                      <div className="applicationStatus__modal--link">
                        View{" "}
                        <a
                          href={pceDoc.DocumentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {pceDoc.DocumentTitle}
                        </a>
                      </div>
                    )}
                    <div className="applicationStatus__modal--text">
                      <div className="applicationStatus__modal--redText">
                        MANDATORY DOCUMENT:
                      </div>{" "}
                      Print and hand this document to the Customer; as an
                      alternative, this document can be sent by e-mail.
                    </div>
                  </div>
                  <div className="applicationStatus__modal--links">
                    {pcciDoc && (
                      <div className="applicationStatus__modal--link">
                        View{" "}
                        <a
                          href={pcciDoc.DocumentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {pcciDoc.DocumentTitle}
                        </a>
                      </div>
                    )}
                    <div className="applicationStatus__modal--text">
                      This document should not be sent by e-mail: print and hand
                      a copy over to the customer.
                    </div>
                  </div>
                  <div className="applicationStatus__modal--links">
                    <div className="applicationStatus__modal--subtitle">
                      Four-document-set required for delivery/handover
                    </div>
                    {application.DocumentLinkReadModels.map((doc) => {
                      if (
                        doc.DocumentTitle !== "PCE" &&
                        doc.DocumentTitle !== "PCCI"
                      ) {
                        return (
                          <div className="applicationStatus__modal--link">
                            View{" "}
                            <a
                              href={doc.DocumentLink}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {doc.DocumentTitle}
                            </a>
                          </div>
                        );
                      }
                    })}
                  </div>
                </>
              )}
              {hasCloseDocs && (
                <>
                  <div className="applicationStatus__modal--text">
                    Please view and complete the Dealer Document at 1. ahead of
                    using any other document presented on this page. The eSign
                    solution is meant for Customer use, to be completed in the
                    showroom: please allow access to your keyboard, mouse and
                    screen.
                  </div>

                  <LenderDocumentLink displayTitle="1. Agreement Document">
                    <>
                      View & Complete Dealer{" "}
                      <a
                        href={
                          application.DocumentLinkReadModels.find(
                            (doc) =>
                              doc.DocumentTitle === "DealerEsignAgreement"
                          ).DocumentLink
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Declaration Document
                      </a>
                    </>
                  </LenderDocumentLink>
                  <LenderDocumentLink displayTitle="2. Agreement Document">
                    <>
                      eSign Link For Use within The Showroom,{" "}
                      <a
                        href={
                          application.DocumentLinkReadModels.find(
                            (doc) =>
                              doc.DocumentTitle === "ApplicantEsignAgreement"
                          ).DocumentLink
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Customer Agreement
                      </a>
                    </>
                  </LenderDocumentLink>

                  <LenderDocumentLink displayTitle="3. Agreement Document">
                    <>
                      Proposal reply doc (summary of deal){" "}
                      <a
                        href={
                          application.DocumentLinkReadModels.find(
                            (doc) => doc.DocumentTitle === "AGREEMENT"
                          ).DocumentLink
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Summary Document
                      </a>
                    </>
                  </LenderDocumentLink>

                  <LenderDocumentLink displayTitle="4. Alternative Agreement Document">
                    <>
                      To Be Used As Required,{" "}
                      <a
                        href={
                          application.DocumentLinkReadModels.find(
                            (doc) => doc.DocumentTitle === "PROPOSALREPLY"
                          ).DocumentLink
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        'Wet Sign' PDF Agreement
                      </a>
                    </>
                  </LenderDocumentLink>

                  <div className="applicationStatus__documentExpiryWarning">
                    <InformationWarning>
                      If any of the above links expire, you can use the "Update
                      Decision" action to request new ones.
                    </InformationWarning>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="applicationStatus__modal">
              {shouldShowCreationFinanceCopy ? (
                <div>
                  Please check your email. Creation Finance will have sent you a
                  system link that will allow you to access this proposal and
                  progress with contract document signing.
                </div>
              ) : (
                <div>
                  Please check your email, {application.Quote.FunderName} will
                  have automatically dispatched the customer and dealer
                  acceptance packs to your dealership email address.
                </div>
              )}
            </div>
          )}
        </Modal>
        <Modal
          isOpen={this.state.isCancelModalOpen}
          onClose={this.closeCancelModal}
        >
          <CancelApplicationModal
            quote={this.props.application.Quote}
            consumer={this.props.consumer}
            modifiedDate={this.props.application.LastModified}
            applicationStatus={this.props.application.Status}
            onClose={this.closeCancelModal}
            onCancelApplication={this.onCancelApplication}
          />
        </Modal>
      </Page>
    );
  }
}

ApplicationStatus.contextTypes = {
  router: PropTypes.object,
};

ApplicationStatus.propTypes = {
  session: PropTypes.object,
  params: PropTypes.object,
  formData: PropTypes.object,
  sections: PropTypes.object,
  consumer: PropTypes.object,
  application: PropTypes.object,
  options: PropTypes.object,
  vehicle: PropTypes.object,
  fetchApplicationUpdates: PropTypes.func,
  dealership: PropTypes.object,
  updateDecision: PropTypes.func,
  showHideLeadOnDashboard: PropTypes.func,
  appStore: PropTypes.object,
};

ApplicationStatus.onEnter = () => {
  window.scrollTo(0, 0);
};

export default inject(["appStore"])(observer(ApplicationStatus));
