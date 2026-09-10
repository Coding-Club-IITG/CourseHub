import { transport } from "./http";

export const CreateNewContribution = (data, key) =>
    transport.json("contribution/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify(data),
    });
export const GetMyContributions = (signal) => transport.json("contribution/", { signal });
export const GetBrContribution = (signal) =>
    transport.json("contribution/br", {
        signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
    });
