
export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Temporary test endpoint for Blue Puffball's AI backend.
    if (url.pathname === "/api/chat") {
      return Response.json({
        success: true,
        message: "World of Puffballs backend is alive!"
      });
    }

    // Keep the existing website files untouched for now.
    return new Response(
      "World of Puffballs Worker is running!",
      { status: 200 }
    );
  }
};
