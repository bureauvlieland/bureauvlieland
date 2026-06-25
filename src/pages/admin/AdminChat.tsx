import { Navigate, useSearchParams } from "react-router-dom";

/**
 * Legacy /admin/chat route. The chat workspace now lives inside the unified
 * message center at /admin/berichten?tab=chat. Preserve any deep-link params
 * (such as a specific conversation) when redirecting.
 */
const AdminChat = () => {
  const [params] = useSearchParams();
  const conversation = params.get("conversation");
  const target = conversation
    ? `/admin/berichten?tab=chat&conversation=${encodeURIComponent(conversation)}`
    : "/admin/berichten?tab=chat";
  return <Navigate to={target} replace />;
};

export default AdminChat;
