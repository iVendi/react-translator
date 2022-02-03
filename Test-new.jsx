import {useTranslation, withTranslation} from "react-i18next";

const ignoreMe = () => {
  return "Yo!";
};

const Test = () => {
  const {
    t
  } = useTranslation();
  return <div className="test-class" text={t("test_text")}>
      <span data-test="test-data"></span>{t('hello')}</div>;
};

export default Test;