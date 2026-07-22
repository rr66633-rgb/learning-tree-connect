import StoreProducts from "./StoreProducts";
import { useTranslation } from "react-i18next";
export default function StoreOrders() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  return <StoreProducts />;
}
