import { useQuery } from "@coursehub/browser";
import { library } from "../session";
import { getOperation } from "../apis/operations";
export const activeOperation = (operation) =>
    ["planning", "queued", "running", "cancelling"].includes(operation?.status);
export function useOperation(id) {
    return useQuery({
        queryKey: [...library.key("operation"), { id }],
        queryFn: ({ signal }) => getOperation(id, signal),
        enabled: Boolean(id),
        retry: false,
        refetchInterval: (query) => (activeOperation(query.state.data) ? 1000 : false),
    });
}
