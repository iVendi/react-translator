import {useTranslation} from "react-i18next";
import React from "react";
import PropTypes from "prop-types";
import Table from "../../../Common/Table/Table";
import TableHeader from "../../../Common/Table/TableHeader";
import TableHeaderItem from "../../../QuotesList/components/TableHeaderItem";
import TableBody from "../../../Common/Table/TableBody";
import TableRow from "../../../Common/Table/TableRow";
import EmptyRow from "../../../Common/Table/EmptyRow";
import Td from "../../../Common/Table/Td";
import QuoteFunderLogo from "../../../QuotesList/components/QuoteFunderLogo";
import QuoteButton from "../../../QuotesList/components/QuoteButton";
import ProductName from "../../../QuotesList/components/ProductName";
import MoneyFormat from "../../../Common/MoneyFormat";
import TableFooter from "../../../Common/Table/TableFooter";
import QuoteSmallPrint from "../../../Quoting/components/QuoteSmallPrint";
import "./productTables.scss";

const ProductsTables = () => {
  const {
    t
  } = useTranslation("a");
  return <Table>
    <TableHeader>
      <TableHeaderItem text={t("ProductsTables.lender")} />
      <TableHeaderItem text={t("ProductsTables.product_name")} />
      <TableHeaderItem text={t("ProductsTables.apr")} />
      <TableHeaderItem text={t("ProductsTables.total_amount_payable")} />
      <TableHeaderItem text={t("ProductsTables.agreement_term")} />
      <TableHeaderItem text={t("ProductsTables.monthly_payments")} />
      <TableHeaderItem text={t("ProductsTables.")} />
    </TableHeader>
    {props.quotes.map((quote, index) => <TableBody key={index}>
        <EmptyRow />
        <TableRow>
          <Td>
            <QuoteFunderLogo funder={quote.FunderCode} />
          </Td>
          <Td>
            <ProductName productName={quote.ProductName} />
          </Td>
          <Td>{quote.RepresentativeApr + "%"}</Td>
          <Td>
            <MoneyFormat value={quote.TotalAmountPayable} />
          </Td>
          <Td>{quote.Term + " Months"}</Td>
          <Td>
            <MoneyFormat value={quote.FollowingPayments} />
          </Td>
          <Td>
            <div className="productTables__quoteButton">
              <QuoteButton label={t("ProductsTables.view")} to={`/d/${props.dealershipId}/consumers/${props.consumer.Id}/vehicle/${props.vehicleId}/selfservicequote/${quote.QuoteId}`} />
            </div>
          </Td>
        </TableRow>
        <TableFooter tdCount={7}>
          <QuoteSmallPrint quote={quote} vehicleClass={props.vehicleClass} />
        </TableFooter>
      </TableBody>)}
  </Table>;
};

ProductsTables.propTypes = {
  quotes: PropTypes.array,
  consumer: PropTypes.object,
  dealershipId: PropTypes.string,
  vehicleId: PropTypes.string,
  vehicleClass: PropTypes.string
};
export default ProductsTables;