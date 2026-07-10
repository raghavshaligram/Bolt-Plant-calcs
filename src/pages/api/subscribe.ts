import type { APIRoute } from 'astro';

// Required on Astro 5 with an adapter installed: the site defaults to static
// output, so this route must explicitly opt into server rendering to run its
// logic at request time instead of once at build time. Not part of the
// snippet as given, but the route will not work as a live endpoint without it.
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const { email, listId } = await request.json();
  if (!email || !listId) {
    return new Response(JSON.stringify({ error: 'Missing email or listId' }), { status: 400 });
  }
  // Single opt-in: create/update the contact and add it straight to the list
  // in one call, no confirmation email or click required. Switched from
  // /v3/contacts/doubleOptinConfirmation per
  // https://developers.brevo.com/docs/synchronise-contact-lists --
  // updateEnabled:true makes this an upsert, so a returning email doesn't
  // error out, it just gets re-added to the list.
  const res = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'api-key': import.meta.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      email,
      listIds: [listId],
      updateEnabled: true,
    }),
  });
  if (res.status === 200 || res.status === 201 || res.status === 204) {
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }
  const data = await res.json().catch(() => ({}));
  if (data.code === 'duplicate_parameter') {
    return new Response(JSON.stringify({ success: true, alreadySubscribed: true }), { status: 200 });
  }
  return new Response(JSON.stringify({ error: data.message || 'Subscription failed' }), { status: 500 });
};
