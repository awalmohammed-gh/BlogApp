import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { engagementService } from "../services/public/engagementService";

export default function NewsletterAction({ action }) {
  const [params] = useSearchParams();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const submit = async () => {
    setBusy(true);
    try { const result = await engagementService.newsletterAction(action, params.get("token") || ""); setMessage(result.message); setDone(true); }
    catch (err) { setMessage(err.message); }
    finally { setBusy(false); }
  };
  return <main className="max-w-xl mx-auto px-6 py-40 space-y-6"><h1 className="text-3xl font-bold">{action === "confirm" ? "Confirm your subscription" : "Unsubscribe from Nsemra News"}</h1><p>Choose the button below to update your newsletter preference.</p>{message && <p role="status">{message}</p>}{!done && <button className="bg-blue-700 text-white px-5 py-3 rounded-xl" disabled={busy} onClick={submit}>{busy ? "Saving…" : action === "confirm" ? "Confirm subscription" : "Unsubscribe"}</button>}<Link className="block underline" to="/">Return to Nsemra News</Link></main>;
}
