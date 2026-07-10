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
  const res = await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
    method: 'POST',
    headers: {
      'api-key': import.meta.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      email,
      includeListIds: [listId],
      templateId: 2,
      redirectionUrl: 'https://harvestmath.com/?subscribed=true',
    }),
  });
  if (res.status === 204 || res.status === 201) {
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }
  const data = await res.json().catch(() => ({}));
  if (data.code === 'duplicate_parameter') {
    return new Response(JSON.stringify({ success: true, alreadySubscribed: true }), { status: 200 });
  }
  return new Response(JSON.stringify({ error: data.message || 'Subscription failed' }), { status: 500 });
};
