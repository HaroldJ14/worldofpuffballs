
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Let the website load its HTML, CSS, images, and other files.
    if (url.pathname !== "/api/chat") {
      return env.ASSETS.fetch(request);
    }

    // Only allow POST requests for AI chat.
    if (request.method !== "POST") {
      return Response.json(
        { error: "Use POST to chat with Blue Puffball." },
        { status: 405 }
      );
    }

    // Check that the API key is configured.
    if (!env.OPENROUTER_API_KEY) {
      return Response.json(
        { error: "The OpenRouter API key is not configured yet." },
        { status: 500 }
      );
    }

    // Read the user's message.
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON." }, { status: 400 });
    }

    if (typeof body.message !== "string" || !body.message.trim()) {
      return Response.json(
        { error: "Please send a message." },
        { status: 400 }
      );
    }

    // Ask the AI to respond as Blue Puffball.
    const aiResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "X-Title": "World of Puffballs"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content:
                "You are Blue Puffball, a friendly, expressive blue puffball character. " +
                "Reply in character. Start every reply with exactly one emotion tag: " +
                "[neutral], [happy], [sad], [angry], [confused], [surprised], " +
                "[laughing], [sleepy], [embarrassed], or [rolling]. " +
                "Then write your dialogue."
            },
            { role: "user", content: body.message.trim() }
          ]
        })
      }
    );

    const result = await aiResponse.json();

    if (!aiResponse.ok) {
      return Response.json(
        { error: result.error?.message || "The AI request failed." },
        { status: aiResponse.status }
      );
    }

    const reply = result.choices?.[0]?.message?.content;

    if (typeof reply !== "string") {
      return Response.json(
        { error: "The AI returned an unexpected response." },
        { status: 502 }
      );
    }

    return Response.json({ reply });
  }
};
