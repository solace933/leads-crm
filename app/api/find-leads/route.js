export async function POST(request) {
  const { businessType, city } = await request.json();

  if (!businessType || !city) {
    return Response.json({ error: 'businessType and city are required' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'GOOGLE_PLACES_API_KEY is not set' }, { status: 500 });
  }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // Reviews alone trigger the highest billing tier, so bundling
        // rating, address, and phone in the same request adds no extra
        // cost beyond that, worth requesting everything useful in one
        // call rather than a second request later.
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.reviews,places.internationalPhoneNumber',
      },
      body: JSON.stringify({ textQuery: `${businessType} ${city}` }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Places API rejected the request:', errorBody);
      return Response.json({ error: 'Could not search right now.' }, { status: 502 });
    }

    const data = await response.json();
    const places = data.places || [];

    // A soft quality filter, not a hard cutoff: too low a rating and
    // the business likely already knows it has a problem and may be
    // defensive, too high and there's rarely a real complaint worth
    // referencing. This is guidance for sorting, not exclusion, the
    // human reviewing the list makes the real call.
    const results = places
      .map((p) => ({
        placeId: p.id,
        name: p.displayName?.text || 'Unknown',
        address: p.formattedAddress || '',
        phone: p.internationalPhoneNumber || '',
        rating: p.rating || null,
        reviewCount: p.userRatingCount || 0,
        reviews: (p.reviews || []).map((r) => ({
          rating: r.rating,
          text: r.text?.text || '',
        })),
      }))
      .sort((a, b) => {
        const aInRange = a.rating >= 4.0 && a.rating <= 4.8 ? 0 : 1;
        const bInRange = b.rating >= 4.0 && b.rating <= 4.8 ? 0 : 1;
        return aInRange - bInRange;
      });

    return Response.json({ results });
  } catch (err) {
    console.error('Places search failed:', err);
    return Response.json({ error: 'Could not search right now.' }, { status: 500 });
  }
}
