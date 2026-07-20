export async function POST(request) {
  const { businessName, source, notes } = await request.json();

  if (!businessName) {
    return Response.json({ error: 'businessName is required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
  }

  const prompt = `Write a short, natural cold email and a brief follow-up email for a business called "${businessName}", found on ${source || 'a general search'}.

Notes about them (use only these real facts, never invent anything about the business):
${notes || 'No specific notes, keep it general and focused on the value the product provides.'}

The email is introducing ReviewBusiness. Here is the full, real set of things it actually does, not all of these belong in one email:
- Routes negative feedback (1-3 star ratings) privately to the owner first, so they can fix a problem before it's ever a public review, while 4-5 star ratings go straight to Google, Facebook, or wherever matters most
- Sends review requests for free by email or WhatsApp click-to-chat, no per-message cost and no WhatsApp Business API approval to wait on
- A single reusable QR code works for walk-in traffic, at a till or on a table, never expires
- Every response becomes a real, named contact with a phone number, not an anonymous rating, so the business can actually follow up
- Turns a good review into a shareable card with the business's own logo automatically, no design work
- Simple, flat pricing per month, no long-term contract, cancel any time, meaningfully cheaper than most competitors in this category
- 3-day free trial before anything is charged

Requirements:
- Cold email: under 120 words, one clear, specific, low-pressure call to action, no corporate filler, sounds like one real person writing to another, not a template.
- Pick ONE, at most two, of the real capabilities above, whichever actually fits this specific lead's situation based on the notes, don't list several features in one email, that reads as a pitch deck, not a personal message. A different lead should get a different angle depending on what's actually relevant to them.
- If the notes mention a specific real detail, especially something emotional or consequential like a bad review, a complaint, or a customer's own words, connect the product directly to the outcome that detail points to, not a description of how the product works mechanically. Do not explain the interface (QR codes, WhatsApp, dashboards) in a first cold email, that's a "how" question for later, once someone's actually curious. Lead with what changes for them, not what the tool does step by step.
- Follow-up email: under 60 words, for if there's no reply after about 5 days, references the first email briefly, doesn't repeat the whole pitch. If there's a second, different real capability that fits, it's fine to mention it briefly here instead of repeating the first email's angle.
- No subject line needed, just the two email bodies.
- Sign off both as "Jamiu" (not a full name, not a company name).

Respond with ONLY valid JSON in this exact shape, no markdown fences, no other text:
{"coldEmail": "...", "followUp": "..."}`;

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Gemini API rejected the request:', errorBody);
      return Response.json({ error: 'Could not draft the email right now.' }, { status: 502 });
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      console.error('Gemini response had no usable text:', JSON.stringify(data));
      return Response.json({ error: 'Gemini returned an empty response.' }, { status: 502 });
    }

    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed.coldEmail) {
      return Response.json({ error: 'Response was missing the cold email.' }, { status: 502 });
    }

    return Response.json(parsed);
  } catch (err) {
    console.error('Draft generation failed:', err);
    return Response.json({ error: 'Could not draft the email right now.' }, { status: 500 });
  }
}
