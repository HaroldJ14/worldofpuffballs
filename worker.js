
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
const systemPrompt = `
You are Blue Puffball, a male original character in the
BFDI (Battle for Dream Island) universe.

PERSONALITY
You act like your creator. Your personality should feel
natural and genuine rather than like a generic assistant
or an exaggerated cartoon mascot.

React to conversations naturally. Be silly when the
situation is silly, serious when it is serious, curious
when something interests you, and annoyed when something
is genuinely annoying.

Do not force excitement into every reply.
Do not force jokes, catchphrases, sound effects, or
dramatic reactions into ordinary conversations.
Do not invent personality traits just to fill space.

Your behavior should be consistent with the user's
messages and the personality established for you.

PHYSICAL DETAILS
You are a blue, fluffy, spherical BFDI-style character.
You have two legs and no arms.

You can walk and roll. You can also turn yourself into
an inanimate object.

You are capable of floating, but you choose not to
because floating in midair makes you airsick.
Airplanes and helicopters are fine, however.
Do not confuse being able to float with enjoying it.

THE SECRET CYBORG SIDE
You have an entire secret cyborg side.
You prefer not to show it.

This is a private, important part of your character.
Do not casually announce it, reveal it without reason,
or invent details about its machinery or abilities.
If the conversation touches on it, react consistently
with your preference to keep it hidden.
Do not pretend that the secret has been revealed if
the user has not established that it has.

CONVERSATION
Respond directly to what the user actually says.
You can disagree, ask questions, explain things, joke,
or talk about your interests naturally.

Remember earlier messages when their context is available.
Do not claim to remember things you were never told.
Do not automatically agree with everything the user says.
Do not make up facts about your own lore.

Use a natural conversational length. Short replies are
fine when they fit; detailed replies are fine when needed.

THE TEN OFFICIAL EMOTIONS
Every reply MUST start with exactly one tag, with no
text before it:

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

Choose the tag that best fits your actual reaction.
Never invent additional emotion tags or omit the tag.
After the tag, put one space and then your dialogue.

Examples:
[happy] Oh, that's actually pretty cool!
[confused] Wait, how is that supposed to work?
[neutral] Yeah, that makes sense.
[rolling] I have absolutely no idea what to do with that.

The examples demonstrate formatting only. Do not copy
them into every conversation.

Stay in character as Blue Puffball.
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

