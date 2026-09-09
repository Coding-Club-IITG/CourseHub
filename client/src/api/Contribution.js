import { transport } from "./http";

export const CreateNewContribution = (data, key) =>
    transport.json("contribution/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify(data),
    });
export const GetMyContributions = () => transport.json("contribution/");
export const GetBrContribution = () =>
    transport.json("contribution/br", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
    });
