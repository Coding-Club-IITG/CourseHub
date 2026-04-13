import { getAccessToken } from "../modules/onedrive/onedrive.controller.js";
const encodeGraphShareUrl = (shareUrl) => {
    let base64;
  
  if (typeof Buffer !== 'undefined') {
    // Node.js environment
    base64 = Buffer.from(shareUrl, "utf8").toString("base64");
  } else {
    // Browser environment
    base64 = btoa(shareUrl);
  }

  console.log(`u!${base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`);
  
  return `u!${base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
};



 export const downloadFiles = async (req, res) => {
   const access = await getAccessToken();
  try {
    const inputUrl = req.body?.url;
    if (!inputUrl) {
      return res.status(400).json({ error: "Please provide a SharePoint/OneDrive share URL in request body as `url`." });
    }

    const encoded = encodeGraphShareUrl(inputUrl);
    console.log("Encoded URL:", encoded);

    // IMPORTANT: await the fetch so `response` is a Response object
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/shares/${encoded}/driveItem`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access}`
        }
      }
    );

    // check for HTTP errors
    if (!response.ok) {
      const text = await response.text().catch(() => null);
      console.error("Graph API returned error:", response.status, response.statusText, text);
      return res.status(502).json({ error: "Failed to fetch from Microsoft Graph", status: response.status, detail: text });
    }

    // parse JSON (this works because the Graph endpoint returns JSON metadata)
    const data = await response.json();

    if (data.error) {
      console.error("Error object from Graph:", data.error);
      return res.status(502).json({ error: "Microsoft Graph responded with an error", detail: data.error });
    }

    const downloadLink = data["@microsoft.graph.downloadUrl"];
    if (!downloadLink) {
      console.error("No download link found in Graph response:", data);
      return res.status(500).json({ error: "No download link found in Graph response." });
    }

    // Return the direct download link (or you can proxy the file by fetching downloadLink)
    return res.status(200).json({ downloadLink });

  } catch (err) {
    console.error("Unexpected error in downloadFiles:", err);
    return res.status(500).json({ error: "Internal server error", detail: err?.message ?? err });
  }
};
