import { QueryClientProvider, useQuery } from "@coursehub/browser";
import { session } from "./runtime";
import { SessionContext } from "./context";
function SessionState({ children }) {
    const result = useQuery(session.options);
    return <SessionContext value={result}>{children}</SessionContext>;
}
export function SessionProvider({ children }) {
    return (
        <QueryClientProvider client={session.queryClient}>
            <SessionState>{children}</SessionState>
        </QueryClientProvider>
    );
}
