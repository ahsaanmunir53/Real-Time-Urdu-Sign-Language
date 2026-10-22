// Where the Express backend lives. Empty when the backend serves this build itself (same site);
// the backend's URL when the website runs as its own static site on Render.
export const API = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");
