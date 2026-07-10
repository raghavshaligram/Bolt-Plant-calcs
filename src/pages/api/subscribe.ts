import type { APIRoute } from 'astro';

// This route must be server-rendered (not prerendered) since it makes a live
// API call to Brevo using a server-only secret. Everything else on the site
// stays statically generated.
export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  let payload: { email?: unknown; listId?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ success: false, error: 'Request body must be valid JSON.' }, 400);
  }

  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const listId = typeof payload.listId === 'number' ? payload.listId : Number(payload.listId);

  if (!email || !EMAIL_RE.test(email)) {
    return json({ success: false, error: 'Please enter a valid email address.' }, 400);
  }

  if (!listId || Number.isNaN(listId)) {
    return json({ success: false, error: 'Missing or invalid listId.' }, 400);
  }

  // Never hardcode this — set BREVO_API_KEY in your local .env (gitignored) and in
  // your Netlify site's Environment variables for production. See .env.example.
  const apiKey = import.meta.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('subscribe: BREVO_API_KEY is not set in the environment.');
    return json({ success: false, error: 'Signups are temporarily unavailable. Please try again later.' }, 500);
  }

  let brevoResponse: Response;
  try {
    brevoResponse = await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        includeListIds: [listId],
        templateId: 2,
        redirectionUrl: 'https://harvestmath.com/thank-you',
      }),
    });
  } catch (err) {
    console.error('subscribe: request to Brevo failed:', err);
    return json({ success: false, error: 'Could not reach the subscription service. Please try again.' }, 502);
  }

  if (brevoResponse.status === 200 || brevoResponse.status === 201 || brevoResponse.status === 204) {
    return json({ success: true }, 200);
  }

  // Brevo returns 400 with code "duplicate_parameter" when the contact already
  // exists on this list — treat that as a success from the user's point of view.
  let brevoBody: { code?: string; message?: string } = {};
  try {
    brevoBody = await brevoResponse.json();
  } catch {
    // Non-JSON error body — fall through to the generic error response below.
  }

  if (brevoBody.code === 'duplicate_parameter') {
    return json({ success: true, alreadySubscribed: true }, 200);
  }

  console.error('subscribe: Brevo returned an error:', brevoResponse.status, brevoBody);
  return json(
    {
      success: false,
      error: brevoBody.message || 'Something went wrong while subscribing. Please try again.',
    },
    brevoResponse.status >= 400 && brevoResponse.status < 600 ? brevoResponse.status : 502
  );
};
