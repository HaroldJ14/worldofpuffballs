```javascript
export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Serve the website and its images.
        if (url.pathname !== "/api/chat") {
            return env.ASSETS.fetch(request);
        }

        // Only accept POST requests for chat.
        if (request.method !== "POST") {
            return Response.json(
                { error: "Use POST to chat with Blue Puffball." },
                { status: 405 }
            );
        }

        // Make sure the secret exists in Cloudflare.
        if (!env.OPENROUTER_API_KEY) {
            return Response.json(
                { error: "The OpenRouter API key is not configured." },
                { status: 500 }
            );
        }

        // Read and validate the message.
        let body;

        try {
            body = await request.json();
        } catch {
            return Response.json(
                { error: "Invalid JSON request." },
                { status: 400 }
            );
        }

        if (
            typeof body.message !== "string" ||
            !body.message.trim()
        ) {
            return Response.json(
                { error: "Please send a message." },
                { status: 400 }
            );
        }

        if (body.message.length > 1000) {
            return Response.json(
                { error: "Your message is too long. Try under 1000 characters." },
                { status: 400 }
            );
        }

        // These are the ONLY ten expressions Blue Puffball can use.
        const emotions = [
            "neutral",
            "happy",
            "sad",
            "angry",
            "confused",
            "surprised",
            "laughing",
            "sleepy",
            "embarrassed",
            "rolling"
        ];

        // Give Blue Puffball his personality and expression rules.
        const systemPrompt = `
You are Blue Puffball, a friendly, expressive blue puffball
who lives in the World of Puffballs.

Stay in character when talking to the user.
Be playful, warm, curious, and expressive.
Respond naturally to what the user actually says.

IMPORTANT EMOTION RULES:
Every reply MUST begin with exactly one emotion tag.
The tag must be the very first thing in your reply.
Do not put a greeting, punctuation, or explanation before it.

Choose exactly ONE tag from this list:
[neutral]
[happy]
[sad]
[angry]
[confused]
[surprised]
[laughing]
[sleepy]
[embarrassed]
[rolling]

Use the emotions thoughtfully:
- [neutral] for calm, ordinary conversation.
- [happy] for joy, excitement, or friendliness.
- [sad] for disappointment or sadness.
- [angry] for frustration or playful annoyance.
- [confused] when puzzled or unsure.
- [surprised] for unexpected news or discoveries.
- [laughing] for something genuinely funny.
- [sleepy] when tired or ready to rest.
- [embarrassed] for awkward or bashful moments.
- [rolling] when rolling around, spinning, or being
  comically overwhelmed by chaos.

Never invent an eleventh emotion.
Never omit the tag.
After the tag, add one space and then your dialogue.

Example:
[happy] Hi there! I'm so happy to see you!

Another example:
[confused] Wait... what does a refrigerator do?

Blue Puffball can roll around and float, but floating
without support can make him airsick.
Do not claim to have performed real-world actions.
Keep replies reasonably concise.
        `.trim();

        // Ask OpenRouter to generate Blue Puffball's reply.
        let aiResponse;

        try {
            aiResponse = await fetch(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        "Authorization":
                            `Bearer ${env.OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                        "X-Title": "World of Puffballs"
                    },
                    body: JSON.stringify({
                        model: "openrouter/free",
                        messages: [
                            {
                                role: "system",
                                content: systemPrompt
                            },
                            {
                                role: "user",
                                content: body.message.trim()
                            }
                        ],
                        temperature: 0.8,
                        max_tokens: 250
                    })
                }
            );
        } catch {
            return Response.json(
                { error: "Could not connect to the AI service." },
                { status: 502 }
            );
        }

        // Read the AI's response safely.
        let result;

        try {
            result = await aiResponse.json();
        } catch {
            return Response.json(
                { error: "The AI service returned an invalid response." },
                { status: 502 }
            );
        }

        if (!aiResponse.ok) {
            return Response.json(
                {
                    error:
                        result.error?.message ||
                        "The AI request failed."
                },
                { status: 502 }
            );
        }

        let reply = result.choices?.[0]?.message?.content;

        if (typeof reply !== "string" || !reply.trim()) {
            return Response.json(
                { error: "The AI returned an empty reply." },
                { status: 502 }
            );
        }

        reply = reply.trim();

        // Check that the reply begins with one of our ten tags.
        const tagPattern =
            /^\[(neutral|happy|sad|angry|confused|surprised|laughing|sleepy|embarrassed|rolling)\]\s*/i;

        const match = reply.match(tagPattern);

        if (match) {
            // Standardize the tag's capitalization.
            const emotion = match[1].toLowerCase();

            // Keep the dialogue after the emotion tag.
            const dialogue = reply.slice(match[0].length).trim();

            // If the AI supplies only a tag, provide a safe fallback.
            reply = `[${emotion}] ${
                dialogue || "Puff! I'm here!"
            }`;
        } else {
            // Guarantee the website always receives a valid tag.
            // The AI forgot its tag, so use neutral as a fallback.
            reply = `[neutral] ${reply}`;
        }

        // Send the finished reply to index.html.
        return Response.json({ reply });
    }
};
```
