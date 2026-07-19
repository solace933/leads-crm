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

The email is introducing ReviewBusiness, a tool that helps small businesses collect customer reviews by email, WhatsApp, or a QR code, routes negative feedback privately to the owner so they can fix issues before they go public, and turns positive reviews into shareable cards. It offers a 3-day free trial.

Requirements:
- Cold email: under 120 words, one clear, specific, low-pressure call to action, no corporate filler, sounds like one real person writing to another, not a template.
- Follow-up email: under 60 words, for if there's no reply after about 5 days, references the first email briefly, doesn't repeat the whole pitch.
- If notes mention something specific and real about the business, reference it naturally, don't force it.
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
