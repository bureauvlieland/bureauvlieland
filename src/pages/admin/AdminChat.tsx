import { Navigate, useSearchParams } from "react-router-dom";

/**
 * Oude route /admin/chat. De chat zit in het Berichtencentrum op
 * /admin/berichten; een specifiek gesprek gaat mee als ?gesprek=chat:<id>.
 */
const AdminChat = () => {
  const [params] = useSearchParams();
  const conversation = params.get("conversation");
  const target = conversation
    ? `/admin/berichten?gesprek=chat:${encodeURIComponent(conversation)}`
    : "/admin/berichten";
  return <Navigate to={target} replace />;
};

export default AdminChat;
